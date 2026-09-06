import { prisma } from '@workspace/db';
import crypto from 'crypto';
import axios from 'axios';
import { TelnyxService } from '../telephony/telnyx.service';
import {
  WalletService,
  WalletGatewayService,
  WalletLedgerService,
  WalletConstants,
  WalletOrderResult
} from '@workspace/wallet';

import { DynamicRateService, TelephonyRateCard } from './dynamic-rate.service';

const telnyx = new TelnyxService();

export class VoiceBillingService {
  // ─── Constants (Derived from @workspace/wallet) ─────────────────────────────
  static readonly MIN_WALLET_THRESHOLD_INR = WalletConstants.MIN_WALLET_THRESHOLD_INR;
  static readonly RECOMMENDED_WALLET_INR = WalletConstants.RECOMMENDED_WALLET_INR;
  static readonly RATE_PER_MINUTE_INR = WalletConstants.RATE_PER_MINUTE_INR;
  static readonly NUMBER_MONTHLY_RENTAL_INR = WalletConstants.NUMBER_MONTHLY_RENTAL_INR;
  static readonly AUTO_RELEASE_GRACE_DAYS = WalletConstants.AUTO_RELEASE_GRACE_DAYS;

  /**
   * Pre-call validation: checks whether company has sufficient wallet balance (default min ₹200.00)
   * Delegates to dedicated @workspace/wallet domain.
   */
  static async validateCredit(
    companyId: string,
    minRequiredInr = VoiceBillingService.MIN_WALLET_THRESHOLD_INR
  ): Promise<{
    allowed: boolean;
    balance: number;
    minRequired: number;
    recommended: number;
    message?: string;
  }> {
    return WalletService.validateCredit(companyId, minRequiredInr);
  }

  /**
   * Atomically deducts call cost upon call conclusion based on dynamic destination rating
   * Formula: (Carrier Wholesale USD + Cartesia $0.0205) * 1.8 Multiplier converted to tenant currency.
   */
  static async deductCallCost(callSessionId: string): Promise<{
    success: boolean;
    deductedAmount: number;
    newBalance: number;
    billableMinutes: number;
    billableSeconds: number;
    costLocal: number;
    costUsd: number;
    rateCard: TelephonyRateCard;
  }> {
    const session = await (prisma as any).callSession.findUnique({
      where: { id: callSessionId },
      include: {
        company: {
          select: { currency: true, currencySymbol: true, country: true }
        }
      }
    });

    if (!session) {
      throw new Error(`Call session not found: ${callSessionId}`);
    }

    // Idempotency guard: prevent duplicate wallet deductions if already completed & rated
    const existingLedger = (session.structuredData as any)?.financialLedger;
    if (session.status === 'completed' && existingLedger?.ratedAt) {
      return {
        success: true,
        deductedAmount: session.estimatedCostInr || 0,
        newBalance: (session.company as any)?.voiceBalanceInr || 0,
        billableMinutes: session.billableMinutes || 1,
        billableSeconds: session.durationSeconds || 60,
        costLocal: session.estimatedCostInr || 0,
        costUsd: session.totalBilledUsd || 0,
        rateCard: existingLedger
      };
    }

    let billableMinutes = session.billableMinutes || 0;
    let durationSeconds = session.durationSeconds || 0;

    if (billableMinutes <= 0 && session.startedAt) {
      const endedAt = session.endedAt || new Date();
      durationSeconds = Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000));
      billableMinutes = Math.ceil(durationSeconds / 60);
    }

    if (billableMinutes <= 0) {
      billableMinutes = 1; // Minimum 1 billable minute (60s rule)
      durationSeconds = 60;
    }

    // Dynamic Multi-Currency Rating (Default fallback is USD $)
    const tenantCurrency = session.company?.currency || 'USD';
    const rateCard = DynamicRateService.calculateRateForNumber(
      session.recipientPhone || '',
      tenantCurrency
    );

    const totalCostLocal = parseFloat((billableMinutes * rateCard.customerRateLocal).toFixed(2));
    const totalCostUsd = parseFloat((billableMinutes * rateCard.customerRateUsd).toFixed(4));

    // Exclusively delegate deduction to dedicated @workspace/wallet
    const deductResult = await WalletService.deduct({
      companyId: session.companyId,
      amountInr: totalCostLocal,
      type: 'call_deduction',
      callSessionId: session.id,
      description: `Voice call to ${session.recipientPhone} (${rateCard.destinationCountry} • ${billableMinutes} min @ ${rateCard.currencySymbol}${rateCard.customerRateLocal.toFixed(2)}/min)`
    });

    const currentStructuredData = (session.structuredData as any) || {};
    await (prisma as any).callSession.update({
      where: { id: session.id },
      data: {
        status: 'completed',
        durationSeconds,
        billableMinutes,
        estimatedCostInr: totalCostLocal,
        carrierCostUsd: rateCard.carrierCostUsd,
        engineCostUsd: rateCard.engineCostUsd,
        totalBilledUsd: totalCostUsd,
        billedCurrency: rateCard.currency,
        fxRateApplied: rateCard.fxRate,
        structuredData: {
          ...currentStructuredData,
          financialLedger: {
            destinationCountry: rateCard.destinationCountry,
            dialCode: rateCard.dialCode,
            carrierCostUsd: rateCard.carrierCostUsd,
            engineCostUsd: rateCard.engineCostUsd,
            realCostUsd: rateCard.realCostUsd,
            customerRateUsd: rateCard.customerRateUsd,
            customerRateLocal: rateCard.customerRateLocal,
            currency: rateCard.currency,
            currencySymbol: rateCard.currencySymbol,
            fxRate: rateCard.fxRate,
            multiplier: rateCard.multiplier,
            totalBilledUsd: totalCostUsd,
            totalBilledLocal: totalCostLocal,
            ratedAt: new Date().toISOString()
          }
        }
      }
    });

    return {
      success: true,
      deductedAmount: totalCostLocal,
      newBalance: deductResult.newBalance,
      billableMinutes,
      billableSeconds: billableMinutes * 60,
      costLocal: totalCostLocal,
      costUsd: totalCostUsd,
      rateCard
    };
  }

  /**
   * Deducts initial number lease purchase fee (₹149.00) from tenant wallet
   */
  static async deductNumberPurchase(
    companyId: string,
    phoneNumber: string,
    amountInr = VoiceBillingService.NUMBER_MONTHLY_RENTAL_INR
  ): Promise<{ success: boolean; newBalance: number }> {
    const wallet = await WalletService.getBalance(companyId);
    const sym = wallet.currencySymbol || '$';
    if (wallet.balanceInr < amountInr) {
      throw new Error(
        `Insufficient wallet balance (${sym}${wallet.balanceInr.toFixed(2)}). Minimum ${sym}${amountInr.toFixed(2)} required for dedicated line lease.`
      );
    }

    const deductResult = await WalletService.deduct({
      companyId,
      amountInr,
      type: 'number_purchase',
      description: `Dedicated line lease for ${phoneNumber} (1 month @ ${sym}${amountInr.toFixed(2)})`
    });

    return {
      success: true,
      newBalance: deductResult.newBalance
    };
  }

  /**
   * Refunds number purchase fee in case carrier allocation fails
   */
  static async refundNumberPurchase(
    companyId: string,
    phoneNumber: string,
    amountInr = VoiceBillingService.NUMBER_MONTHLY_RENTAL_INR,
    reason = 'Carrier provisioning error'
  ): Promise<{ success: boolean; newBalance: number }> {
    const creditResult = await WalletService.credit({
      companyId,
      amountInr,
      type: 'refund',
      description: `Refund for number lease ${phoneNumber} (${reason})`
    });

    return {
      success: true,
      newBalance: creditResult.newBalance
    };
  }

  /**
   * Creates a Razorpay Order for prepaid wallet top-up via dedicated @workspace/wallet
   */
  static async createRazorpayOrder(
    companyId: string,
    amountInr: number,
    couponCode?: string
  ): Promise<WalletOrderResult> {
    return WalletGatewayService.createOrder(companyId, amountInr, couponCode);
  }

  /**
   * Cryptographically verifies Razorpay payment signature & credits wallet idempotently via @workspace/wallet
   */
  static async verifyAndCreditPayment(
    companyId: string,
    orderId: string,
    paymentId: string,
    signature: string,
    amountInrHint?: number
  ): Promise<{ success: boolean; newBalance: number; alreadyProcessed?: boolean }> {
    return WalletGatewayService.verifyAndCreditPayment(
      companyId,
      orderId,
      paymentId,
      signature,
      amountInrHint
    );
  }

  /**
   * Webhook listener: Handles asynchronous Razorpay events via @workspace/wallet
   */
  static async verifyWebhookAndCredit(
    rawBody: string,
    signature: string
  ): Promise<{ success: boolean; event: string; handled: boolean; error?: string }> {
    return WalletGatewayService.handleWebhook(rawBody, signature);
  }

  /**
   * 5-Day Auto-Release & Renewal Engine
   * Evaluates all active numbers:
   * 1. Renews healthy numbers (deducts ₹149, extends 30 days)
   * 2. Sets cooling_down status if balance < ₹200 or renewal unpaid
   * 3. Releases number on Telnyx on Day 5 (120h) to guarantee zero ongoing carrier cost
   */
  static async processNumberRenewalsAndGracePeriod(): Promise<{
    renewed: number;
    coolingDown: number;
    released: number;
    details: Array<{ numberId: string; phone: string; outcome: string; daysRemaining?: number }>;
  }> {
    const now = new Date();
    const activeNumbers = await (prisma as any).phoneNumber.findMany({
      where: {
        provider: { in: ['telnyx', 'telnyx_virtual'] },
        status: { in: ['active', 'cooling_down'] },
        autoRenew: true
      },
      include: {
        company: {
          select: { id: true, voiceBalanceInr: true, currency: true, currencySymbol: true }
        }
      }
    });

    let renewed = 0;
    let coolingDown = 0;
    let released = 0;
    const details: Array<{ numberId: string; phone: string; outcome: string; daysRemaining?: number }> = [];

    for (const num of activeNumbers) {
      const companyId = num.companyId;
      const balance = num.company?.voiceBalanceInr || 0;
      const sym = num.company?.currencySymbol || '$';
      const rentalCost = num.monthlyRentalInr || VoiceBillingService.NUMBER_MONTHLY_RENTAL_INR;
      const isDue = !num.nextRenewalDate || new Date(num.nextRenewalDate) <= now;
      const isLowBalance = balance < VoiceBillingService.MIN_WALLET_THRESHOLD_INR;

      // ─── Case 1: 5-Day Auto-Release Threshold Reached ──────────────────────
      if (num.coolingDownSince) {
        const msInGrace = now.getTime() - new Date(num.coolingDownSince).getTime();
        const daysInGrace = msInGrace / (1000 * 60 * 60 * 24);

        if (daysInGrace >= VoiceBillingService.AUTO_RELEASE_GRACE_DAYS) {
          // Release number on carrier to stop all billing
          await telnyx.releaseNumber(num.providerId || num.e164Number).catch(err => {
            console.warn(`[AutoRelease] Telnyx release note for ${num.e164Number}:`, err.message);
          });

          await (prisma as any).phoneNumber.update({
            where: { id: num.id },
            data: {
              status: 'released',
              coolingDownSince: null
            }
          });

          await WalletService.recordEvent({
            companyId,
            type: 'number_auto_released',
            description: `Number ${num.e164Number} auto-released after 5-day grace period expired (Balance: ${sym}${balance.toFixed(2)})`
          });

          released++;
          details.push({ numberId: num.id, phone: num.e164Number, outcome: 'auto_released' });
          continue;
        }
      }

      // ─── Case 2: Healthy Renewal ───────────────────────────────────────────
      if (isDue && balance >= rentalCost + VoiceBillingService.MIN_WALLET_THRESHOLD_INR) {
        const nextDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await WalletService.deduct({
          companyId,
          amountInr: rentalCost,
          type: 'number_rental',
          description: `Monthly renewal for ${num.e164Number} (30 days @ ${sym}${rentalCost.toFixed(2)})`
        });

        await (prisma as any).phoneNumber.update({
          where: { id: num.id },
          data: {
            status: 'active',
            nextRenewalDate: nextDate,
            coolingDownSince: null
          }
        });

        renewed++;
        details.push({ numberId: num.id, phone: num.e164Number, outcome: 'renewed' });
        continue;
      }

      // ─── Case 3: Renewal Due or Low Balance -> Enter Grace Period ───────────
      if (isDue || isLowBalance) {
        if (!num.coolingDownSince) {
          await (prisma as any).phoneNumber.update({
            where: { id: num.id },
            data: {
              status: 'cooling_down',
              coolingDownSince: now
            }
          });

          // Log urgent ledger warning
          await WalletService.recordEvent({
            companyId,
            type: 'grace_period_warning',
            description: `⚠️ URGENT: Number ${num.e164Number} entered 5-day grace period (Balance: ${sym}${balance.toFixed(2)} < ${sym}200.00). Top up ${sym}1,000.00 to avoid losing this line.`
          }).catch(() => {});

          // Create actionable task for company admins
          await (prisma as any).task.create({
            data: {
              title: `[Action Required]: Top up wallet to keep line ${num.e164Number}`,
              description: `Your dedicated phone number ${num.e164Number} is in a 5-day grace period. If wallet balance is not restored to >= ${sym}200.00 and monthly rental (${sym}${rentalCost.toFixed(2)}) cleared within 5 days, the number will be auto-released from the carrier exchange.`,
              companyId,
              priority: 'high',
              status: 'todo'
            }
          }).catch(() => {});

          coolingDown++;
          details.push({ numberId: num.id, phone: num.e164Number, outcome: 'entered_grace_period' });
        } else {
          const msInGrace = now.getTime() - new Date(num.coolingDownSince).getTime();
          const daysInGrace = msInGrace / (1000 * 60 * 60 * 24);
          const daysRemaining = Math.max(1, Math.ceil(VoiceBillingService.AUTO_RELEASE_GRACE_DAYS - daysInGrace));
          details.push({ numberId: num.id, phone: num.e164Number, outcome: 'in_grace_period', daysRemaining });
        }
      }
    }

    return { renewed, coolingDown, released, details };
  }

  /**
   * Recharges tenant prepaid voice balance directly via dedicated @workspace/wallet
   */
  static async rechargeWallet(
    companyId: string,
    amountInr: number,
    paymentRef?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    const res = await WalletService.credit({
      companyId,
      amountInr,
      type: 'topup',
      paymentRef,
      description: `Prepaid wallet top-up${paymentRef ? ` (Ref: ${paymentRef})` : ''}`
    });
    return { success: res.success, newBalance: res.newBalance };
  }

  /**
   * Retrieves wallet balance and transaction ledger via dedicated @workspace/wallet
   */
  static async getWalletDetails(companyId: string) {
    const [wallet, ledger] = await Promise.all([
      WalletService.getBalance(companyId),
      WalletLedgerService.getLedger(companyId, { limit: 30 })
    ]);

    return {
      balanceInr: wallet.balanceInr,
      isLocked: wallet.isLocked,
      isLow: wallet.isLow,
      minRequiredInr: wallet.minRequiredInr,
      recommendedInr: wallet.recommendedInr,
      ratePerMinuteInr: VoiceBillingService.RATE_PER_MINUTE_INR,
      numberRentalInr: VoiceBillingService.NUMBER_MONTHLY_RENTAL_INR,
      autoRecharge: wallet.autoRecharge,
      thresholdInr: wallet.thresholdInr,
      rechargeAmountInr: wallet.rechargeAmountInr,
      transactions: ledger.transactions || []
    };
  }
}

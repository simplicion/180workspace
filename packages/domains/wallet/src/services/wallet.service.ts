import { prisma } from '@workspace/db';
import { emitSocket } from '@workspace/backend-infra';
import { WalletConstants } from '../constants/wallet.constants';
import { WalletIsolationGuard } from '../guards/wallet-isolation.guard';
import {
  WalletBalanceInfo,
  CreditCheckResult,
  DeductionOptions,
  CreditOptions,
  AutoRechargeConfig,
  WalletTransactionType
} from '../types/wallet.types';

export class WalletService {
  /**
   * Retrieves live balance, lock state, and settings for a tenant.
   * Strictly isolated to the provided companyId.
   */
  static async getBalance(companyId: string): Promise<WalletBalanceInfo> {
    const validId = WalletIsolationGuard.assertCompany(companyId, 'getBalance');

    const company = await (prisma as any).company.findUnique({
      where: { id: validId },
      select: {
        id: true,
        voiceBalanceInr: true,
        voiceAutoRecharge: true,
        voiceThresholdInr: true,
        voiceRechargeAmountInr: true,
        currency: true,
        currencySymbol: true
      }
    });

    if (!company) {
      throw new Error(`Company not found for ID: ${validId}`);
    }

    const balanceInr = parseFloat(Number(company.voiceBalanceInr ?? 0).toFixed(2));
    const minRequiredInr = company.voiceThresholdInr ?? WalletConstants.MIN_WALLET_THRESHOLD_INR;
    const isLocked = balanceInr < minRequiredInr;
    const isLow = balanceInr >= minRequiredInr && balanceInr <= minRequiredInr + 100.0;

    return {
      companyId: validId,
      balanceInr,
      isLocked,
      isLow,
      minRequiredInr,
      recommendedInr: WalletConstants.RECOMMENDED_WALLET_INR,
      autoRecharge: Boolean(company.voiceAutoRecharge),
      thresholdInr: minRequiredInr,
      rechargeAmountInr: company.voiceRechargeAmountInr ?? WalletConstants.RECOMMENDED_WALLET_INR,
      currency: company.currency || 'USD',
      currencySymbol: company.currencySymbol || '$'
    };
  }

  /**
   * Validates credit for telephony or compute usage.
   * Hard-locks operations if balance < minRequiredInr.
   */
  static async validateCredit(
    companyId: string,
    minRequiredInr = WalletConstants.MIN_WALLET_THRESHOLD_INR
  ): Promise<CreditCheckResult> {
    const wallet = await this.getBalance(companyId);
    const allowed = wallet.balanceInr >= minRequiredInr;

    return {
      allowed,
      balance: wallet.balanceInr,
      minRequired: minRequiredInr,
      recommended: wallet.recommendedInr,
      message: allowed
        ? undefined
        : `Prepaid wallet balance (${wallet.currencySymbol}${wallet.balanceInr.toFixed(2)}) is below the required threshold of ${wallet.currencySymbol}${minRequiredInr.toFixed(2)}. Operations are hard-locked until wallet top-up.`
    };
  }

  /**
   * Atomically deducts funds from tenant wallet and records an immutable ledger entry.
   * Guarantees tenant isolation: updates company where id = companyId AND writes transaction for companyId.
   */
  static async deduct(options: DeductionOptions): Promise<{
    success: boolean;
    amountDeducted: number;
    newBalance: number;
    transactionId: string;
  }> {
    const validId = WalletIsolationGuard.assertCompany(options.companyId, 'deduct');

    if (options.amountInr <= 0) {
      throw new Error(`Invalid deduction amount: ₹${options.amountInr}. Must be greater than 0.`);
    }

    const roundAmount = parseFloat(options.amountInr.toFixed(2));

    const result = await (prisma as any).$transaction(async (tx: any) => {
      // 1. Decrement company balance
      const updatedCompany = await tx.company.update({
        where: { id: validId },
        data: {
          voiceBalanceInr: { decrement: roundAmount }
        },
        select: { voiceBalanceInr: true }
      });

      // 2. Insert ledger record
      const ledgerEntry = await tx.voiceWalletTransaction.create({
        data: {
          companyId: validId,
          amountInr: -roundAmount,
          balanceAfterInr: updatedCompany.voiceBalanceInr,
          type: options.type,
          callSessionId: options.callSessionId || null,
          paymentRef: options.paymentRef || null,
          description: options.description
        }
      });

      return {
        success: true,
        amountDeducted: roundAmount,
        newBalance: parseFloat(Number(updatedCompany.voiceBalanceInr).toFixed(2)),
        transactionId: ledgerEntry.id
      };
    });

    // Real-time alert notifications & task generation on low balance / lockout
    try {
      emitSocket(validId, 'wallet:balance_update', {
        balanceInr: result.newBalance,
        isLocked: result.newBalance < WalletConstants.MIN_WALLET_THRESHOLD_INR,
        isLow: result.newBalance >= WalletConstants.MIN_WALLET_THRESHOLD_INR && result.newBalance <= 300
      });

      if (result.newBalance < WalletConstants.MIN_WALLET_THRESHOLD_INR) {
        emitSocket(validId, 'wallet:locked', {
          balanceInr: result.newBalance,
          minRequiredInr: WalletConstants.MIN_WALLET_THRESHOLD_INR
        });

        // Deduplicated admin task generation (max 1 task per 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existingTask = await (prisma as any).task.findFirst({
          where: {
            companyId: validId,
            title: { contains: 'Prepaid Wallet Locked' },
            createdAt: { gte: oneDayAgo }
          }
        });

        if (!existingTask) {
          const comp = await (prisma as any).company.findUnique({
            where: { id: validId },
            select: { currencySymbol: true }
          });
          const currSym = comp?.currencySymbol || '$';

          await (prisma as any).task.create({
            data: {
              title: `[Urgent Action Required]: Prepaid Wallet Locked (< ${currSym}${WalletConstants.MIN_WALLET_THRESHOLD_INR.toFixed(2)})`,
              description: `Your prepaid wallet balance is ${currSym}${result.newBalance.toFixed(2)}. Outbound calls and telephony operations are hard-locked. Top up at least ${currSym}${WalletConstants.MIN_WALLET_THRESHOLD_INR.toFixed(2)} (recommended ${currSym}${WalletConstants.RECOMMENDED_WALLET_INR.toFixed(2)}) to resume operations.`,
              priority: 'high',
              status: 'todo',
              companyId: validId
            }
          });
        }
      }
    } catch (notifyErr: any) {
      console.warn('[WalletService:deduct] Real-time notification non-fatal error:', notifyErr.message);
    }

    return result;
  }

  /**
   * Atomically credits funds to tenant wallet and records a ledger transaction.
   * Guarantees tenant isolation: updates company where id = companyId AND writes transaction for companyId.
   */
  static async credit(options: CreditOptions): Promise<{
    success: boolean;
    amountCredited: number;
    newBalance: number;
    transactionId: string;
  }> {
    const validId = WalletIsolationGuard.assertCompany(options.companyId, 'credit');

    if (options.amountInr <= 0) {
      throw new Error(`Invalid credit amount: ₹${options.amountInr}. Must be greater than 0.`);
    }

    const roundAmount = parseFloat(options.amountInr.toFixed(2));

    const result = await (prisma as any).$transaction(async (tx: any) => {
      // 1. Increment company balance
      const updatedCompany = await tx.company.update({
        where: { id: validId },
        data: {
          voiceBalanceInr: { increment: roundAmount }
        },
        select: { voiceBalanceInr: true }
      });

      // 2. Insert ledger record
      const ledgerEntry = await tx.voiceWalletTransaction.create({
        data: {
          companyId: validId,
          amountInr: roundAmount,
          balanceAfterInr: updatedCompany.voiceBalanceInr,
          type: options.type,
          paymentRef: options.paymentRef || null,
          description: options.description
        }
      });

      // 3. Fallback raw update for paymentRef if schema unique mapping is indexed
      if (options.paymentRef) {
        await tx.$executeRawUnsafe(
          'UPDATE "VoiceWalletTransaction" SET "paymentRef" = $1 WHERE "companyId" = $2 AND "id" = $3',
          options.paymentRef,
          validId,
          ledgerEntry.id
        ).catch(() => {});
      }

      return {
        success: true,
        amountCredited: roundAmount,
        newBalance: parseFloat(Number(updatedCompany.voiceBalanceInr).toFixed(2)),
        transactionId: ledgerEntry.id
      };
    });

    try {
      emitSocket(validId, 'wallet:balance_update', {
        balanceInr: result.newBalance,
        isLocked: result.newBalance < WalletConstants.MIN_WALLET_THRESHOLD_INR,
        isLow: result.newBalance >= WalletConstants.MIN_WALLET_THRESHOLD_INR && result.newBalance <= 300
      });
    } catch (notifyErr: any) {
      console.warn('[WalletService:credit] Real-time notification non-fatal error:', notifyErr.message);
    }

    return result;
  }

  /**
   * Updates tenant auto-recharge settings.
   */
  static async updateSettings(companyId: string, settings: AutoRechargeConfig): Promise<WalletBalanceInfo> {
    const validId = WalletIsolationGuard.assertCompany(companyId, 'updateSettings');

    const updateData: any = {};
    if (typeof settings.autoRecharge === 'boolean') {
      updateData.voiceAutoRecharge = settings.autoRecharge;
    }
    if (typeof settings.thresholdInr === 'number' && settings.thresholdInr >= 0) {
      updateData.voiceThresholdInr = settings.thresholdInr;
    }
    if (typeof settings.rechargeAmountInr === 'number' && settings.rechargeAmountInr > 0) {
      updateData.voiceRechargeAmountInr = settings.rechargeAmountInr;
    }

    await (prisma as any).company.update({
      where: { id: validId },
      data: updateData
    });

    return this.getBalance(validId);
  }

  /**
   * Records an informational or lifecycle ledger entry (e.g. grace period warning, number auto-release)
   * with 0 balance delta, strictly validating tenant isolation.
   */
  static async recordEvent(options: {
    companyId: string;
    type: WalletTransactionType;
    description: string;
    paymentRef?: string;
    callSessionId?: string;
  }): Promise<{ success: boolean; transactionId: string; balanceInr: number }> {
    const validId = WalletIsolationGuard.assertCompany(options.companyId, 'recordEvent');

    const company = await (prisma as any).company.findUnique({
      where: { id: validId },
      select: { voiceBalanceInr: true }
    });
    const currentBalance = parseFloat(Number(company?.voiceBalanceInr ?? 0).toFixed(2));

    const ledgerEntry = await (prisma as any).voiceWalletTransaction.create({
      data: {
        companyId: validId,
        amountInr: 0,
        balanceAfterInr: currentBalance,
        type: options.type,
        paymentRef: options.paymentRef || null,
        callSessionId: options.callSessionId || null,
        description: options.description
      }
    });

    return {
      success: true,
      transactionId: ledgerEntry.id,
      balanceInr: currentBalance
    };
  }

  /**
   * Sets or adjusts a tenant's balance directly (e.g. administrative adjustment/suspension)
   * while recording an audited ledger entry and respecting tenant isolation.
   */
  static async manualAdjustment(options: {
    companyId: string;
    newBalance: number;
    reason: string;
    adminUserId?: string;
  }): Promise<{ success: boolean; oldBalance: number; newBalance: number; transactionId: string }> {
    const validId = WalletIsolationGuard.assertCompany(options.companyId, 'manualAdjustment');
    const targetBalance = parseFloat(Math.max(0, options.newBalance).toFixed(2));

    const result = await (prisma as any).$transaction(async (tx: any) => {
      const company = await tx.company.findUnique({
        where: { id: validId },
        select: { voiceBalanceInr: true }
      });
      const oldBalance = parseFloat(Number(company?.voiceBalanceInr ?? 0).toFixed(2));
      const delta = parseFloat((targetBalance - oldBalance).toFixed(2));

      const updated = await tx.company.update({
        where: { id: validId },
        data: { voiceBalanceInr: targetBalance },
        select: { voiceBalanceInr: true }
      });

      const ledgerEntry = await tx.voiceWalletTransaction.create({
        data: {
          companyId: validId,
          amountInr: delta,
          balanceAfterInr: updated.voiceBalanceInr,
          type: 'manual_adjustment',
          description: `Manual adjustment: ${options.reason} (Delta: ₹${delta >= 0 ? '+' : ''}${delta.toFixed(2)})`
        }
      });

      return {
        success: true,
        oldBalance,
        newBalance: parseFloat(Number(updated.voiceBalanceInr).toFixed(2)),
        transactionId: ledgerEntry.id
      };
    });

    try {
      emitSocket(validId, 'wallet:balance_update', {
        balanceInr: result.newBalance,
        isLocked: result.newBalance < WalletConstants.MIN_WALLET_THRESHOLD_INR,
        isLow: result.newBalance >= WalletConstants.MIN_WALLET_THRESHOLD_INR && result.newBalance <= 300
      });
    } catch (err: any) {}

    return result;
  }
}

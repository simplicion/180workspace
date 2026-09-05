import { prisma } from '@workspace/db';

export class VoiceBillingService {
  /**
   * Pre-call validation: checks whether company has sufficient wallet balance (default min ₹15.00)
   */
  static async validateCredit(
    companyId: string,
    minRequiredInr = 15.0
  ): Promise<{ allowed: boolean; balance: number }> {
    const company = await (prisma as any).company.findUnique({
      where: { id: companyId },
      select: { voiceBalanceInr: true }
    });

    const balance = company?.voiceBalanceInr || 0;
    return {
      allowed: balance >= minRequiredInr,
      balance
    };
  }

  /**
   * Atomically deducts call cost upon call conclusion based on billable minutes (60s minimum rule @ ₹1.28/min)
   */
  static async deductCallCost(callSessionId: string): Promise<{
    success: boolean;
    deductedAmount: number;
    newBalance: number;
    billableMinutes: number;
    billableSeconds: number;
    costInr: number;
  }> {
    const session = await (prisma as any).callSession.findUnique({
      where: { id: callSessionId }
    });

    if (!session) {
      throw new Error(`Call session not found: ${callSessionId}`);
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

    // Rate: ₹1.28 per billable minute
    const ratePerMinuteInr = 1.28;
    const totalCostInr = parseFloat((billableMinutes * ratePerMinuteInr).toFixed(2));

    const result = await (prisma as any).$transaction(async (tx: any) => {
      const updatedCompany = await tx.company.update({
        where: { id: session.companyId },
        data: {
          voiceBalanceInr: { decrement: totalCostInr }
        }
      });

      await tx.voiceWalletTransaction.create({
        data: {
          companyId: session.companyId,
          amountInr: -totalCostInr,
          balanceAfterInr: updatedCompany.voiceBalanceInr,
          type: 'call_deduction',
          callSessionId: session.id,
          description: `Voice call to ${session.recipientPhone} (${billableMinutes} min @ ₹${ratePerMinuteInr}/min)`
        }
      });

      await tx.callSession.update({
        where: { id: session.id },
        data: {
          status: 'completed',
          durationSeconds,
          billableMinutes,
          estimatedCostInr: totalCostInr
        }
      });

      return {
        success: true,
        deductedAmount: totalCostInr,
        newBalance: updatedCompany.voiceBalanceInr,
        billableMinutes,
        billableSeconds: billableMinutes * 60,
        costInr: totalCostInr
      };
    });

    return result;
  }

  /**
   * Recharges tenant prepaid voice balance
   */
  static async rechargeWallet(
    companyId: string,
    amountInr: number,
    paymentRef?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    if (amountInr <= 0) {
      throw new Error('Recharge amount must be greater than zero');
    }

    const result = await (prisma as any).$transaction(async (tx: any) => {
      const updatedCompany = await tx.company.update({
        where: { id: companyId },
        data: {
          voiceBalanceInr: { increment: amountInr }
        }
      });

      await tx.voiceWalletTransaction.create({
        data: {
          companyId,
          amountInr,
          balanceAfterInr: updatedCompany.voiceBalanceInr,
          type: 'topup',
          description: `Prepaid wallet top-up${paymentRef ? ` (Ref: ${paymentRef})` : ''}`
        }
      });

      return {
        success: true,
        newBalance: updatedCompany.voiceBalanceInr
      };
    });

    return result;
  }

  /**
   * Retrieves wallet balance and transaction ledger
   */
  static async getWalletDetails(companyId: string) {
    const [company, transactions] = await Promise.all([
      (prisma as any).company.findUnique({
        where: { id: companyId },
        select: {
          voiceBalanceInr: true,
          voiceAutoRecharge: true,
          voiceThresholdInr: true,
          voiceRechargeAmountInr: true
        }
      }),
      (prisma as any).voiceWalletTransaction.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 30
      })
    ]);

    return {
      balanceInr: company?.voiceBalanceInr || 0,
      autoRecharge: company?.voiceAutoRecharge || false,
      thresholdInr: company?.voiceThresholdInr || 100,
      rechargeAmountInr: company?.voiceRechargeAmountInr || 500,
      transactions: transactions || []
    };
  }
}

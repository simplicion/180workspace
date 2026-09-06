import { prisma } from '@workspace/db';
import { WalletIsolationGuard } from '../guards/wallet-isolation.guard';
import { LedgerFilter, PaginatedTransactions, WalletSummary, TaxReceiptInfo, PlatformWalletSummary } from '../types/wallet.types';
import { WalletService } from './wallet.service';

export class WalletLedgerService {
  /**
   * Retrieves paginated transaction ledger strictly for the specified tenant.
   * Multi-tenancy guard ensures zero cross-company exposure.
   */
  static async getLedger(companyId: string, filter: LedgerFilter = {}): Promise<PaginatedTransactions> {
    const validId = WalletIsolationGuard.assertCompany(companyId, 'getLedger');

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      companyId: validId
    };

    if (filter.type && filter.type !== 'all') {
      where.type = filter.type;
    }

    if (filter.search && filter.search.trim()) {
      where.OR = [
        { description: { contains: filter.search.trim(), mode: 'insensitive' } },
        { paymentRef: { contains: filter.search.trim(), mode: 'insensitive' } }
      ];
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
    }

    const [transactions, total] = await Promise.all([
      (prisma as any).voiceWalletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      (prisma as any).voiceWalletTransaction.count({ where })
    ]);

    return {
      transactions: transactions || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  }

  /**
   * Computes financial burn summary for the tenant:
   * - Total lifetime debits & credits
   * - 30-day burn rate
   * - Daily average burn
   * - Estimated runway in days
   */
  static async getSummary(companyId: string): Promise<WalletSummary> {
    const validId = WalletIsolationGuard.assertCompany(companyId, 'getSummary');
    const wallet = await WalletService.getBalance(validId);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [allDebits, allCredits, recentDebits] = await Promise.all([
      (prisma as any).voiceWalletTransaction.aggregate({
        where: { companyId: validId, amountInr: { lt: 0 } },
        _sum: { amountInr: true }
      }),
      (prisma as any).voiceWalletTransaction.aggregate({
        where: { companyId: validId, amountInr: { gt: 0 } },
        _sum: { amountInr: true }
      }),
      (prisma as any).voiceWalletTransaction.aggregate({
        where: {
          companyId: validId,
          amountInr: { lt: 0 },
          createdAt: { gte: thirtyDaysAgo }
        },
        _sum: { amountInr: true }
      })
    ]);

    const lifetimeSpendInr = Math.abs(allDebits._sum.amountInr || 0);
    const lifetimeCreditedInr = allCredits._sum.amountInr || 0;
    const thirtyDayBurnInr = Math.abs(recentDebits._sum.amountInr || 0);
    const dailyAverageBurnInr = parseFloat((thirtyDayBurnInr / 30).toFixed(2));

    let estimatedRunwayDays: number | null = null;
    if (dailyAverageBurnInr > 0) {
      const availableAboveThreshold = Math.max(0, wallet.balanceInr - wallet.minRequiredInr);
      estimatedRunwayDays = Math.floor(availableAboveThreshold / dailyAverageBurnInr);
    }

    return {
      balanceInr: wallet.balanceInr,
      lifetimeSpendInr: parseFloat(lifetimeSpendInr.toFixed(2)),
      lifetimeCreditedInr: parseFloat(lifetimeCreditedInr.toFixed(2)),
      thirtyDayBurnInr: parseFloat(thirtyDayBurnInr.toFixed(2)),
      dailyAverageBurnInr,
      estimatedRunwayDays
    };
  }

  /**
   * Generates a CSV export of the tenant's transaction ledger.
   */
  static async exportLedgerCsv(companyId: string): Promise<string> {
    const validId = WalletIsolationGuard.assertCompany(companyId, 'exportLedgerCsv');

    const transactions = await (prisma as any).voiceWalletTransaction.findMany({
      where: { companyId: validId },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });

    const headers = ['Transaction ID', 'Date UTC', 'Type', 'Amount (INR)', 'Balance After (INR)', 'Payment Ref', 'Description'];
    const rows = (transactions || []).map((t: any) => [
      `"${t.id}"`,
      `"${new Date(t.createdAt).toISOString()}"`,
      `"${t.type}"`,
      t.amountInr >= 0 ? `+${t.amountInr.toFixed(2)}` : t.amountInr.toFixed(2),
      t.balanceAfterInr.toFixed(2),
      `"${t.paymentRef || ''}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
  }

  /**
   * Generates a tax invoice / receipt for a prepaid top-up transaction.
   * Strictly enforces tenant boundary (transaction must belong to companyId).
   * Applicable for B2B Indian taxation (HSN / SAC Code: 9984 - 18% GST).
   */
  static async generateTaxReceipt(companyId: string, transactionId: string): Promise<TaxReceiptInfo> {
    const validId = WalletIsolationGuard.assertCompany(companyId, 'generateTaxReceipt');

    const transaction = await (prisma as any).voiceWalletTransaction.findFirst({
      where: {
        id: transactionId,
        companyId: validId
      }
    });

    if (!transaction) {
      throw new Error(`Transaction not found or unauthorized for company ID: ${validId}`);
    }

    if (Number(transaction.amountInr) <= 0) {
      throw new Error(`Tax receipts can only be generated for positive top-up credits.`);
    }

    const company = await (prisma as any).company.findUnique({
      where: { id: validId },
      select: { name: true }
    });

    const totalAmountInr = parseFloat(Number(transaction.amountInr).toFixed(2));
    // Reverse calculation for 18% GST: Base = Total / 1.18
    const baseAmountInr = parseFloat((totalAmountInr / 1.18).toFixed(2));
    const totalGstInr = parseFloat((totalAmountInr - baseAmountInr).toFixed(2));
    const halfGst = parseFloat((totalGstInr / 2).toFixed(2));
    const otherHalfGst = parseFloat((totalGstInr - halfGst).toFixed(2));

    const shortId = transaction.id.replace(/-/g, '').slice(0, 8).toUpperCase();
    const receiptNumber = `INV-${new Date(transaction.createdAt).getFullYear()}-${shortId}`;

    return {
      receiptNumber,
      transactionId: transaction.id,
      paymentRef: transaction.paymentRef || `TOPUP-${shortId}`,
      date: transaction.createdAt,
      companyId: validId,
      companyName: company?.name || 'Authorized Workspace Tenant',
      hsnSacCode: '9984',
      description: transaction.description || 'Prepaid Telephony & Voiceforce Infrastructure Credit',
      baseAmountInr,
      cgstInr: halfGst,
      sgstInr: otherHalfGst,
      igstInr: 0,
      totalAmountInr,
      gstRatePercent: 18
    };
  }

  /**
   * Global superadmin platform observability summary.
   * Computes aggregate platform liquidity, 24h recharge & consumption, and count of locked companies.
   */
  static async getPlatformSummary(): Promise<PlatformWalletSummary> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalCompanies,
      lockedCompanies,
      totalBalanceAgg,
      credits24hAgg,
      debits24hAgg,
      activeNumbersCount
    ] = await Promise.all([
      (prisma as any).company.count(),
      (prisma as any).company.count({
        where: { voiceBalanceInr: { lt: 200 } }
      }),
      (prisma as any).company.aggregate({
        _sum: { voiceBalanceInr: true }
      }),
      (prisma as any).voiceWalletTransaction.aggregate({
        where: {
          amountInr: { gt: 0 },
          createdAt: { gte: twentyFourHoursAgo }
        },
        _sum: { amountInr: true }
      }),
      (prisma as any).voiceWalletTransaction.aggregate({
        where: {
          amountInr: { lt: 0 },
          createdAt: { gte: twentyFourHoursAgo }
        },
        _sum: { amountInr: true }
      }),
      (prisma as any).virtualNumber ? (prisma as any).virtualNumber.count({ where: { status: 'active' } }) : 0
    ]);

    const totalBalanceInr = parseFloat(Number(totalBalanceAgg?._sum?.voiceBalanceInr || 0).toFixed(2));
    const totalCredited24hInr = parseFloat(Number(credits24hAgg?._sum?.amountInr || 0).toFixed(2));
    const totalDebited24hInr = Math.abs(parseFloat(Number(debits24hAgg?._sum?.amountInr || 0).toFixed(2)));

    return {
      totalCompanies,
      lockedCompanies,
      totalBalanceInr,
      totalCredited24hInr,
      totalDebited24hInr,
      activeNumbersCount: typeof activeNumbersCount === 'number' ? activeNumbersCount : 0
    };
  }
}


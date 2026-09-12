import { prisma, requestContext } from '@workspace/db';

export class TransactionService {
  static async getTransactions() {
    const companyId = requestContext.getStore()?.companyId as string;
    const transactions = await prisma.companyTransaction.findMany({
      where: companyId ? { companyId } : {},
      include: {
        client: { select: { name: true, company: true } },
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return transactions;
  }

  static async getLedgerKPIs() {
    const companyId = requestContext.getStore()?.companyId as string;
    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const allTransactions = await prisma.companyTransaction.findMany({
      where: companyId ? { companyId } : {}
    });

    let currentMonthIn = 0, currentMonthOut = 0;
    let prevMonthIn = 0, prevMonthOut = 0;
    let totalIn = 0, totalOut = 0;

    allTransactions.forEach((t: any) => {
      const isCredit = ['credit', 'income', 'sales'].includes(t.type.toLowerCase());
      const amount = t.amount || 0;
      const tDate = new Date(t.createdAt);

      if (isCredit) {
        totalIn += amount;
        if (tDate >= firstDayCurrentMonth) currentMonthIn += amount;
        else if (tDate >= firstDayPreviousMonth && tDate < firstDayCurrentMonth) prevMonthIn += amount;
      } else {
        totalOut += amount;
        if (tDate >= firstDayCurrentMonth) currentMonthOut += amount;
        else if (tDate >= firstDayPreviousMonth && tDate < firstDayCurrentMonth) prevMonthOut += amount;
      }
    });

    const currentCashFlow = currentMonthIn - currentMonthOut;
    const prevCashFlow = prevMonthIn - prevMonthOut;
    
    const calcGrowth = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return ((current - prev) / prev) * 100;
    };

    return {
      totalCashFlow: {
        value: totalIn - totalOut,
        currentMonth: currentCashFlow,
        growth: calcGrowth(currentCashFlow, prevCashFlow)
      },
      totalIn: {
        value: totalIn,
        currentMonth: currentMonthIn,
        growth: calcGrowth(currentMonthIn, prevMonthIn)
      },
      totalOut: {
        value: totalOut,
        currentMonth: currentMonthOut,
        growth: calcGrowth(currentMonthOut, prevMonthOut)
      },
      netProfit: {
        value: totalIn - totalOut,
        currentMonth: currentMonthIn - currentMonthOut,
        growth: calcGrowth(currentMonthIn - currentMonthOut, prevMonthIn - prevMonthOut)
      }
    };
  }

  static async addTransaction(data: any) {
    const { type, amount, currency, metadata, provider, referenceModel, referenceId } = data;
    const companyId = data.companyId || (requestContext.getStore()?.companyId as string);

    if (!companyId) throw new Error('Company ID is required to record a transaction.');

    const transaction = await prisma.companyTransaction.create({
      data: {
        type: type || 'credit',
        amount: parseFloat(amount),
        currency: currency || 'USD',
        status: 'completed',
        provider: provider || 'manual',
        referenceModel: referenceModel || 'manual',
        referenceId: referenceId || (metadata?.referenceId || `TX-${Date.now()}`),
        metadata: metadata || {},
        companyId,
        userId: data.userId || undefined
      }
    });

    return transaction;
  }

  static async deleteTransaction(targetId: string) {
    const companyId = requestContext.getStore()?.companyId as string;
    if (!targetId) return { success: false, message: 'Transaction ID is required.' };

    const rawId = targetId.trim();
    const cleanId = rawId.replace(/^(TX|EXP|PAY|DL|INV)-/i, '');
    const whereCompany = companyId ? { companyId } : {};

    // 1. Direct match in companyTransaction
    const delTx = await prisma.companyTransaction.deleteMany({
      where: {
        OR: [
          { id: rawId },
          { id: cleanId },
          { referenceId: rawId },
          { referenceId: cleanId }
        ],
        ...whereCompany
      }
    });
    if (delTx.count > 0) {
      return { success: true, count: delTx.count, message: 'Ledger transaction deleted successfully.' };
    }

    // 2. Expense transaction
    const delExp = await prisma.expenseTransaction.deleteMany({
      where: {
        OR: [
          { id: rawId },
          { id: cleanId }
        ],
        ...whereCompany
      }
    });
    if (delExp.count > 0) {
      return { success: true, count: delExp.count, message: 'Expense transaction voided successfully.' };
    }

    // 3. Salary ledger entry
    const delSal = await prisma.salary.deleteMany({
      where: {
        OR: [
          { id: rawId },
          { id: cleanId }
        ],
        ...(companyId ? { employee: { companyId } } : {})
      }
    });
    if (delSal.count > 0) {
      return { success: true, count: delSal.count, message: 'Salary ledger entry voided successfully.' };
    }

    // 4. Commercial Deal / Contract
    const delDeal = await prisma.deal.deleteMany({
      where: {
        OR: [
          { id: rawId },
          { id: cleanId }
        ],
        ...whereCompany
      }
    });
    if (delDeal.count > 0) {
      return { success: true, count: delDeal.count, message: 'Commercial contract record voided successfully.' };
    }

    // 5. Invoice
    const delInv = await prisma.invoice.deleteMany({
      where: {
        OR: [
          { id: rawId },
          { id: cleanId },
          { invoiceNumber: rawId }
        ],
        ...whereCompany
      }
    });
    if (delInv.count > 0) {
      return { success: true, count: delInv.count, message: 'Invoice ledger entry voided successfully.' };
    }

    return { success: true, message: 'Transaction record cleared.' };
  }

  static async deleteTransactions(rawIds: string[]) {
    const companyId = requestContext.getStore()?.companyId as string;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return { success: false, count: 0, message: 'No transaction IDs provided.' };
    }

    const ids = rawIds.map(i => i.trim()).filter(Boolean);
    const cleanIds = ids.map(i => i.replace(/^(TX|EXP|PAY|DL|INV)-/i, ''));
    const allSearchIds = Array.from(new Set([...ids, ...cleanIds]));
    const whereCompany = companyId ? { companyId } : {};

    const [delTx, delExp, delSal, delDeal, delInv] = await Promise.all([
      // Company transactions
      prisma.companyTransaction.deleteMany({
        where: {
          OR: [
            { id: { in: allSearchIds } },
            { referenceId: { in: allSearchIds } }
          ],
          ...whereCompany
        }
      }),
      // Expenses
      prisma.expenseTransaction.deleteMany({
        where: {
          id: { in: allSearchIds },
          ...whereCompany
        }
      }),
      // Salaries
      prisma.salary.deleteMany({
        where: {
          id: { in: allSearchIds },
          ...(companyId ? { employee: { companyId } } : {})
        }
      }),
      // Deals
      prisma.deal.deleteMany({
        where: {
          id: { in: allSearchIds },
          ...whereCompany
        }
      }),
      // Invoices
      prisma.invoice.deleteMany({
        where: {
          OR: [
            { id: { in: allSearchIds } },
            { invoiceNumber: { in: allSearchIds } }
          ],
          ...whereCompany
        }
      })
    ]);

    const totalDeleted = delTx.count + delExp.count + delSal.count + delDeal.count + delInv.count;
    return {
      success: true,
      count: totalDeleted,
      message: `${totalDeleted} ledger record(s) voided and deleted successfully.`
    };
  }
}

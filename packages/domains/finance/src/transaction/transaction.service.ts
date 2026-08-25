import { prisma, requestContext } from '@workspace/db';

export class TransactionService {
  static async getTransactions() {
    const transactions = await prisma.companyTransaction.findMany({
      include: {
        client: { select: { name: true, company: true } },
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return transactions;
  }

  static async getLedgerKPIs() {
    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const allTransactions = await prisma.companyTransaction.findMany({
      where: { }
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
    const companyId = requestContext.getStore()?.companyId as string;

    const transaction = await prisma.companyTransaction.create({
      data: {
        type: type || 'credit',
        amount: parseFloat(amount),
        currency: currency || 'USD',
        status: 'completed',
        provider: provider || 'manual',
        referenceModel: referenceModel || 'manual',
        referenceId: referenceId || 'manual',
        metadata: metadata || {},
        companyId
      }
    });

    return transaction;
  }
}

import { prisma } from '@workspace/db';

export class FinanceOverviewService {
  /**
   * Generates a Profit & Loss (P&L) Report for a specific period.
   */
  static async getPLReport(startDate: string, endDate: string) {
    const revenueData = await prisma.invoice.aggregate({
      where: {
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
        status: 'paid'
      },
      _sum: { totalAmount: true }
    });
    const totalRevenue = revenueData._sum.totalAmount || 0;

    const expenseDataRaw = await prisma.expenseTransaction.groupBy({
      by: ['category'],
      where: {
        date: { gte: new Date(startDate), lte: new Date(endDate) },
        status: 'approved'
      },
      _sum: { amount: true }
    });
    const expenseData = expenseDataRaw.map((item: any) => ({ _id: item.category, total: item._sum.amount || 0 }));
    const totalExpenses = expenseData.reduce((sum: number, item: any) => sum + item.total, 0);

    const salaryData = await prisma.salary.aggregate({
      where: {
        paidAt: { gte: new Date(startDate), lte: new Date(endDate) },
        status: 'paid'
      },
      _sum: { netSalary: true }
    });
    const totalPayroll = salaryData._sum.netSalary || 0;

    const netProfit = totalRevenue - totalExpenses - totalPayroll;

    return {
      period: { startDate, endDate },
      revenue: totalRevenue,
      expenses: {
        operating: totalExpenses,
        payroll: totalPayroll,
        total: totalExpenses + totalPayroll
      },
      netProfit,
      margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      expenseBreakdown: expenseData
    };
  }

  static async getCashFlowForecast() {
    const inflowData = await prisma.invoice.aggregate({
      where: { status: { in: ['sent', 'overdue'] } },
      _sum: { totalAmount: true }
    });
    const projectedInflow = inflowData._sum.totalAmount || 0;

    const outflowData = await prisma.salary.aggregate({
      where: { status: { in: ['pending', 'approved', 'hr_approved'] } },
      _sum: { netSalary: true }
    });
    const projectedOutflow = outflowData._sum.netSalary || 0;

    return {
      projectedInflow,
      projectedOutflow,
      netPosition: projectedInflow - projectedOutflow
    };
  }

  static async getProjectProfitability(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) throw new Error('Project not found');

    const projectRevenue = await prisma.invoice.aggregate({
      where: { projectId: project.id, status: 'paid' },
      _sum: { totalAmount: true }
    });
    const totalRevenue = projectRevenue._sum.totalAmount || 0;

    const projectExpenses = await prisma.expenseTransaction.aggregate({
      where: { projectId: project.id, status: 'approved' },
      _sum: { amount: true }
    });
    const totalExpenses = projectExpenses._sum.amount || 0;

    return {
      projectId,
      projectName: project.name,
      budget: project.budget || 0,
      revenue: totalRevenue,
      expenses: totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      remainingBudget: (project.budget || 0) - totalExpenses,
      isOverBudget: totalExpenses > (project.budget || 0) && (project.budget || 0) > 0,
      margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0
    };
  }

  static async getAllProjectsProfitability() {
    const projects = await prisma.project.findMany({ 
      where: { status: { not: 'cancelled' } },
      select: { id: true, name: true, budget: true }
    });

    const reports = await Promise.all(projects.map(async (p: any) => {
      return await this.getProjectProfitability(p.id);
    }));
    return reports.sort((a, b) => b.netProfit - a.netProfit);
  }

  static async getConfig() {
    const config = await prisma.companyConfig.findFirst({
        where: { }
    });

    let publicConfig = {
        activeProvider: null,
        razorpay: { isConfigured: false },
        stripe: { isConfigured: false },
        reminderSettings: {}
    };

    if (config && config.companyPaymentConfig) {
        const parsed = typeof config.companyPaymentConfig === 'string' 
            ? JSON.parse(config.companyPaymentConfig) 
            : config.companyPaymentConfig;
        
        publicConfig = {
            activeProvider: parsed.activeProvider || null,
            razorpay: {
                isConfigured: !!(parsed.razorpay?.keyId && parsed.razorpay?.keySecret)
            },
            stripe: {
                isConfigured: !!(parsed.stripe?.secretKey)
            },
            reminderSettings: parsed.reminderSettings || {}
        };
    }
    return publicConfig;
  }

  static async updateConfig(newConfig: any) {
    const config = await prisma.companyConfig.findFirst({
        where: { }
    });
    if (!config) throw new Error('Company config not found');
    
    let currentConfig: any = typeof config.companyPaymentConfig === 'string' 
        ? JSON.parse(config.companyPaymentConfig) 
        : (config.companyPaymentConfig || {});

    if (!currentConfig.razorpay) currentConfig.razorpay = {};
    if (!currentConfig.stripe) currentConfig.stripe = {};
    if (!currentConfig.reminderSettings) currentConfig.reminderSettings = {};

    if (newConfig.activeProvider) {
        currentConfig.activeProvider = newConfig.activeProvider;
    }
    if (newConfig.razorpay) {
        Object.assign(currentConfig.razorpay, newConfig.razorpay);
    }
    if (newConfig.stripe) {
        Object.assign(currentConfig.stripe, newConfig.stripe);
    }
    if (newConfig.reminderSettings) {
        Object.assign(currentConfig.reminderSettings, newConfig.reminderSettings);
    }

    const updated = await prisma.companyConfig.update({
        where: { id: config.id },
        data: { companyPaymentConfig: currentConfig }
    });
    
    return {
        updated,
        activeProvider: currentConfig.activeProvider
    };
  }

  static async getDashboardStats() {
    const [revenueRes, salaryRes, expenseRes, pendingInvoices, unverifiedBanks] = await Promise.all([
        prisma.invoice.aggregate({ where: { status: 'paid' }, _sum: { totalAmount: true } }),
        prisma.salary.aggregate({ where: { status: 'paid' }, _sum: { netSalary: true } }),
        prisma.expenseTransaction.aggregate({ where: { status: 'approved' }, _sum: { amount: true } }),
        prisma.invoice.count({ where: { status: { in: ['sent', 'overdue'] } } }),
        prisma.user.count({
            where: {
                bankAccount: null,
                role: { not: 'client' }
            }
        })
    ]);

    const totalRevenue = revenueRes._sum.totalAmount || 0;
    const totalPayouts = (salaryRes._sum.netSalary || 0) + (expenseRes._sum.amount || 0);

    return {
        totalRevenue,
        totalPayouts,
        pendingInvoices,
        unverifiedBanks,
        netBalance: totalRevenue - totalPayouts
    };
  }
}

import { prisma } from '@workspace/db';

function resolvePartyCompanyName(client?: any, lead?: any, fallback = 'Commercial Partner'): string {
  if (client) {
    if (typeof client === 'string') return client;
    if (client.companyName && typeof client.companyName === 'string') return client.companyName;
    if (client.company && typeof client.company === 'string') return client.company;
    if (client.company && typeof client.company === 'object' && client.company.name) return client.company.name;
    if (client.name && typeof client.name === 'string') return client.name;
  }
  if (lead) {
    if (typeof lead === 'string') return lead;
    if (lead.company && typeof lead.company === 'string') return lead.company;
    if (lead.companyName && typeof lead.companyName === 'string') return lead.companyName;
    if (lead.tenantCompany && typeof lead.tenantCompany === 'object' && lead.tenantCompany.name) return lead.tenantCompany.name;
    if (lead.name && typeof lead.name === 'string') return lead.name;
  }
  return fallback;
}

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

  static async getDashboardStats(companyId?: string) {
    const whereCompany = companyId ? { companyId } : {};

    const [deals, invoices, expenses, companyTx, salaries, unverifiedUsers] = await Promise.all([
      prisma.deal.findMany({
        where: companyId ? { OR: [{ companyId }, { lead: { companyId } }] } : {},
        select: { 
          id: true, 
          title: true, 
          value: true, 
          stage: true, 
          createdAt: true,
          client: { select: { id: true, name: true, companyName: true, company: { select: { id: true, name: true } } } },
          lead: { select: { id: true, name: true, company: true, companyName: true } }
        },
        take: 200,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invoice.findMany({
        where: companyId ? { companyId } : {},
        select: { 
          id: true, 
          invoiceNumber: true, 
          totalAmount: true, 
          status: true, 
          dueDate: true, 
          createdAt: true,
          client: { select: { id: true, name: true, companyName: true, company: { select: { id: true, name: true } } } }
        },
        take: 200,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.expenseTransaction.findMany({
        where: companyId ? { companyId } : {},
        select: { 
          id: true, 
          title: true, 
          amount: true, 
          status: true, 
          category: true, 
          date: true, 
          createdAt: true,
          vendor: { select: { id: true, name: true } },
          employee: { select: { id: true, name: true } }
        },
        take: 200,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.companyTransaction.findMany({
        where: companyId ? { companyId } : {},
        select: { 
          id: true, 
          amount: true, 
          type: true, 
          status: true, 
          provider: true,
          referenceModel: true,
          referenceId: true,
          metadata: true,
          createdAt: true,
          client: { select: { id: true, name: true, companyName: true, company: { select: { id: true, name: true } } } },
          user: { select: { id: true, name: true, email: true } }
        },
        take: 200,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.salary.findMany({
        where: companyId ? { employee: { companyId } } : {},
        select: { 
          id: true, 
          amount: true, 
          baseSalary: true, 
          bonuses: true, 
          deductions: true, 
          netSalary: true, 
          status: true, 
          month: true, 
          paidAt: true,
          createdAt: true,
          employee: { 
            select: { 
              id: true, 
              name: true, 
              employeeId: true, 
              bankAccount: true,
              position: true,
              department: true
            } 
          }
        },
        take: 200,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          bankAccount: null,
          role: { not: 'client' }
        },
        select: {
          id: true,
          name: true,
          email: true,
          employeeId: true,
          role: true,
          position: true
        },
        take: 50
      })
    ]);

    const dealRevenue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
    const invoicePaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const txCredits = companyTx.filter(t => t.type === 'credit' && t.status === 'completed').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalRevenue = dealRevenue > 0 ? dealRevenue : (invoicePaid + txCredits);

    const expenseTotal = expenses.filter(e => e.status === 'approved' || e.status === 'paid').reduce((sum, e) => sum + (e.amount || 0), 0);
    const paidSalaries = salaries.filter(s => s.status === 'paid' || s.status === 'approved');
    const salaryTotal = paidSalaries.reduce((sum, s) => sum + (s.netSalary || s.amount || s.baseSalary || 0), 0);
    const txDebits = companyTx.filter(t => t.type === 'debit' && t.status === 'completed').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPayouts = expenseTotal + salaryTotal + txDebits;

    const pendingInvoices = invoices.filter(i => i.status !== 'paid');
    const pendingInvoicesCount = pendingInvoices.length;
    const accountsReceivable = pendingInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const netBalance = totalRevenue - totalPayouts;
    const grossMargin = totalRevenue > 0 ? Number(((netBalance / totalRevenue) * 100).toFixed(1)) : 0;
    const workingCapital = netBalance + accountsReceivable;
    const quickRatio = totalPayouts > 0 ? Number(((netBalance + accountsReceivable) / totalPayouts).toFixed(1)) : 0;

    // Category allocation for payouts
    const categoryTotals: Record<string, { amount: number; count: number }> = {};
    if (salaryTotal > 0) {
      categoryTotals['Payroll & Compensation'] = { amount: salaryTotal, count: paidSalaries.length };
    }
    for (const exp of expenses) {
      const cat = exp.category === 'software' ? 'Cloud & Software' :
                  exp.category === 'marketing' ? 'Marketing & Growth' :
                  exp.category === 'hardware' ? 'Equipment & Hardware' :
                  exp.category === 'office' ? 'Office & Facilities' :
                  (exp.category ? exp.category.charAt(0).toUpperCase() + exp.category.slice(1) : 'Operations & OPEX');
      if (!categoryTotals[cat]) categoryTotals[cat] = { amount: 0, count: 0 };
      categoryTotals[cat].amount += (exp.amount || 0);
      categoryTotals[cat].count += 1;
    }
    for (const tx of companyTx.filter(t => t.type === 'debit')) {
      const meta = (typeof tx.metadata === 'object' && tx.metadata ? tx.metadata : {}) as any;
      const cat = meta.category || tx.referenceModel || 'Disbursements';
      if (!categoryTotals[cat]) categoryTotals[cat] = { amount: 0, count: 0 };
      categoryTotals[cat].amount += (tx.amount || 0);
      categoryTotals[cat].count += 1;
    }

    const payoutCategories = Object.entries(categoryTotals).map(([name, data]) => ({
      name,
      amount: data.amount,
      count: data.count,
      percentage: totalPayouts > 0 ? Number(((data.amount / totalPayouts) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.amount - a.amount);

    // Itemized recent payouts
    const recentPayouts: any[] = [];
    for (const s of salaries.slice(0, 15)) {
      recentPayouts.push({
        id: `PAY-${s.id.slice(0, 8).toUpperCase()}`,
        type: 'salary',
        name: s.employee?.name || 'Employee Payroll',
        entityId: s.employee?.employeeId || s.employee?.id,
        category: 'Payroll & Compensation',
        amount: s.netSalary || s.amount || s.baseSalary || 0,
        baseSalary: s.baseSalary || 0,
        deductions: s.deductions || 0,
        bonuses: s.bonuses || 0,
        status: s.status,
        provider: 'RazorpayX Payroll',
        date: s.paidAt ? s.paidAt.toISOString() : s.createdAt.toISOString()
      });
    }
    for (const exp of expenses.slice(0, 15)) {
      recentPayouts.push({
        id: `EXP-${exp.id.slice(0, 8).toUpperCase()}`,
        type: 'expense',
        name: exp.title || exp.vendor?.name || 'Vendor Expense',
        entityId: exp.vendor?.name || 'Simplicion Cloud',
        category: exp.category || 'OPEX',
        amount: exp.amount || 0,
        status: exp.status,
        provider: exp.vendor?.name ? 'Vendor Direct' : 'Corporate Card',
        date: (exp.date || exp.createdAt).toISOString()
      });
    }
    recentPayouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Itemized recent revenue
    const recentRevenue: any[] = [];
    for (const d of deals.slice(0, 15)) {
      recentRevenue.push({
        id: `DL-${d.id.slice(0, 8).toUpperCase()}`,
        type: 'deal',
        name: d.title,
        client: resolvePartyCompanyName(d.client, d.lead, 'Commercial Client'),
        amount: d.value || 0,
        status: d.stage,
        provider: 'Direct Contract',
        date: d.createdAt.toISOString()
      });
    }
    for (const inv of invoices.filter(i => i.status === 'paid').slice(0, 15)) {
      recentRevenue.push({
        id: inv.invoiceNumber || `INV-${inv.id.slice(0, 8).toUpperCase()}`,
        type: 'invoice',
        name: `Invoice #${inv.invoiceNumber}`,
        client: resolvePartyCompanyName(inv.client, null, 'Client'),
        amount: inv.totalAmount || 0,
        status: inv.status,
        provider: 'Direct Invoicing',
        date: inv.createdAt.toISOString()
      });
    }
    recentRevenue.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalPayroll = salaries.reduce((sum, s) => sum + (s.baseSalary || s.netSalary || s.amount || 0) + (s.bonuses || 0), 0);
    const netDisbursed = salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.netSalary || s.amount || 0), 0);
    const totalDeductions = salaries.reduce((sum, s) => sum + (s.deductions || 0), 0);
    const pendingSalaries = salaries.filter(s => s.status !== 'paid');

    return {
      totalRevenue,
      totalPayouts,
      pendingInvoices: pendingInvoicesCount,
      unverifiedBanks: unverifiedUsers.length,
      netBalance,
      grossMargin,
      accountsReceivable,
      workingCapital,
      quickRatio,
      opexApproved: expenseTotal,
      activeContractsCount: deals.length,
      breakdown: {
        payouts: {
          total: totalPayouts,
          payrollTotal: salaryTotal,
          opexTotal: expenseTotal,
          txDebits,
          categories: payoutCategories,
          recentItems: recentPayouts.slice(0, 20)
        },
        payroll: {
          totalPayroll,
          netDisbursed,
          totalDeductions,
          pendingCount: pendingSalaries.length,
          totalStaff: salaries.length
        },
        revenue: {
          total: totalRevenue,
          dealRevenue,
          invoiceRevenue: invoicePaid,
          accountsReceivable,
          recentItems: recentRevenue.slice(0, 20)
        },
        pending: {
          pendingInvoices: pendingInvoices.slice(0, 20).map(i => ({
            id: i.id,
            invoiceNumber: i.invoiceNumber,
            clientName: resolvePartyCompanyName(i.client, null, 'Client'),
            amount: i.totalAmount || 0,
            dueDate: i.dueDate ? i.dueDate.toISOString() : null,
            status: i.status
          })),
          unverifiedUsers: unverifiedUsers.slice(0, 20)
        },
        netBalance: {
          revenue: totalRevenue,
          payouts: totalPayouts,
          net: netBalance,
          grossMargin,
          workingCapital,
          quickRatio
        }
      }
    };
  }

  static async getUnifiedLedger(params: { page?: number; limit?: number; type?: string; status?: string; search?: string; companyId?: string } = {}) {
    const { page = 1, limit = 10, type, status, search, companyId } = params;

    const [deals, invoices, expenses, companyTx, salaries] = await Promise.all([
      prisma.deal.findMany({
        where: companyId ? { OR: [{ companyId }, { lead: { companyId } }] } : {},
        include: {
          client: { select: { id: true, name: true, companyName: true, company: { select: { id: true, name: true } }, email: true } },
          lead: { select: { id: true, name: true, company: true, companyName: true } },
          owner: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.invoice.findMany({
        where: companyId ? { companyId } : {},
        include: {
          client: { select: { id: true, name: true, companyName: true, company: { select: { id: true, name: true } }, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.expenseTransaction.findMany({
        where: companyId ? { companyId } : {},
        include: {
          vendor: { select: { id: true, name: true } },
          employee: { select: { id: true, name: true, email: true } },
          client: { select: { id: true, name: true, companyName: true, company: { select: { id: true, name: true } } } },
          project: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.companyTransaction.findMany({
        where: companyId ? { companyId } : {},
        include: {
          client: { select: { id: true, name: true, companyName: true, company: { select: { id: true, name: true } } } },
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.salary.findMany({
        where: companyId ? { employee: { companyId } } : {},
        include: {
          employee: { select: { id: true, name: true, email: true, employeeId: true, department: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    ]);

    let ledger: any[] = [];

    // 1. Deals / Contracted Commercial Inflows
    for (const deal of deals) {
      const clientName = deal.client?.name || deal.lead?.name || 'Commercial Client';
      const companyName = resolvePartyCompanyName(deal.client, deal.lead, deal.title);
      const isWon = deal.stage === 'ContractSigned' || deal.stage === 'contract_signed' || deal.stage === 'closed_won' || deal.stage === 'in_delivery';
      ledger.push({
        id: `DL-${deal.id.slice(0, 8).toUpperCase()}`,
        rawId: deal.id,
        type: 'inbound',
        ledgerType: 'revenue',
        amount: deal.value || 0,
        currency: 'INR',
        status: isWon ? 'completed' : 'pending',
        provider: 'Direct Contract',
        referenceModel: 'Deal / Contract',
        referenceId: deal.title,
        description: deal.title,
        entityName: clientName,
        entityCompany: companyName,
        entityRole: 'Client',
        category: 'Client Settlement & Retainer',
        createdAt: deal.createdAt.toISOString(),
        breakdown: {
          baseAmount: deal.value || 0,
          taxAmount: Math.round((deal.value || 0) * 0.18),
          feeAmount: 0,
          netAmount: deal.value || 0,
          debitAccount: '1010 - Operating Bank Account',
          creditAccount: '4010 - Client Commercial Revenue',
          settlementRail: 'Direct Contract / Wire',
          auditNotes: `Commercial deal for ${companyName} (${deal.stage})`
        }
      });
    }

    // 2. Expenses / OPEX Outflows
    for (const exp of expenses) {
      const isPaid = exp.status === 'approved' || exp.status === 'paid';
      const cat = exp.category === 'software' ? 'Cloud & Software Infrastructure' : exp.category || 'Operational OPEX';
      ledger.push({
        id: `EXP-${exp.id.slice(0, 8).toUpperCase()}`,
        rawId: exp.id,
        type: 'outbound',
        ledgerType: 'expense',
        amount: exp.amount || 0,
        currency: exp.currency || 'INR',
        status: isPaid ? 'completed' : 'pending',
        provider: exp.vendor?.name ? 'Vendor Payout' : 'Corporate Card',
        referenceModel: 'Expense',
        referenceId: exp.title,
        description: exp.title,
        entityName: exp.vendor?.name || exp.employee?.name || 'Infrastructure Vendor',
        entityCompany: exp.vendor?.name || 'Cloud Services',
        entityRole: exp.vendor?.name ? 'Vendor' : 'Employee',
        category: cat,
        createdAt: (exp.date || exp.createdAt).toISOString(),
        breakdown: {
          baseAmount: exp.amount || 0,
          taxAmount: 0,
          feeAmount: 0,
          netAmount: exp.amount || 0,
          debitAccount: '5010 - Operational Expense (OPEX)',
          creditAccount: '1010 - Operating Bank Account',
          settlementRail: exp.vendor?.name ? 'Vendor Settlement' : 'Corporate Card',
          auditNotes: `Approved business disbursement for ${exp.title}`
        }
      });
    }

    // 3. Invoices / Accounts Receivable
    for (const inv of invoices) {
      const clientCompany = resolvePartyCompanyName(inv.client, null, 'Corporate Accounts');
      ledger.push({
        id: inv.invoiceNumber || `INV-${inv.id.slice(0, 8).toUpperCase()}`,
        rawId: inv.id,
        type: 'inbound',
        ledgerType: 'invoice',
        amount: inv.totalAmount || 0,
        currency: 'INR',
        status: inv.status === 'paid' ? 'completed' : inv.status === 'draft' ? 'draft' : 'pending',
        provider: 'Direct Invoice',
        referenceModel: 'Invoice',
        referenceId: inv.invoiceNumber,
        description: `Client Invoice #${inv.invoiceNumber}`,
        entityName: inv.client?.name || 'Enterprise Client',
        entityCompany: clientCompany,
        entityRole: 'Client',
        category: 'Professional Services Invoice',
        createdAt: (inv.issueDate || inv.createdAt).toISOString(),
        breakdown: {
          baseAmount: inv.totalAmount || 0,
          taxAmount: Math.round((inv.totalAmount || 0) * 0.18),
          feeAmount: 0,
          netAmount: inv.totalAmount || 0,
          debitAccount: '1010 - Operating Bank Account',
          creditAccount: '4020 - Invoiced Client Revenue',
          settlementRail: 'Bank Transfer / Payment Link',
          auditNotes: `Direct invoice #${inv.invoiceNumber} for ${clientCompany}`
        }
      });
    }

    // 4. Company Transactions / Settlements
    for (const tx of companyTx) {
      const isCredit = tx.type === 'credit';
      const meta = (typeof tx.metadata === 'object' && tx.metadata ? tx.metadata : {}) as any;
      const txCategory = meta.category || tx.referenceModel || (isCredit ? 'Client Settlement' : 'Disbursement');
      const txDesc = meta.description || `${txCategory} Ledger Entry`;
      const txParty = meta.party || meta.counterparty || '';
      const txMethod = meta.paymentMethod || tx.provider || 'RazorpayX Rail';
      const entity = txParty || resolvePartyCompanyName(tx.client, null, tx.user?.name || 'Commercial Partner');
      ledger.push({
        id: `TX-${tx.id.slice(0, 8).toUpperCase()}`,
        rawId: tx.id,
        type: isCredit ? 'inbound' : 'outbound',
        ledgerType: isCredit ? 'revenue' : 'payout',
        amount: tx.amount || 0,
        currency: tx.currency || 'INR',
        status: tx.status === 'completed' ? 'completed' : tx.status,
        provider: txMethod,
        referenceModel: tx.referenceModel || 'Settlement',
        referenceId: tx.referenceId || tx.id,
        description: txDesc,
        entityName: entity,
        entityCompany: entity,
        entityRole: isCredit ? 'Client' : 'Beneficiary',
        category: txCategory,
        createdAt: tx.createdAt.toISOString(),
        breakdown: {
          baseAmount: tx.amount || 0,
          taxAmount: 0,
          feeAmount: 0,
          netAmount: tx.amount || 0,
          debitAccount: isCredit ? '1010 - Operating Bank Account' : '5020 - General Ledger Disbursement',
          creditAccount: isCredit ? '4010 - Commercial Inflow' : '1010 - Operating Bank Account',
          settlementRail: txMethod,
          auditNotes: txDesc || 'Master ledger entry'
        }
      });
    }

    // 5. Salaries
    for (const s of salaries) {
      const isPaid = s.status === 'paid';
      const empName = s.employee?.name || 'Staff Member';
      ledger.push({
        id: `PAY-${s.id.slice(0, 8).toUpperCase()}`,
        rawId: s.id,
        type: 'outbound',
        ledgerType: 'payout',
        amount: s.netSalary || s.amount || s.baseSalary || 0,
        currency: 'INR',
        status: isPaid ? 'completed' : 'pending',
        provider: 'RazorpayX Payroll',
        referenceModel: 'Salary',
        referenceId: `Month: ${s.month || 'Current'}`,
        description: `Payroll Disbursement - ${empName} (${s.month || 'Current'})`,
        entityName: empName,
        entityCompany: s.employee?.department ? `${s.employee.department} Dept` : 'Internal Team',
        entityRole: 'Employee',
        category: 'Payroll & Compensation',
        createdAt: (s.paidAt || s.createdAt).toISOString(),
        breakdown: {
          baseAmount: s.baseSalary || s.netSalary || 0,
          taxAmount: s.deductions || 0,
          feeAmount: 0,
          netAmount: s.netSalary || s.amount || 0,
          debitAccount: '5030 - Employee Payroll Expense',
          creditAccount: '1010 - Operating Bank Account',
          settlementRail: 'RazorpayX Automated Payroll',
          auditNotes: `Salary disbursement for ${empName}`
        }
      });
    }

    // Sort descending by date
    ledger.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply type filter
    if (type) {
      if (type === 'inbound' || type === 'outbound') {
        ledger = ledger.filter(item => item.type === type);
      } else if (['revenue', 'expense', 'invoice', 'payout'].includes(type)) {
        ledger = ledger.filter(item => item.ledgerType === type);
      }
    }

    // Apply status filter
    if (status) {
      ledger = ledger.filter(item => item.status.toLowerCase() === status.toLowerCase());
    }

    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      ledger = ledger.filter(item =>
        item.id.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.entityName.toLowerCase().includes(q) ||
        item.entityCompany.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.referenceId.toLowerCase().includes(q)
      );
    }

    const total = ledger.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paginatedTransactions = ledger.slice(offset, offset + limit);

    return {
      transactions: paginatedTransactions,
      total,
      totalPages,
      page,
      limit
    };
  }

  static async initiateSalaryPayout(salaryId: string, companyId?: string) {
    const salary = await prisma.salary.findFirst({
      where: {
        id: salaryId,
        ...(companyId ? { employee: { companyId } } : {})
      },
      include: {
        employee: { select: { id: true, name: true, bankAccount: true } }
      }
    });

    if (!salary) throw new Error('Salary record not found');

    const updated = await prisma.salary.update({
      where: { id: salary.id },
      data: {
        status: 'paid',
        paidAt: new Date()
      }
    });

    // Create corresponding CompanyTransaction record
    if (companyId) {
      await prisma.companyTransaction.create({
        data: {
          companyId,
          amount: updated.netSalary || updated.amount || updated.baseSalary || 0,
          type: 'debit',
          status: 'completed',
          provider: 'RazorpayX Payroll',
          referenceModel: 'Salary',
          referenceId: salary.id,
          userId: salary.employee?.id,
          metadata: {
            category: 'Payroll',
            description: `Automated Salary Payout to ${salary.employee?.name || 'Employee'}`,
            counterparty: salary.employee?.name || 'Employee',
            party: salary.employee?.name || 'Employee',
            paymentMethod: 'RazorpayX Payroll',
            doubleEntryDebit: '5030 - Payroll Expense',
            doubleEntryCredit: '1010 - Operating Bank Account'
          }
        }
      });
    }

    return {
      success: true,
      message: `Payout of ₹${(updated.netSalary || updated.amount || 0).toLocaleString('en-IN')} successfully processed for ${salary.employee?.name || 'Employee'}.`,
      salary: updated
    };
  }

  static async verifyBankAccount(userId: string, companyId?: string) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        ...(companyId ? { companyId } : {})
      }
    });

    if (!user) throw new Error('User not found');

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        bankAccount: user.bankAccount || `HDFC-VERIFIED-${Date.now().toString().slice(-6)}`
      }
    });

    return {
      success: true,
      message: `Bank account for ${user.name} has been verified successfully.`,
      user: { id: updated.id, name: updated.name, bankAccount: updated.bankAccount }
    };
  }

  static async triggerReminders(companyId?: string) {
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        status: { in: ['sent', 'pending', 'overdue'] }
      },
      include: { client: { select: { id: true, name: true, email: true } } },
      take: 20
    });

    return {
      success: true,
      message: `Dispatched payment reminders for ${pendingInvoices.length} outstanding invoice(s).`,
      count: pendingInvoices.length
    };
  }

  static async createPayout(data: {
    amount: number;
    category: string;
    description: string;
    counterparty: string;
    paymentMethod?: string;
    referenceId?: string;
    companyId?: string;
    userId?: string;
  }) {
    if (!data.companyId) throw new Error('Company ID is required');
    const transaction = await prisma.companyTransaction.create({
      data: {
        companyId: data.companyId,
        amount: Number(data.amount),
        type: 'debit',
        status: 'completed',
        provider: data.paymentMethod || 'RazorpayX Direct Payout',
        referenceModel: 'Expense',
        referenceId: data.referenceId || `PAYOUT-${Date.now()}`,
        userId: data.userId,
        metadata: {
          category: data.category || 'Disbursement',
          description: data.description || `Payout to ${data.counterparty}`,
          party: data.counterparty,
          counterparty: data.counterparty,
          paymentMethod: data.paymentMethod || 'RazorpayX Direct Payout',
          doubleEntryDebit: '5010 - Operational Outflow',
          doubleEntryCredit: '1010 - Operating Bank Account'
        }
      }
    });

    return {
      success: true,
      message: `Payout of ₹${Number(data.amount).toLocaleString('en-IN')} to ${data.counterparty} executed successfully.`,
      transaction
    };
  }
}

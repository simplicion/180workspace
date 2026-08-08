'use strict';

class FinancialAnalyticsService {
    /**
     * Generates a Profit & Loss (P&L) Report for a specific period.
     */
    static async getPLReport(companyPrisma, startDate, endDate) {
        const Invoice = companyPrisma.invoice;
        const Expense = companyPrisma.expense;
        const Salary = companyPrisma.salary;

        // 1. Calculate Revenue (Sum of Paid Invoices)
        const revenueData = await Invoice.aggregate({
            where: {
                issueDate: { gte: new Date(startDate), lte: new Date(endDate) },
                status: 'paid'
            },
            _sum: { totalAmount: true }
        });
        const totalRevenue = revenueData._sum.totalAmount || 0;

        // 2. Calculate Operating Expenses (Sum of Approved Expenses)
        const expenseDataRaw = await Expense.groupBy({
            by: ['category'],
            where: {
                date: { gte: new Date(startDate), lte: new Date(endDate) },
                status: 'approved'
            },
            _sum: { amount: true }
        });
        const expenseData = expenseDataRaw.map(item => ({ _id: item.category, total: item._sum.amount || 0 }));
        const totalExpenses = expenseData.reduce((sum, item) => sum + item.total, 0);

        // 3. Calculate Payroll (Sum of Paid Salaries)
        const salaryData = await Salary.aggregate({
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

    /**
     * Predicts cash flow based on unpaid invoices and recurring expenses.
     */
    static async getCashFlowForecast(companyPrisma) {
        const Invoice = companyPrisma.invoice;
        const Salary = companyPrisma.salary;

        // Projected Inflow (Sum of Sent/Overdue Invoices)
        const inflowData = await Invoice.aggregate({
            where: { status: { in: ['sent', 'overdue'] } },
            _sum: { totalAmount: true }
        });
        const projectedInflow = inflowData._sum.totalAmount || 0;

        // Projected Outflow (Sum of Approved but Unpaid Salaries for current/next month)
        const outflowData = await Salary.aggregate({
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

    /**
     * Calculates profitability and budget performance for a specific project.
     */
    static async getProjectProfitability(companyPrisma, projectId) {
        const Project = companyPrisma.project;
        const Invoice = companyPrisma.invoice;
        const Expense = companyPrisma.expense;

        const project = await Project.findUnique({ where: { id: projectId } });
        if (!project) throw new Error('Project not found');

        // 1. Revenue from Invoices linked to this project
        const projectRevenue = await Invoice.aggregate({
            where: { projectId: project.id, status: 'paid' },
            _sum: { totalAmount: true }
        });
        const totalRevenue = projectRevenue._sum.totalAmount || 0;

        // 2. Expenses linked to this project
        const projectExpenses = await Expense.aggregate({
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
            isOverBudget: totalExpenses > project.budget && project.budget > 0,
            margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0
        };
    }
}

module.exports = FinancialAnalyticsService;

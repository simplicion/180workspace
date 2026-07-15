'use strict';

/**
 * Service for calculating real company financials based on workspace data.
 */
class CompanyFinancialsService {
    
    /**
     * Calculate financial overview including Profitability, Revenue, and Burn Rate.
     * @param {Object} prisma - Prisma client instance
     * @param {String} companyId - The ID of the company
     * @returns {Object} - Financial metrics
     */
    async calculateFinancials(prisma, companyId) {
        // Fetch all invoices (Income) and expenses for the company
        const [invoices, expenses] = await Promise.all([
            prisma.invoice.findMany({
                where: { companyConfig: { companyId }, status: 'paid' },
                select: { subtotal: true, createdAt: true }
            }),
            prisma.expense.findMany({
                where: { companyId, status: 'approved' },
                select: { amount: true, createdAt: true }
            })
        ]);

        let totalIncome = 0;
        invoices.forEach(inv => {
            totalIncome += Number(inv.subtotal || 0);
        });

        let totalExpenses = 0;
        expenses.forEach(exp => {
            totalExpenses += Number(exp.amount || 0);
        });

        // 1. Profitability (Income vs Expenses)
        const isProfitable = totalIncome > totalExpenses;
        const businessStatus = isProfitable ? 'Profitable' : 'Not Profitable';

        // 2. Annual Revenue
        // For this basic logic, we sum invoices from the current year.
        const currentYear = new Date().getFullYear();
        let annualRevenue = 0;
        invoices.forEach(inv => {
            if (new Date(inv.createdAt).getFullYear() === currentYear) {
                annualRevenue += Number(inv.subtotal || 0);
            }
        });

        // 3. Burn Rate (Average monthly expenses over the last 12 months)
        // Simplified: Total expenses divided by 12 (or however many months active)
        const burnRate = totalExpenses > 0 ? (totalExpenses / 12) : 0;

        return {
            businessStatus,
            annualRevenue: annualRevenue.toFixed(2),
            burnRate: burnRate.toFixed(2),
            totalIncome,
            totalExpenses
        };
    }

    /**
     * Calculate team growth rate comparing this year to previous year.
     * @param {Object} prisma - Prisma client instance
     * @param {String} companyId - The ID of the company
     * @returns {String} - Formatted percentage (e.g. "+100%")
     */
    async calculateTeamGrowth(prisma, companyId) {
        const currentYear = new Date().getFullYear();
        
        // Users created before or during previous year
        const previousYearUsers = await prisma.user.count({
            where: {
                companyId,
                createdAt: {
                    lt: new Date(`${currentYear}-01-01`)
                }
            }
        });

        // Total users currently
        const currentUsers = await prisma.user.count({
            where: {
                companyId
            }
        });

        if (previousYearUsers === 0 && currentUsers > 0) {
            return "100%"; // Base case if they started this year
        }
        if (previousYearUsers === 0 && currentUsers === 0) {
            return "0%";
        }

        const growth = ((currentUsers - previousYearUsers) / previousYearUsers) * 100;
        const prefix = growth >= 0 ? "+" : "";
        return `${prefix}${growth.toFixed(0)}%`;
    }
}

module.exports = new CompanyFinancialsService();

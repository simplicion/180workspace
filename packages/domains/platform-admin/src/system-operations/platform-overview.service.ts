import { PlatformOverviewRepository } from '../repositories/platform-overview.repository';

export class PlatformOverviewService {
    static async getOverview() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        const [
            [
                totalCompanies,
                activeCompanies,
                newCompaniesThisMonth,
                totalSubscriptions,
                activeSubscriptions,
                failedPayments,
                totalUsers
            ],
            monthlyRevenue,
            recentSubs,
            sixMonthCompanies,
            activeSubs,
            recentCompanies
        ] = await Promise.all([
            PlatformOverviewRepository.getOverviewCounts(startOfMonth),
            PlatformOverviewRepository.getMonthlyRevenue(startOfMonth),
            PlatformOverviewRepository.getRecentSubscriptions(sixMonthsAgo),
            PlatformOverviewRepository.getRecentCompanies(sixMonthsAgo),
            PlatformOverviewRepository.getActiveSubscriptionsWithPlan(),
            PlatformOverviewRepository.getLatestCompanies(5),
        ]);

        const revenueMap: Record<string, number> = {};
        recentSubs.forEach(sub => {
            const date = new Date(sub.createdAt);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            revenueMap[key] = (revenueMap[key] || 0) + (Number(sub.amount) || 0);
        });
        const revenueChart = Object.keys(revenueMap).map(key => {
            const [year, month] = key.split('-').map(Number);
            return { _id: { year, month }, revenue: revenueMap[key] };
        }).sort((a, b) => a._id.year - b._id.year || a._id.month - b._id.month);

        const companyMap: Record<string, number> = {};
        sixMonthCompanies.forEach(c => {
            const date = new Date(c.createdAt);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            companyMap[key] = (companyMap[key] || 0) + 1;
        });
        const companyChart = Object.keys(companyMap).map(key => {
            const [year, month] = key.split('-').map(Number);
            return { _id: { year, month }, count: companyMap[key] };
        }).sort((a, b) => a._id.year - b._id.year || a._id.month - b._id.month);

        const planDistMap: Record<string, number> = {};
        activeSubs.forEach(sub => {
            const planName = (sub.plan as any)?.planName || 'Unknown';
            planDistMap[planName] = (planDistMap[planName] || 0) + 1;
        });
        const planDist = Object.keys(planDistMap).map(planName => ({
            _id: planName,
            count: planDistMap[planName]
        }));

        return {
            stats: {
                totalCompanies, activeCompanies, newCompaniesThisMonth,
                totalSubscriptions, activeSubscriptions, failedPayments,
                monthlyRevenue, totalUsers,
            },
            charts: { revenueChart, companyChart, planDist },
            recentCompanies,
        };
    }
}

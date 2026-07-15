'use strict';

const { prisma } = require('@workspace/db');

exports.getOverview = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        const [
            totalCompanies,
            activeCompanies,
            newCompaniesThisMonth,
            totalSubscriptions,
            activeSubscriptions,
            failedPayments,
            totalUsers
        ] = await Promise.all([
            prisma.company.count(),
            prisma.company.count({ where: { accountStatus: 'active', subscriptionStatus: 'active' } }),
            prisma.company.count({ where: { createdAt: { gte: startOfMonth } } }),
            prisma.subscription.count(),
            prisma.subscription.count({ where: { status: 'active' } }),
            prisma.subscription.count({ where: { paymentStatus: 'failed' } }),
            prisma.user.count()
        ]);

        // Monthly revenue (sum of paid subscriptions this month)
        const monthlyRevenueSub = await prisma.subscription.findMany({
            where: { paymentStatus: 'paid', createdAt: { gte: startOfMonth } },
            select: { amount: true }
        });
        const monthlyRevenue = monthlyRevenueSub.reduce((acc, sub) => acc + (Number(sub.amount) || 0), 0);

        // Revenue last 6 months
        const recentSubs = await prisma.subscription.findMany({
            where: { paymentStatus: 'paid', createdAt: { gte: sixMonthsAgo } },
            select: { amount: true, createdAt: true }
        });
        const revenueMap = {};
        recentSubs.forEach(sub => {
            const date = new Date(sub.createdAt);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            revenueMap[key] = (revenueMap[key] || 0) + (Number(sub.amount) || 0);
        });
        const revenueChart = Object.keys(revenueMap).map(key => {
            const [year, month] = key.split('-').map(Number);
            return { _id: { year, month }, revenue: revenueMap[key] };
        }).sort((a, b) => a._id.year - b._id.year || a._id.month - b._id.month);

        // Company growth last 6 months
        const recentCompanies = await prisma.company.findMany({
            where: { createdAt: { gte: sixMonthsAgo } },
            select: { createdAt: true }
        });
        const companyMap = {};
        recentCompanies.forEach(c => {
            const date = new Date(c.createdAt);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            companyMap[key] = (companyMap[key] || 0) + 1;
        });
        const companyChart = Object.keys(companyMap).map(key => {
            const [year, month] = key.split('-').map(Number);
            return { _id: { year, month }, count: companyMap[key] };
        }).sort((a, b) => a._id.year - b._id.year || a._id.month - b._id.month);

        // Plan distribution (pie chart)
        const activeSubs = await prisma.subscription.findMany({
            where: { status: 'active' },
            include: { plan: true }
        });
        const planDistMap = {};
        activeSubs.forEach(sub => {
            const planName = sub.plan?.planName || 'Unknown';
            planDistMap[planName] = (planDistMap[planName] || 0) + 1;
        });
        const planDist = Object.keys(planDistMap).map(planName => ({
            _id: planName,
            count: planDistMap[planName]
        }));

        res.json({
            stats: {
                totalCompanies, activeCompanies, newCompaniesThisMonth,
                totalSubscriptions, activeSubscriptions, failedPayments,
                monthlyRevenue, totalUsers,
            },
            charts: { revenueChart, companyChart, planDist },
        });
    } catch (err) {
        console.error('Overview error:', err);
        res.status(500).json({ error: 'Failed to fetch overview' });
    }
};

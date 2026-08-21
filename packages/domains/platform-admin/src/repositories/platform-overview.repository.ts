import { prisma } from '@workspace/db';

export class PlatformOverviewRepository {
    static async getOverviewCounts(startOfMonth: Date) {
        return Promise.all([
            prisma.company.count(),
            prisma.company.count({ where: { accountStatus: 'active', subscriptionStatus: 'active' } }),
            prisma.company.count({ where: { createdAt: { gte: startOfMonth } } }),
            prisma.subscription.count(),
            prisma.subscription.count({ where: { status: 'active' } }),
            prisma.subscription.count({ where: { paymentStatus: 'failed' } }),
            prisma.user.count()
        ]);
    }

    static async getMonthlyRevenue(startOfMonth: Date) {
        return prisma.subscription.findMany({
            where: { paymentStatus: 'paid', createdAt: { gte: startOfMonth } },
            select: { amount: true }
        });
    }

    static async getRecentSubscriptions(sixMonthsAgo: Date) {
        return prisma.subscription.findMany({
            where: { paymentStatus: 'paid', createdAt: { gte: sixMonthsAgo } },
            select: { amount: true, createdAt: true }
        });
    }

    static async getRecentCompanies(sixMonthsAgo: Date) {
        return prisma.company.findMany({
            where: { createdAt: { gte: sixMonthsAgo } },
            select: { createdAt: true }
        });
    }

    static async getActiveSubscriptionsWithPlan() {
        return prisma.subscription.findMany({
            where: { status: 'active' },
            include: { plan: true }
        });
    }
}

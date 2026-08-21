import { prisma } from '@workspace/db';

export class PlatformSubscriptionRepository {
    static async list(page: number, limit: number, status: string) {
        const where: any = {};
        if (status) where.status = status;

        return Promise.all([
            prisma.subscription.findMany({
                where,
                include: {
                    plan: { select: { id: true, planName: true, price: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.subscription.count({ where }),
        ]);
    }

    static async cancel(id: string, reason: string) {
        return prisma.subscription.update({
            where: { id },
            data: {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelReason: reason || 'Cancelled by super admin',
            },
        });
    }

    static async findById(id: string) {
        return prisma.subscription.findUnique({
            where: { id },
            include: { plan: true },
        });
    }

    static async update(id: string, data: any) {
        return prisma.subscription.update({
            where: { id },
            data,
        });
    }

    static async getHistoryByCompany(companyId: string) {
        return prisma.subscription.findMany({
            where: { companyId },
            include: {
                plan: { select: { id: true, planName: true, price: true, currency: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}

import { prisma } from '@workspace/db';

export class SystemLogRepository {
    static async getLogs(page: number, limit: number) {
        return Promise.all([
            prisma.activityLog.findMany({
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.activityLog.count(),
        ]);
    }

    static async getFailedLogins(page: number, limit: number) {
        const where = {
            action: { contains: 'login', mode: 'insensitive' as any },
            success: false,
        };

        return Promise.all([
            prisma.activityLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.activityLog.count({ where }),
        ]);
    }
}

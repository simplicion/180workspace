import { prisma } from '@workspace/db';

export class PlatformAnnouncementRepository {
    static async list() {
        return prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    static async listActive() {
        const now = new Date();
        return prisma.announcement.findMany({
            where: {
                isActive: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
            orderBy: [{ createdAt: 'desc' }],
        });
    }

    static async create(data: any) {
        return prisma.announcement.create({ data });
    }

    static async update(id: string, data: any) {
        return prisma.announcement.update({
            where: { id },
            data,
        });
    }

    static async remove(id: string) {
        return prisma.announcement.delete({
            where: { id },
        });
    }
}

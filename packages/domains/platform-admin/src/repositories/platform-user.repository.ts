import { prisma } from '@workspace/db';

export class PlatformUserRepository {
    static async list(page: number, limit: number, search: string, role: string) {
        const skip = (page - 1) * limit;
        const take = limit;

        const where: any = { deletedAt: null };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (role) {
            where.role = role as any;
        }

        return Promise.all([
            prisma.user.findMany({
                where,
                include: { company: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take
            }),
            prisma.user.count({ where })
        ]);
    }

    static async update(id: string, data: any) {
        return prisma.user.update({
            where: { id },
            data
        });
    }
}

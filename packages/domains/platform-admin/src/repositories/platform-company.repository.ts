import { prisma } from '@workspace/db';

export class PlatformCompanyRepository {
    static async list(page: number, limit: number, search: string, status: string) {
        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { adminEmail: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (status) where.subscriptionStatus = status;

        return Promise.all([
            prisma.company.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.company.count({ where }),
        ]);
    }

    static async findById(id: string) {
        return prisma.company.findUnique({
            where: { id },
        });
    }

    static async findSubscriptions(companyId: string) {
        return prisma.subscription.findMany({
            where: { companyId },
            include: {
                plan: { select: { id: true, planName: true, price: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });
    }

    static async update(id: string, data: any) {
        return prisma.company.update({
            where: { id },
            data,
        });
    }

    static async updateAdminPassword(adminEmail: string, hashed: string) {
        return prisma.user.updateMany({
            where: { email: adminEmail },
            data: { password: hashed },
        });
    }

    static async create(data: any) {
        return prisma.company.create({ data });
    }

    static async listAll() {
        return prisma.company.findMany();
    }
}

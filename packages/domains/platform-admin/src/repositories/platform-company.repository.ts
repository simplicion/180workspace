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

    static async getCompanyDetailed(id: string) {
        const [
            company,
            users,
            subscriptions,
            paymentHistories,
            projectsCount,
            tasksCount,
            documentsCount,
            assetsCount,
            clientsCount,
            trafficLinksCount,
            formsCount,
            ticketsCount,
            activityLogs
        ] = await Promise.all([
            prisma.company.findUnique({ where: { id } }),
            prisma.user.findMany({
                where: { companyId: id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                    position: true,
                    department: true,
                    isActive: true,
                    photoUrl: true,
                    image: true,
                    createdAt: true,
                    joinDate: true,
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.subscription.findMany({
                where: { companyId: id },
                include: {
                    plan: true
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.paymentHistory.findMany({
                where: { companyId: id },
                orderBy: { createdAt: 'desc' },
                take: 25
            }),
            prisma.project.count({ where: { companyId: id } }).catch(() => 0),
            prisma.task.count({ where: { companyId: id } }).catch(() => 0),
            prisma.document.count({ where: { companyId: id } }).catch(() => 0),
            prisma.asset.count({ where: { companyId: id } }).catch(() => 0),
            prisma.client.count({ where: { companyId: id } }).catch(() => 0),
            prisma.trafficLink.count({ where: { companyId: id } }).catch(() => 0),
            prisma.form.count({ where: { companyId: id } }).catch(() => 0),
            prisma.supportTicket.count({ where: { companyId: id } }).catch(() => 0),
            prisma.teamActivityLog.findMany({
                where: { companyId: id },
                orderBy: { createdAt: 'desc' },
                take: 20
            }).catch(() => [])
        ]);

        if (!company) return null;

        // Calculate storage estimation from documents
        let storageUsedMb = 0;
        try {
            const docs = await prisma.document.findMany({
                where: { companyId: id },
                select: { size: true }
            });
            const totalBytes = docs.reduce((acc, doc) => acc + (Number(doc.size) || 0), 0);
            storageUsedMb = Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
        } catch {}

        return {
            company: {
                ...company,
                companyName: company.name || (company as any).companyName || 'Unnamed Company',
            },
            users,
            subscriptions,
            paymentHistories,
            stats: {
                usersCount: users.length,
                projectsCount,
                tasksCount,
                documentsCount,
                assetsCount,
                clientsCount,
                trafficLinksCount,
                formsCount,
                ticketsCount,
                storageUsedMb,
            },
            activityLogs
        };
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

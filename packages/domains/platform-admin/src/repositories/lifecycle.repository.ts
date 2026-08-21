import { prisma } from '@workspace/db';

export class LifecycleRepository {
    static async getPlatformSettings() {
        return prisma.platformSettings.findFirst();
    }

    static async updateCompany(id: string, data: any) {
        return prisma.company.update({
            where: { id },
            data
        });
    }

    static async findCompanies(where: any) {
        return prisma.company.findMany({ where });
    }

    static async findCompanyById(id: string) {
        return prisma.company.findUnique({ where: { id } });
    }

    static async safeDeleteModels(companyId: string, modelsToClean: string[]) {
        let recordsDeleted: any = {};
        for (const modelName of modelsToClean) {
            const prismaModel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
            if ((prisma as any)[prismaModel]) {
                const count = await (prisma as any)[prismaModel].count({ where: { companyId } });
                await (prisma as any)[prismaModel].deleteMany({ where: { companyId } });
                recordsDeleted[modelName] = count;
            }
        }
        return recordsDeleted;
    }

    static async createDeletionLog(data: any) {
        return prisma.deletionLog.create({ data });
    }

    static async fullDeleteCompany(companyId: string) {
        await prisma.user.deleteMany({ where: { companyId } });
        await prisma.subscription.deleteMany({ where: { companyId } });
        await prisma.paymentHistory.deleteMany({ where: { companyId } });
        await prisma.company.delete({ where: { id: companyId } });
    }

    // Temporary helper for legacy services that require the raw prisma client
    static getRawPrismaClient() {
        return prisma;
    }
}

import { prisma } from '@workspace/db';

export class FeatureFlagRepository {
    static async list() {
        return prisma.featureFlag.findMany({
            orderBy: [{ name: 'asc' }]
        });
    }

    static async createMany(data: any[]) {
        return prisma.featureFlag.createMany({ data });
    }

    static async create(data: any) {
        return prisma.featureFlag.create({ data });
    }

    static async findById(id: string) {
        return prisma.featureFlag.findUnique({ where: { id } });
    }

    static async update(id: string, data: any) {
        return prisma.featureFlag.update({
            where: { id },
            data
        });
    }

    static async remove(id: string) {
        return prisma.featureFlag.delete({ where: { id } });
    }
}

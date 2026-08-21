import { prisma } from '@workspace/db';

export class PlatformPlanRepository {
    static async list() {
        return prisma.plan.findMany({
            orderBy: { price: 'asc' }
        });
    }
}

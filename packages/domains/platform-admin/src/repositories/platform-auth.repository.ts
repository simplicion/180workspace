import { prisma } from '@workspace/db';

export class PlatformAuthRepository {
    static async findByEmail(email: string) {
        return prisma.superAdmin.findUnique({
            where: { email: email.toLowerCase() }
        });
    }

    static async findByEmailExcludingId(email: string, adminId: string) {
        return prisma.superAdmin.findFirst({
            where: {
                email: email.toLowerCase(),
                id: { not: adminId }
            }
        });
    }

    static async findById(id: string) {
        return prisma.superAdmin.findUnique({
            where: { id }
        });
    }

    static async update(id: string, data: any) {
        return prisma.superAdmin.update({
            where: { id },
            data
        });
    }
}

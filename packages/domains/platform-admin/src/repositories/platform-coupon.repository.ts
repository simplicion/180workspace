import { prisma } from '@workspace/db';

export class PlatformCouponRepository {
    static async list() {
        return prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    static async create(data: any) {
        return prisma.coupon.create({ data });
    }

    static async update(id: string, data: any) {
        return prisma.coupon.update({
            where: { id },
            data
        });
    }

    static async remove(id: string) {
        return prisma.coupon.delete({ where: { id } });
    }

    static async findById(id: string) {
        return prisma.coupon.findUnique({ where: { id } });
    }

    static async findByCode(code: string) {
        return prisma.coupon.findUnique({ 
            where: { couponCode: code.toUpperCase() } 
        });
    }
}

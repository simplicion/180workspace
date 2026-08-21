import { PlatformCouponRepository } from '../repositories/platform-coupon.repository';

export class PlatformCouponService {
    static async list() {
        return await PlatformCouponRepository.list();
    }

    static async create(data: any, adminId: string) {
        return await PlatformCouponRepository.create({ 
            ...data, 
            couponCode: data.couponCode?.toUpperCase(), 
            createdBy: adminId 
        });
    }

    static async update(id: string, data: any) {
        return await PlatformCouponRepository.update(id, data);
    }

    static async remove(id: string) {
        await PlatformCouponRepository.remove(id);
        return true;
    }

    static async toggle(id: string) {
        const coupon = await PlatformCouponRepository.findById(id);
        if (!coupon) throw new Error('Coupon not found');
        
        return await PlatformCouponRepository.update(id, { isActive: !coupon.isActive });
    }

    static async validate(code: string) {
        const coupon = await PlatformCouponRepository.findByCode(code);
        
        if (!coupon) throw new Error('Coupon not found');
        
        let valid = true;
        let reason = '';
        
        if (!coupon.isActive) {
            valid = false;
            reason = 'Coupon is not active';
        } else if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            valid = false;
            reason = 'Coupon has expired';
        } else if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            valid = false;
            reason = 'Coupon usage limit reached';
        }

        return { valid, reason, coupon: valid ? coupon : undefined };
    }
}

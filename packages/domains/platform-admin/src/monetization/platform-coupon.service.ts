import { PlatformCouponRepository } from '../repositories/platform-coupon.repository';

export class PlatformCouponService {
    static async list() {
        return await PlatformCouponRepository.list();
    }

    static async create(data: any, adminId?: string) {
        const payload: any = {
            couponCode: (data.couponCode || data.code)?.trim().toUpperCase(),
            discountType: data.discountType || data.type || 'percentage',
            discountValue: Number(data.discountValue),
            maxUses: (data.maxUses !== undefined && data.maxUses !== null && data.maxUses !== '') ? Number(data.maxUses) : null,
            expiresAt: (data.expiresAt || data.expiryDate) ? new Date(data.expiresAt || data.expiryDate) : null,
            isActive: data.isActive !== undefined ? Boolean(data.isActive) : true
        };

        return await PlatformCouponRepository.create(payload);
    }

    static async update(id: string, data: any) {
        const payload: any = {};
        if (data.couponCode || data.code) payload.couponCode = (data.couponCode || data.code).trim().toUpperCase();
        if (data.discountType || data.type) payload.discountType = data.discountType || data.type;
        if (data.discountValue !== undefined) payload.discountValue = Number(data.discountValue);
        if (data.maxUses !== undefined) payload.maxUses = (data.maxUses !== null && data.maxUses !== '') ? Number(data.maxUses) : null;
        if (data.expiresAt !== undefined || data.expiryDate !== undefined) {
            const exp = data.expiresAt ?? data.expiryDate;
            payload.expiresAt = exp ? new Date(exp) : null;
        }
        if (data.isActive !== undefined) payload.isActive = Boolean(data.isActive);

        return await PlatformCouponRepository.update(id, payload);
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

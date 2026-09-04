import { z } from 'zod';

export const createCouponSchema = z.object({
    body: z.object({
        couponCode: z.string().min(1, 'Coupon code is required').optional(),
        code: z.string().min(1, 'Coupon code is required').optional(),
        discountType: z.enum(['percentage', 'fixed']).optional(),
        type: z.enum(['percentage', 'fixed']).optional(),
        discountValue: z.number().positive('Discount value must be positive'),
        maxUses: z.number().int().nonnegative().optional().nullable(),
        expiresAt: z.string().optional().nullable(),
        expiryDate: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        isActive: z.boolean().optional()
    }).refine(data => data.couponCode || data.code, {
        message: 'Coupon code is required',
        path: ['couponCode']
    })
});

export const updateCouponSchema = z.object({
    body: z.object({
        couponCode: z.string().min(1).optional(),
        code: z.string().min(1).optional(),
        discountType: z.enum(['percentage', 'fixed']).optional(),
        type: z.enum(['percentage', 'fixed']).optional(),
        discountValue: z.number().positive().optional(),
        maxUses: z.number().int().nonnegative().optional().nullable(),
        expiresAt: z.string().optional().nullable(),
        expiryDate: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        isActive: z.boolean().optional()
    })
});

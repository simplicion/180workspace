import { z } from 'zod';

export const createCouponSchema = z.object({
    body: z.object({
        code: z.string().min(1, 'Coupon code is required'),
        type: z.enum(['percentage', 'fixed']),
        discountValue: z.number().positive(),
        maxUses: z.number().int().nonnegative().optional().nullable(),
        expiryDate: z.string().optional().nullable()
    })
});

export const updateCouponSchema = z.object({
    body: z.object({
        type: z.enum(['percentage', 'fixed']).optional(),
        discountValue: z.number().positive().optional(),
        maxUses: z.number().int().nonnegative().optional().nullable(),
        expiryDate: z.string().optional().nullable()
    })
});

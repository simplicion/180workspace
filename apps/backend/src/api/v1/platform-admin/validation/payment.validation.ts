import { z } from 'zod';

export const updatePaymentConfigSchema = z.object({
    body: z.object({
        razorpayKeyId: z.string().optional(),
        razorpayKeySecret: z.string().optional(),
        currency: z.string().optional(),
        paymentGateway: z.string().optional()
    }) // Note: actual fields may vary depending on what PlatformPaymentService.updateConfig expects. It will take the whole body and update.
});

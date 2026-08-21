import { z } from 'zod';

export const listSubscriptionsSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        status: z.string().optional()
    })
});

export const cancelSubscriptionSchema = z.object({
    body: z.object({
        reason: z.string().optional()
    })
});

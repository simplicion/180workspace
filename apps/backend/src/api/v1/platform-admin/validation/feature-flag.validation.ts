import { z } from 'zod';

export const createFeatureFlagSchema = z.object({
    body: z.object({
        key: z.string().min(1, 'Key is required'),
        description: z.string().optional(),
        isEnabled: z.boolean().optional()
    })
});

import { z } from 'zod';

export const createFeatureFlagSchema = z.object({
    body: z.object({
        name: z.string().optional(),
        key: z.string().optional(),
        description: z.string().optional(),
        isEnabled: z.boolean().optional()
    }).refine(data => !!(data.name || data.key), {
        message: 'Name or key is required',
        path: ['name']
    })
});


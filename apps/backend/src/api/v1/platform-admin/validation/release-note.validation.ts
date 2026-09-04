import { z } from 'zod';

export const createReleaseNoteSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required'),
        content: z.string().optional(),
        description: z.string().optional(),
        features: z.array(z.any()).optional(),
        fixes: z.array(z.any()).optional(),
        version: z.string().optional(),
        isPublished: z.boolean().optional(),
        type: z.enum(['feature', 'bugfix', 'improvement', 'other']).optional()
    }).passthrough()
});

export const updateReleaseNoteSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        content: z.string().optional(),
        description: z.string().optional(),
        features: z.array(z.any()).optional(),
        fixes: z.array(z.any()).optional(),
        version: z.string().optional(),
        isPublished: z.boolean().optional(),
        type: z.enum(['feature', 'bugfix', 'improvement', 'other']).optional()
    }).passthrough()
});

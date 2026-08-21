import { z } from 'zod';

export const createReleaseNoteSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required'),
        content: z.string().min(1, 'Content is required'),
        version: z.string().optional(),
        isPublished: z.boolean().optional(),
        type: z.enum(['feature', 'bugfix', 'improvement', 'other']).optional()
    })
});

export const updateReleaseNoteSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        content: z.string().optional(),
        version: z.string().optional(),
        isPublished: z.boolean().optional(),
        type: z.enum(['feature', 'bugfix', 'improvement', 'other']).optional()
    })
});

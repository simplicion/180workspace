import { z } from 'zod';

export const SupportValidation = {
    createTicket: z.object({
        subject: z.string(),
        description: z.string(),
        priority: z.string().optional(),
        category: z.string().optional()
    }).passthrough(),
    createQuickReport: z.object({
        description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional(),
        message: z.string().max(5000).optional(),
        category: z.string().optional(),
        priority: z.string().optional(),
        subject: z.string().optional(),
        routeUrl: z.string().optional(),
        attachments: z.array(z.any()).optional(),
        metadata: z.record(z.string(), z.any()).optional()
    }).passthrough(),
    addReply: z.object({
        text: z.string()
    }),
    editTicket: z.object({
        subject: z.string().optional(),
        description: z.string().optional(),
        priority: z.string().optional(),
        category: z.string().optional()
    }).passthrough()
};

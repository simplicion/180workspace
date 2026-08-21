import { z } from 'zod';

export const SupportValidation = {
    createTicket: z.object({
        subject: z.string(),
        description: z.string(),
        priority: z.string().optional(),
        category: z.string().optional()
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

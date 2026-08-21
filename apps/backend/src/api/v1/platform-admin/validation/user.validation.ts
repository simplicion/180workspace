import { z } from 'zod';

export const listUsersSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        search: z.string().optional(),
        role: z.string().optional()
    })
});

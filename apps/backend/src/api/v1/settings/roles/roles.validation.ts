import { z } from 'zod';

export const RolesValidation = {
    bulkUpdate: z.object({
        userId: z.string(),
        role: z.string().optional(),
        permissions: z.array(z.string()).optional()
    })
};

import { z } from 'zod';

export const UserValidation = {
    updateUser: z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        role: z.string().optional(),
        status: z.string().optional()
    }).passthrough()
};

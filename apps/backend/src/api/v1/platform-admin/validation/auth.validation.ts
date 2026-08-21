import { z } from 'zod';

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(1, 'Password is required')
    })
});

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().optional(),
        email: z.string().email('Invalid email address')
    })
});

export const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(8, 'New password must be at least 8 characters')
    })
});

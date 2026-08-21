import { z } from 'zod';

export const createAnnouncementSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required'),
        content: z.string().min(1, 'Content is required'),
        type: z.enum(['info', 'warning', 'success', 'error', 'feature', 'maintenance', 'general']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        status: z.enum(['draft', 'active', 'inactive', 'scheduled']).optional(),
        targetAudience: z.enum(['all', 'admins', 'users', 'specific_companies']).optional(),
        targetCompanies: z.array(z.string()).optional(),
        scheduledFor: z.string().optional().nullable(),
        expiresAt: z.string().optional().nullable(),
        actionUrl: z.string().optional().nullable(),
        actionText: z.string().optional().nullable()
    })
});

export const updateAnnouncementSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        content: z.string().optional(),
        type: z.enum(['info', 'warning', 'success', 'error', 'feature', 'maintenance', 'general']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        status: z.enum(['draft', 'active', 'inactive', 'scheduled']).optional(),
        targetAudience: z.enum(['all', 'admins', 'users', 'specific_companies']).optional(),
        targetCompanies: z.array(z.string()).optional(),
        scheduledFor: z.string().optional().nullable(),
        expiresAt: z.string().optional().nullable(),
        actionUrl: z.string().optional().nullable(),
        actionText: z.string().optional().nullable()
    })
});

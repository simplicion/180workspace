import { z } from 'zod';

export const updateSettingsSchema = z.object({
    body: z.object({
        platformName: z.string().optional(),
        maintenanceMode: z.boolean().optional(),
        supportEmail: z.string().email().optional(),
        companyPhone: z.string().optional(),
        themeColor: z.string().optional(),
        currency: z.string().optional(),
        logoUrl: z.string().optional(),
        faviconUrl: z.string().optional()
    }) // update with actual settings fields
});

export const testEmailSchema = z.object({
    body: z.object({
        to: z.string().email('Invalid email address')
    })
});

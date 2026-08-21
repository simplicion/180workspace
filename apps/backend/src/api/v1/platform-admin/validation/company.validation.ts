import { z } from 'zod';

export const listCompaniesSchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        search: z.string().optional(),
        status: z.string().optional()
    })
});

export const suspendCompanySchema = z.object({
    body: z.object({
        reason: z.string().optional()
    })
});

export const deleteCompanyConfirmSchema = z.object({
    body: z.object({
        confirm: z.literal('DELETE')
    })
});

export const bulkDeleteCompanySchema = z.object({
    body: z.object({
        companyIds: z.array(z.string()).min(1, 'No companies selected'),
        confirm: z.literal('DELETE')
    })
});

export const resetAdminPasswordSchema = z.object({
    body: z.object({
        newPassword: z.string().min(8, 'New password must be at least 8 characters')
    })
});

export const createCompanySchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Company name is required'),
        email: z.string().email('Invalid email address'),
        adminName: z.string().optional(),
        password: z.string().optional(),
        planId: z.string().optional(),
        country: z.string().optional()
    })
});

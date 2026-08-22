import { prisma } from '@workspace/db';
import { PrismaClient } from '@workspace/db';
import { BillingService } from '@workspace/platform-billing';

const REQUIRED_MODULES = ['work-logs', 'projects', 'tasks'];
const REQUIRED_APPS = ['tools', 'projects', 'crm', 'hr', 'finance'];

export class CompanyConfigService {
    static async getCompanyConfig(companyId: string) {
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            throw new Error('Company not found');
        }

        let metadata: any = company.metadata || {};
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
        }
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
        }
        const safeCompany: any = { ...company };
        delete safeCompany.adminPasswordHash;
        
        const config: any = {
            ...safeCompany,
            companyId: company.id,
            companyName: company.name,
            companyEmail: company.adminEmail,
            companyLogo: company.logoUrl,
            enabledApps: metadata.enabledApps || [],
            enabledModules: metadata.enabledModules || [],
            ...metadata
        };

        const missingApps = REQUIRED_APPS.filter(a => !config.enabledApps?.includes(a));
        const missingModules = REQUIRED_MODULES.filter(m => !config.enabledModules?.includes(m));

        if (missingApps.length > 0 || missingModules.length > 0) {
            const updatedApps = Array.from(new Set([...(config.enabledApps || []), ...missingApps]));
            const updatedModules = Array.from(new Set([...(config.enabledModules || []), ...missingModules]));
            await prisma.company.update({
                where: { id: companyId },
                data: {
                    metadata: {
                        ...metadata,
                        enabledApps: updatedApps,
                        enabledModules: updatedModules
                    }
                }
            });
            config.enabledApps = updatedApps;
            config.enabledModules = updatedModules;
        }

        return config;
    }

    static async updateCompanyConfig(companyId: string, updateData: any) {
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            throw new Error('Company not found');
        }

        let metadata: any = company.metadata || {};
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
        }
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
        }

        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: {
                name: updateData.companyName !== undefined ? updateData.companyName : company.name,
                logoUrl: updateData.companyLogo !== undefined ? updateData.companyLogo : company.logoUrl,
                currency: updateData.currency !== undefined ? updateData.currency : company.currency,
                currencySymbol: updateData.currencySymbol !== undefined ? updateData.currencySymbol : company.currencySymbol,
                metadata: {
                    ...metadata,
                    ...updateData
                }
            }
        });

        const safeCompany: any = { ...updatedCompany };
        delete safeCompany.adminPasswordHash;

        const config = {
            ...safeCompany,
            companyId: updatedCompany.id,
            companyName: updatedCompany.name,
            companyEmail: updatedCompany.adminEmail,
            companyLogo: updatedCompany.logoUrl,
            enabledApps: (updatedCompany.metadata as any)?.enabledApps || [],
            enabledModules: (updatedCompany.metadata as any)?.enabledModules || [],
            ...(updatedCompany.metadata as any)
        };

        return { config, updatedCompany };
    }

    static async updateEnabledApps(companyId: string, apps: string[]) {
        if (!Array.isArray(apps)) {
            throw new Error('Apps must be an array');
        }

        const limits = await BillingService.getSubscriptionLimits(companyId);
        if (limits && apps.length > limits.maxApps) {
            throw new Error(`Your current plan limits you to a maximum of ${limits.maxApps} apps. Please upgrade your plan to activate more apps.`);
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            throw new Error('Company not found');
        }

        let metadata: any = company.metadata || {};
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
        }
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
        }

        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: {
                metadata: {
                    ...metadata,
                    enabledApps: apps
                }
            }
        });

        const config = {
            id: updatedCompany.id,
            companyId: updatedCompany.id,
            companyName: updatedCompany.name,
            companyEmail: updatedCompany.adminEmail,
            companyLogo: updatedCompany.logoUrl,
            enabledApps: (updatedCompany.metadata as any)?.enabledApps || [],
            enabledModules: (updatedCompany.metadata as any)?.enabledModules || []
        };

        return { config, updatedCompany };
    }

    static async updateEnabledModules(companyId: string, modules: string[]) {
        if (!Array.isArray(modules)) {
            throw new Error('Modules must be an array');
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            throw new Error('Company not found');
        }

        let metadata: any = company.metadata || {};
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
        }
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
        }

        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: {
                metadata: {
                    ...metadata,
                    enabledModules: modules
                }
            }
        });

        const config = {
            id: updatedCompany.id,
            companyId: updatedCompany.id,
            companyName: updatedCompany.name,
            companyEmail: updatedCompany.adminEmail,
            companyLogo: updatedCompany.logoUrl,
            enabledApps: (updatedCompany.metadata as any)?.enabledApps || [],
            enabledModules: (updatedCompany.metadata as any)?.enabledModules || []
        };

        return { config, updatedCompany };
    }
}

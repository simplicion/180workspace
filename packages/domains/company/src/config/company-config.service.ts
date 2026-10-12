import { prisma, requestContext } from '@workspace/db';
import { PrismaClient } from '@workspace/db';
import { SubscriptionService } from '@workspace/platform-billing';

const REQUIRED_MODULES = ['work-logs', 'projects', 'tasks'];
const REQUIRED_APPS = ['tools', 'projects', 'crm', 'hr', 'finance'];

export class CompanyConfigService {
    static async getCompanyConfig(targetCompanyId?: string) {
        const companyId = targetCompanyId || (requestContext.getStore()?.companyId as string);
        if (!companyId) {
            throw new Error('Company ID is required');
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
        const safeCompany: any = { ...company };
        delete safeCompany.adminPasswordHash;
        
        const DEFAULT_CORE_APPS = ['system', 'settings', 'projects', 'workspace-tools', 'communications'];
        const existingApps = Array.isArray(metadata.enabledApps) ? metadata.enabledApps : [];
        const mergedApps = Array.from(new Set([...existingApps, ...DEFAULT_CORE_APPS]));

        const DEFAULT_CORE_MODULES = [
            'projects', 'tasks', 'calendar', 'documents', 'document-editor',
            'assets', 'forms', 'company-hub', 'orbit-copilot',
            'chat', 'meeting', 'emails', 'work-logs', 'activity'
        ];
        const existingModules = Array.isArray(metadata.enabledModules) ? metadata.enabledModules : [];
        const mergedModules = Array.from(new Set([...existingModules, ...DEFAULT_CORE_MODULES]));

        const config: any = {
            ...safeCompany,
            companyId: company.id,
            companyName: company.name,
            companyEmail: company.adminEmail,
            companyLogo: company.logoUrl,
            enabledApps: mergedApps,
            enabledModules: mergedModules,
            ...metadata
        };

        // Ensure default core apps and modules are always persisted in metadata
        if (mergedApps.length !== existingApps.length || mergedModules.length !== existingModules.length) {
            await prisma.company.update({
                where: { id: companyId },
                data: {
                    metadata: {
                        ...metadata,
                        enabledApps: mergedApps,
                        enabledModules: mergedModules
                    }
                }
            });
        }

        return config;
    }

    static async updateCompanyConfig(updateData: any, targetCompanyId?: string) {
        const companyId = targetCompanyId || (requestContext.getStore()?.companyId as string);
        if (!companyId) {
            throw new Error('Company ID is required');
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

        const safeUpdateData = { ...updateData };
        delete safeUpdateData.enabledApps;
        delete safeUpdateData.enabledModules;

        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: {
                name: updateData.companyName !== undefined ? updateData.companyName : company.name,
                logoUrl: updateData.companyLogo !== undefined ? updateData.companyLogo : company.logoUrl,
                currency: updateData.currency !== undefined ? updateData.currency : company.currency,
                currencySymbol: updateData.currencySymbol !== undefined ? updateData.currencySymbol : company.currencySymbol,
                metadata: {
                    ...metadata,
                    ...safeUpdateData
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

    static async updateEnabledApps(apps: string[], targetCompanyId?: string) {
        const companyId = targetCompanyId || (requestContext.getStore()?.companyId as string);
        if (!companyId) {
            throw new Error('Company ID is required');
        }
        if (!Array.isArray(apps)) {
            throw new Error('Apps must be an array');
        }

        // Core platform apps that are always active by default and cannot be removed
        const DEFAULT_CORE_APPS = ['system', 'projects', 'workspace-tools', 'communications'];

        const currentSubscription = await prisma.subscription.findFirst({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: { plan: true }
        });
        const isTrial = currentSubscription?.status?.toLowerCase() === 'trial';
        const planPrice = Number(currentSubscription?.plan?.price ?? 0);
        const planName = (currentSubscription?.plan?.planName || '').toLowerCase();
        const isPaid = isTrial || (String(currentSubscription?.status).toUpperCase() === 'ACTIVE' && planPrice > 0);

        let finalApps: string[] = [];

        if (!isPaid) {
            // Free plan: Only default apps are permitted. No other apps could be accessed.
            const attemptedPremiumApps = apps.filter(a => !DEFAULT_CORE_APPS.includes(a) && a !== 'settings');
            if (attemptedPremiumApps.length > 0) {
                throw new Error('Your workspace is on the 180 Free Starter plan, which only includes default apps (Projects, Workspace Tools, Communications). Upgrade to 180 Momentum or Limitless to enable additional apps.');
            }
            finalApps = [...DEFAULT_CORE_APPS];
        } else {
            // Paid Plan or 15-day Free Trial:
            const isMomentum = planName.includes('momentum') || planPrice === 17;
            if (isMomentum) {
                // Momentum allows up to 8 apps (Projects, Workspace Tools, Communications, CRM, Finance, Web Builder, Voice Force, plus system)
                const MOMENTUM_ALLOWED_APPS = [
                    ...DEFAULT_CORE_APPS,
                    'crm',
                    'finance',
                    'advertising',
                    'website-builder',
                    'settings'
                ];
                const disallowedApps = apps.filter(a => !MOMENTUM_ALLOWED_APPS.includes(a));
                if (disallowedApps.length > 0) {
                    throw new Error(`The app "${disallowedApps.join(', ')}" requires the 180 Limitless plan ($20/mo). Please upgrade to activate all platform apps.`);
                }
            }
            // Always ensure default apps remain enabled
            finalApps = Array.from(new Set([...apps, ...DEFAULT_CORE_APPS]));
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
                    enabledApps: finalApps
                }
            }
        });

        const config = {
            id: updatedCompany.id,
            companyId: updatedCompany.id,
            companyName: updatedCompany.name,
            companyEmail: updatedCompany.adminEmail,
            companyLogo: updatedCompany.logoUrl,
            enabledApps: (updatedCompany.metadata as any)?.enabledApps || finalApps,
            enabledModules: (updatedCompany.metadata as any)?.enabledModules || []
        };

        return { config, updatedCompany };
    }

    static async updateEnabledModules(modules: string[], targetCompanyId?: string) {
        const companyId = targetCompanyId || (requestContext.getStore()?.companyId as string);
        if (!companyId) {
            throw new Error('Company ID is required');
        }
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

        // Always keep core modules active
        const DEFAULT_CORE_MODULES = ['projects', 'tasks', 'calendar', 'documents', 'chat', 'meeting', 'emails', 'work-logs'];
        const finalModules = Array.from(new Set([...modules, ...DEFAULT_CORE_MODULES]));

        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: {
                metadata: {
                    ...metadata,
                    enabledModules: finalModules
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
            enabledModules: (updatedCompany.metadata as any)?.enabledModules || finalModules
        };

        return { config, updatedCompany };
    }
}

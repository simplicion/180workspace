import { BillingService } from '@workspace/platform-billing';
import { prisma } from '@workspace/db';

/** Every platform app the 180workspace platform offers. Aligned strictly with APPS_CONFIG in frontend/lib/module-map.ts */
export const ALL_PLATFORM_APPS = [
    'system', 'settings',
    'projects', 'communications', 'workspace-tools',
    'crm', 'hr', 'finance', 'advertising', 'website-builder', 'voiceforce'
];

export function isPaidPlanFor(plan: any, currentSubscription: any): boolean {
    const isTrialActive = currentSubscription?.status?.toLowerCase() === 'trial' && 
        (!currentSubscription.trialEndDate || new Date() <= new Date(currentSubscription.trialEndDate));
    
    const isSubscriptionActive = currentSubscription && 
        ['active', 'trial'].includes(currentSubscription.status?.toLowerCase());

    return Boolean(
        isTrialActive ||
        (isSubscriptionActive && plan && Number(plan.price) > 0) ||
        (plan && Number(plan.price) > 0) ||
        (plan && (plan.planName?.toLowerCase().includes('limitless') || plan.planName?.toLowerCase().includes('momentum')))
    );
}

export function getMaxUsersForPlan(plan?: any, subscription?: any): number {
    const isTrial = subscription?.status?.toLowerCase() === 'trial';
    const planName = (plan?.planName || '').toLowerCase();
    const providerPlanId = (plan?.providerPlanId || '').toLowerCase();

    if (isTrial || planName.includes('limitless') || providerPlanId.includes('limitless') || (plan && Number(plan.price) >= 20)) {
        return 20;
    }
    if (planName.includes('momentum') || providerPlanId.includes('momentum') || (plan && Number(plan.price) >= 17)) {
        return 5;
    }
    return plan?.maxUsers && plan.maxUsers > 0 ? plan.maxUsers : 1;
}

export function getMaxProjectsForPlan(plan?: any, subscription?: any): number {
    const isTrial = subscription?.status?.toLowerCase() === 'trial';
    const planName = (plan?.planName || '').toLowerCase();
    const providerPlanId = (plan?.providerPlanId || '').toLowerCase();

    if (isTrial || planName.includes('limitless') || providerPlanId.includes('limitless') || (plan && Number(plan.price) >= 20)) {
        return 20;
    }
    if (planName.includes('momentum') || providerPlanId.includes('momentum') || (plan && Number(plan.price) >= 17)) {
        return 5;
    }
    return 2;
}

export function getMaxStorageBytesForPlan(plan?: any, subscription?: any): number {
    const isTrial = subscription?.status?.toLowerCase() === 'trial';
    const planName = (plan?.planName || '').toLowerCase();
    const providerPlanId = (plan?.providerPlanId || '').toLowerCase();

    if (isTrial || planName.includes('limitless') || providerPlanId.includes('limitless') || (plan && Number(plan.price) >= 20)) {
        return 5 * 1024 * 1024 * 1024; // 5 GB
    }
    if (planName.includes('momentum') || providerPlanId.includes('momentum') || (plan && Number(plan.price) >= 17)) {
        return 1 * 1024 * 1024 * 1024; // 1 GB
    }
    return plan?.maxStorageBytes || (512 * 1024 * 1024); // 512 MB Free
}

export function effectiveEnabledAppsFor(rawEnabledApps: string[], isPaidPlan: boolean, plan?: any, subscription?: any): string[] {
    const systemApps = ['system', 'settings'];
    const defaultApps = ['projects', 'communications', 'workspace-tools'];
    const momentumApps = [...defaultApps, 'crm', 'finance', 'website-builder', 'voiceforce'];
    const allApps = ['projects', 'communications', 'workspace-tools', 'crm', 'hr', 'finance', 'advertising', 'website-builder', 'voiceforce'];

    const isTrial = subscription?.status?.toLowerCase() === 'trial';
    const planName = (plan?.planName || '').toLowerCase();
    const providerPlanId = (plan?.providerPlanId || '').toLowerCase();
    const isLimitless = isTrial || planName.includes('limitless') || providerPlanId.includes('limitless') || (plan && Number(plan.price) >= 20);
    const isMomentum = planName.includes('momentum') || providerPlanId.includes('momentum') || (plan && Number(plan.price) >= 17);

    // If on Free plan or not paid, strictly only default apps (projects, communications, workspace-tools) are accessible
    if (!isPaidPlan && !isTrial) {
        return Array.from(new Set([...systemApps, ...defaultApps]));
    }

    // Limitless or Trial: Full access to all platform apps
    if (isLimitless) {
        return Array.from(new Set([...systemApps, ...allApps]));
    }

    // Momentum: 8 apps (core + CRM, Finance, Website Builder, Voice Force)
    if (isMomentum) {
        return Array.from(new Set([...systemApps, ...momentumApps]));
    }

    // Fallback: Default apps
    return Array.from(new Set([...systemApps, ...defaultApps]));
}

function isDisabledByAdmin(appId: string, disabledApps: string[], flags: Record<string, boolean>): boolean {
    const clean = appId.toLowerCase().trim();
    const snake = clean.replace(/-/g, '_');
    if (disabledApps.includes(clean) || disabledApps.includes(snake) || flags[`app_${snake}`] === false || flags[clean] === false) {
        return true;
    }
    if (clean === 'advertising' || clean === 'website-builder' || clean === 'ad-websites') {
        if (disabledApps.includes('advertising') || disabledApps.includes('website-builder') || disabledApps.includes('ad-websites')) return true;
        if (flags['app_advertising'] === false || flags['advertising'] === false) return true;
        if (flags['app_website_builder'] === false || flags['website-builder'] === false) return true;
        if (flags['app_ad_websites'] === false || flags['ad-websites'] === false) return true;
    }
    return false;
}

/**
 * The same entitlement answer the web client derives from GET /api/billing + GET /api/feature-flags, computed server-side
 * for one company so native clients get it in a single call. Always scoped to the caller's own companyId.
 */
export async function computeEntitlements(companyId: string) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return null;

    const currentSubscription: any = await BillingService.getActiveSubscription(companyId);
    let plan: any = currentSubscription?.planId ? await prisma.plan.findUnique({ where: { id: currentSubscription.planId } }) : null;
    if (!plan) plan = await prisma.plan.findFirst({ where: { price: 0 } });

    let meta: any = company.metadata || {};
    if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch { meta = {}; }
    }
    const rawEnabledApps: string[] = Array.isArray(meta.enabledApps) ? meta.enabledApps : [];
    const enabledModules: string[] = Array.isArray(meta.enabledModules) ? meta.enabledModules : [];

    const isPaidPlan = isPaidPlanFor(plan, currentSubscription);
    const enabledApps = effectiveEnabledAppsFor(rawEnabledApps, isPaidPlan, plan, currentSubscription);

    const maxUsers = getMaxUsersForPlan(plan, currentSubscription);
    const maxProjects = getMaxProjectsForPlan(plan, currentSubscription);
    const maxStorageBytes = getMaxStorageBytesForPlan(plan, currentSubscription);

    // Superadmin kill-switch (same source as the web's settings-context). Not tenant data: platform-wide flags.
    const { FeatureFlagService } = require('@workspace/platform-admin');
    const appFlags = await FeatureFlagService.getAppFlags();
    const flags: Record<string, boolean> = appFlags?.flags || {};
    const disabledApps: string[] = appFlags?.disabledApps || [];

    return {
        subscriptionStatus: currentSubscription?.status || company.subscriptionStatus || null,
        trialEndDate: company.trialEndDate || null,
        plan: plan ? { id: plan.id, planName: plan.planName, price: Number(plan.price) } : null,
        isPaidPlan,
        enabledApps,
        enabledModules,
        maxUsers,
        maxProjects,
        maxStorageBytes,
        disabledByAdmin: disabledApps,
        /** What the client should actually show: enabled for this company AND not killed by the platform admin. */
        availableApps: enabledApps.filter((a) => !isDisabledByAdmin(a, disabledApps, flags)),
    };
}

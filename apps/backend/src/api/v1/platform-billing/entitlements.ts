import { BillingService } from '@workspace/platform-billing';
import { prisma } from '@workspace/db';

/** Every platform app the 180workspace platform offers. Aligned strictly with APPS_CONFIG in frontend/lib/module-map.ts */
export const ALL_PLATFORM_APPS = [
    'system', 'settings',
    'projects', 'communications', 'workspace-tools',
    'crm', 'hr', 'finance', 'advertising', 'voiceforce'
];

export function isPaidPlanFor(plan: any, currentSubscription: any): boolean {
    return Boolean(
        (plan && Number(plan.price) > 0) ||
        (currentSubscription && currentSubscription.status?.toUpperCase() === 'ACTIVE' && plan && Number(plan.price) > 0) ||
        (plan && (plan.planName?.toLowerCase().includes('limitless') || plan.planName?.toLowerCase().includes('momentum')))
    );
}

export function effectiveEnabledAppsFor(rawEnabledApps: string[], isPaidPlan: boolean, plan?: any): string[] {
    const validPlatformApps = ['projects', 'communications', 'workspace-tools', 'crm', 'hr', 'finance', 'advertising', 'voiceforce'];
    const systemApps = ['system', 'settings'];

    // If on unlimited plan (Limitless or maxApps >= 999 or -1), unlock all 8 platform apps
    const isUnlimited = plan && (plan.maxApps === -1 || plan.maxApps >= 999 || plan.planName?.toLowerCase().includes('limitless'));
    if (isPaidPlan && isUnlimited) {
        return Array.from(new Set([...systemApps, ...validPlatformApps]));
    }

    // Default core apps always available in 180workspace
    const defaultApps = ['projects', 'communications', 'workspace-tools'];
    
    // Sanitize rawEnabledApps to only valid platform apps + system apps
    const sanitizedRaw = (rawEnabledApps || []).filter(a => validPlatformApps.includes(a) || systemApps.includes(a));
    const merged = Array.from(new Set([...systemApps, ...defaultApps, ...sanitizedRaw]));

    // Determine plan maxApps limit (e.g. Kickstart: 5, Momentum: 7)
    const maxApps = plan?.maxApps && plan.maxApps !== -1 && plan.maxApps < 999 ? plan.maxApps : validPlatformApps.length;
    
    // Separate system and non-system apps to ensure system apps don't consume seat quotas
    const nonSystem = merged.filter(a => !systemApps.includes(a));
    const capped = nonSystem.slice(0, maxApps);

    return Array.from(new Set([...systemApps, ...capped]));
}

function isDisabledByAdmin(appId: string, disabledApps: string[], flags: Record<string, boolean>): boolean {
    const clean = appId.toLowerCase().trim();
    const snake = clean.replace(/-/g, '_');
    return disabledApps.includes(clean) || disabledApps.includes(snake) || flags[`app_${snake}`] === false || flags[clean] === false;
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
    const enabledApps = effectiveEnabledAppsFor(rawEnabledApps, isPaidPlan, plan);

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
        disabledByAdmin: disabledApps,
        /** What the client should actually show: enabled for this company AND not killed by the platform admin. */
        availableApps: enabledApps.filter((a) => !isDisabledByAdmin(a, disabledApps, flags)),
    };
}

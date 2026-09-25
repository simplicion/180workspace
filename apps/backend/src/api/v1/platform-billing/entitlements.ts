import { BillingService } from '@workspace/platform-billing';
import { prisma } from '@workspace/db';

/** Every platform app a paid plan unlocks. Mirrors the list the web client (lib/useSubscription.ts) uses. */
export const ALL_PLATFORM_APPS = [
    'system', 'settings', 'projects', 'communications', 'workspace-tools',
    'crm', 'hr', 'finance', 'insights', 'analytics', 'advertising',
    'social-media', 'traffic-director', 'voiceforce', 'media-editor', 'ai', 'storage', 'database', 'google-integrations'
];

export function isPaidPlanFor(plan: any, currentSubscription: any): boolean {
    return Boolean(
        (plan && Number(plan.price) > 0) ||
        (currentSubscription && currentSubscription.status?.toUpperCase() === 'ACTIVE' && plan && Number(plan.price) > 0) ||
        (plan && (plan.planName?.toLowerCase().includes('limitless') || plan.planName?.toLowerCase().includes('momentum')))
    );
}

export function effectiveEnabledAppsFor(rawEnabledApps: string[], isPaidPlan: boolean): string[] {
    return isPaidPlan ? Array.from(new Set([...rawEnabledApps, ...ALL_PLATFORM_APPS])) : rawEnabledApps;
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
    const enabledApps = effectiveEnabledAppsFor(rawEnabledApps, isPaidPlan);

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

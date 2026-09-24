import { Request, Response, NextFunction } from 'express';
import { prisma } from '@workspace/db';
import { sanitizeUser } from '../../../../system-configs/utils/sanitize-user';
import { getCache, setCache } from '../../../../system-configs/utils/redis';
import { FeatureFlagService } from '@workspace/platform-admin';

function getCurrencySymbol(currencyCode: string): string {
    try {
        return (0).toLocaleString('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).replace(/\d/g, '').trim();
    } catch (e) {
        return currencyCode;
    }
}

/**
 * GET /api/init
 * 
 * Merged endpoint that returns ALL data the frontend needs on initial load
 * in a single round-trip.
 */
export const getInit = async (req: Request | any, res: Response, next: NextFunction) => {
    try {
        const userId = req.user.id;
        const companyId = req.user.companyId || req.company?.id;
        
        const cacheKey = `init:user:${userId}:company:${companyId || 'none'}`;
        const cachedData = await getCache(cacheKey);
        
        if (cachedData) {
            return res.json(cachedData);
        }

        const [
            company,
            platformSettings,
            settings,
            companyConfig,
            billing,
            preferences,
            isModuleLead,
            notifications,
            appFlagsData
        ] = await Promise.all([
            // 1. Company data
            prisma.company.findUnique({
                where: { id: companyId }
            }).then(c => {
                if (c) {
                    const safeC = { ...c } as any;
                    delete safeC.adminPasswordHash;
                    return safeC;
                }
                return c;
            }).catch(() => null),

            // 2. Platform branding
            prisma.platformSettings.findFirst().then(s => {
                if (!s) return null;
                return {
                    name: s.platformName || 'Platform',
                    platformName: s.platformName,
                    logo: s.logoUrl || '',
                    favicon: s.faviconUrl || '',
                    email: s.supportEmail || '',
                    phone: s.companyPhone || '',
                    currency: s.currency || 'USD',
                    themeColor: s.themeColor || '#4f46e5',
                    tagline: s.brandingTagline || '',
                    legalName: s.companyLegalName || '',
                    address: s.companyAddress || '',
                    website: s.companyWebsite || '',
                    supportEmail: s.supportEmail || '',
                    isCompany: true,
                };
            }).catch(() => null),

            // 3. Company settings
            (async () => {
                try {
                    const Settings = req.prisma?.settings;
                    if (!Settings) throw new Error('No prisma');
                    const s = await Settings.findFirst({
                        where: { companyId }
                    });
                    const companyRec = await req.prisma.company.findUnique({
                        where: { id: companyId }
                    });
                    let metadata = companyRec?.metadata || {};
                    if (typeof metadata === 'string') {
                        try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
                    }
                    if (typeof metadata === 'string') {
                        try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
                    }
                    
                    const safeSettings = s ? { ...s } : { companyName: '180workspace', logoUrl: '', themeColor: '#4f46e5' };
                    
                    const METADATA_FIELDS = [
                        'aiProvider', 'openaiKey', 'geminiKey', 'claudeKey', 'googleSheetsId',
                        'lastAiTestStatus', 'lastAiTestDate', 'lastAiTestError',
                        'lastEmailTestStatus', 'lastEmailTestDate', 'lastEmailTestError',
                        'lastStorageTestStatus', 'lastStorageTestDate', 'lastStorageTestError',
                        'lastDbTestStatus', 'lastDbTestDate', 'lastDbTestError',
                        'customAiUrl', 'customAiKey', 'customAiModel',
                        'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpSecure', 'emailFrom',
                        'googleDriveServiceAccount', 'googleDriveFolderId',
                        'dbHost', 'dbPort', 'dbUser', 'dbPass', 'dbName', 'dbSrv',
                        'useManualUri', 'manualUri', 'plausibleApiKey', 'googleDriveTokens', 'plausibleSiteId'
                    ];

                    METADATA_FIELDS.forEach(field => {
                        (safeSettings as any)[field] = (metadata as any)[field] !== undefined ? (metadata as any)[field] : (field.endsWith('Status') ? 'none' : '');
                    });

                    // Mask sensitive fields
                    (safeSettings as any).openaiKey = (safeSettings as any).openaiKey ? '********' : '';
                    (safeSettings as any).claudeKey = (safeSettings as any).claudeKey ? '********' : '';
                    (safeSettings as any).geminiKey = (safeSettings as any).geminiKey ? '********' : '';
                    (safeSettings as any).smtpPass = (safeSettings as any).smtpPass ? '********' : '';
                    (safeSettings as any).customAiKey = (safeSettings as any).customAiKey ? '********' : '';
                    (safeSettings as any).dbPass = (safeSettings as any).dbPass ? '********' : '';
                    (safeSettings as any).recruitmentApiKey = (safeSettings as any).recruitmentApiKey ? '********' : '';

                    delete (safeSettings as any).webhookSecret;
                    delete (safeSettings as any).googleDriveServiceAccount;
                    
                    return safeSettings;
                } catch (e) {
                    console.error('Init settings error:', e);
                    return { companyName: '180workspace', logoUrl: '', themeColor: '#4f46e5' };
                }
            })(),

            // 4. Company config
            (async () => {
                try {
                    const companyRec = await prisma.company.findUnique({
                        where: { id: companyId }
                    });
                    if (!companyRec) return null;
                    
                    let metadata = companyRec.metadata || {};
                    if (typeof metadata === 'string') {
                        try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
                    }
                    if (typeof metadata === 'string') {
                        try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
                    }
                    
                    const safeCompanyMetadata = { ...(metadata as any) };
                    const METADATA_SECRET_FIELDS = [
                        'aiProvider', 'openaiKey', 'geminiKey', 'claudeKey', 'googleSheetsId',
                        'lastAiTestStatus', 'lastAiTestDate', 'lastAiTestError',
                        'lastEmailTestStatus', 'lastEmailTestDate', 'lastEmailTestError',
                        'lastStorageTestStatus', 'lastStorageTestDate', 'lastStorageTestError',
                        'lastDbTestStatus', 'lastDbTestDate', 'lastDbTestError',
                        'customAiUrl', 'customAiKey', 'customAiModel',
                        'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpSecure', 'emailFrom',
                        'googleDriveServiceAccount', 'googleDriveFolderId',
                        'dbHost', 'dbPort', 'dbUser', 'dbPass', 'dbName', 'dbSrv',
                        'useManualUri', 'manualUri', 'plausibleApiKey', 'googleDriveTokens', 'plausibleSiteId'
                    ];
                    METADATA_SECRET_FIELDS.forEach(field => delete safeCompanyMetadata[field]);

                    return {
                        id: companyRec.id,
                        companyId: companyRec.id,
                        companyName: companyRec.name,
                        companyEmail: companyRec.adminEmail,
                        companyLogo: companyRec.logoUrl,
                        country: companyRec.country || 'US',
                        currency: companyRec.currency || 'USD',
                        currencySymbol: getCurrencySymbol(companyRec.currency || 'USD'),
                        enabledApps: safeCompanyMetadata.enabledApps || [],
                        enabledModules: safeCompanyMetadata.enabledModules || [],
                        ...safeCompanyMetadata
                    };
                } catch (e) {
                    console.error('Init company config error:', e);
                    return null;
                }
            })(),

            // 5. Billing/subscription status
            (async () => {
                try {
                    const sub = await prisma.subscription.findFirst({
                        where: { companyId },
                        orderBy: { createdAt: 'desc' },
                        include: { plan: true }
                    });
                    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { currency: true, country: true } });
                    const defaultCurrency = company?.currency || 'USD';

                    if (!sub) return { daysLeft: 999, isExpired: false, isWarning: false, isTrialing: true, status: 'trial', paymentsEnabled: false, currency: defaultCurrency };

                    const plan = sub.plan;
                    const now = new Date();
                    const endDate = sub.subscriptionEndDate || sub.trialEndDate || now;
                    const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                    const isExpired = sub.status === 'expired' || (endDate < now && sub.status !== 'active');

                    return {
                        subscription: {
                            ...sub,
                            _id: sub.id, // compatibility mapping
                            endDate: endDate
                        },
                        plan: plan ? { ...plan, _id: plan.id } : null,
                        daysLeft,
                        isExpired,
                        isWarning: daysLeft <= 7 && daysLeft > 0,
                        isTrialing: sub.status === 'trial',
                        status: sub.status,
                        paymentsEnabled: !!(platformSettings as any)?.paymentsEnabled,
                        currency: defaultCurrency,
                        dataDeletionDate: null,
                        mandateStatus: sub.mandateStatus || 'pending',
                        autopayEnabled: !!sub.autopayEnabled,
                        autopayFailCount: sub.autopayFailCount || 0,
                        nextChargeDate: sub.nextChargeDate || null,
                    };
                } catch (err: any) {
                    console.error('[init.controller] Billing lookup failed:', err.message);
                    return { daysLeft: 999, isExpired: false, isWarning: false, isTrialing: true, status: 'trial', paymentsEnabled: false, currency: 'USD' };
                }
            })(),

            // 6. User preferences
            (async () => {
                try {
                    const UserPreference = req.prisma?.userPreference;
                    if (!UserPreference) return { favorites: [], recentItems: [] };
                    const prefs = await UserPreference.findFirst({ where: { userId: String(userId) } });
                    return prefs || { favorites: [], recentItems: [] };
                } catch {
                    return { favorites: [], recentItems: [] };
                }
            })(),

            // 7. Module lead check
            (async () => {
                try {
                    const Module = req.prisma?.module;
                    if (!Module) return false;
                    return !!(await Module.findFirst({ where: { ownerId: String(userId) }, select: { id: true } }));
                } catch {
                    return false;
                }
            })(),

            // 8. Notification count
            (async () => {
                try {
                    const Notification = req.prisma?.notification;
                    if (!Notification) return { unreadCount: 0 };
                    const count = await Notification.count({ where: { userId: String(userId), isRead: false } });
                    return { unreadCount: count };
                } catch {
                    return { unreadCount: 0 };
                }
            })(),

            // 9. Feature Flags & App Status
            FeatureFlagService.getAppFlags().catch(() => ({ flags: {}, disabledApps: [] })),
        ]);

        const sanitizedUser = sanitizeUser(req.user) as any;
        sanitizedUser.isModuleLead = isModuleLead;

        const responseData = {
            user: sanitizedUser,
            company: company ? {
                _id: (company as any).id,
                id: (company as any).id,
                companyName: (company as any).name,
                name: (company as any).name,
                slug: (company as any).slug,
                logoUrl: (company as any).logoUrl,
                country: (company as any).country || 'US',
                currency: (company as any).currency || 'USD',
                currencySymbol: (company as any).currencySymbol || getCurrencySymbol((company as any).currency || 'USD'),
                databaseConfigured: (company as any).databaseConfigured,
                isSuspended: (company as any).accountStatus === 'suspended',
                suspendedReason: null,
            } : null,
            settings,
            companyConfig,
            platform: platformSettings,
            billing,
            preferences,
            notifications,
            featureFlags: (appFlagsData as any)?.flags || {},
            disabledApps: (appFlagsData as any)?.disabledApps || [],
        };
        
        await setCache(cacheKey, responseData, 300);

        return res.json(responseData);
    } catch (err: any) {
  next(err);
}
};

export const getBootstrap = async (req: Request | any, res: Response, next: any) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Use unified prisma as per new architecture, fallback gracefully
    const companyPrisma = prisma;

    const [user, company, userPref, unreadCount, recentNotifications] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          permissions: true,
          companyId: true,
          photoUrl: true,
          isActive: true,
        }
      }),
      companyId ? prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          slug: true,
          metadata: true,
          logoUrl: true,
          customDomain: true,
          isOnboardingComplete: true,
          country: true,
          currency: true,
          currencySymbol: true,
        }
      }) : null,
      prisma.userPreference.findFirst({
        where: { userId },
        select: { favorites: true, recentItems: true }
      }),
      companyId ? companyPrisma.notification.count({
        where: { userId, isRead: false }
      }) : 0,
      companyId ? companyPrisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5
      }) : []
    ]);

    if (company) {
      (company as any).enabledApps = (company as any).metadata?.enabledApps || [];
      (company as any).enabledModules = (company as any).metadata?.enabledModules || [];
      delete (company as any).metadata;
    }

    res.json({
      success: true,
      user,
      company,
      preferences: userPref || { favorites: [], recentItems: [], theme: 'light' },
      notifications: {
        unreadCount,
        recent: recentNotifications
      },
      setupStatus: {
        isOnboardingComplete: company?.isOnboardingComplete ?? false
      }
    });
  } catch (err) {
    next(err);
  }
};

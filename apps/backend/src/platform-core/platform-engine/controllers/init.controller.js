'use strict';

/**
 * GET /api/init
 * 
 * Merged endpoint that returns ALL data the frontend needs on initial load
 * in a single round-trip. Replaces 6 separate API calls:
 *   - GET /api/auth/me
 *   - GET /api/settings
 *   - GET /api/company-config
 *   - GET /api/public/branding
 *   - GET /api/billing
 *   - GET /api/user-preferences
 *   - GET /api/notifications?limit=1
 * 
 * This eliminates 6x tenant-db resolution overhead and reduces
 * frontend waterfall from ~3s to ~300-500ms (single DB round-trip).
 */

const { sanitizeUser } = require('../../../system-configs/utils/sanitize-user');
const { getCache, setCache } = require('../../../system-configs/utils/redis');

exports.getInit = async (req, res) => {
    try {
        const userId = req.user.id;
        const companyId = req.user.companyId || req.company?.id;
        
        const cacheKey = `init:user:${userId}:company:${companyId || 'none'}`;
        const cachedData = await getCache(cacheKey);
        
        if (cachedData) {
            return res.json(cachedData);
        }

        const { prisma } = require('@workspace/db');

        // All DB reads in parallel â€” single tenant DB connection, multiple reads
        const [
            company,
            platformSettings,
            settings,
            companyConfig,
            billing,
            preferences,
            isModuleLead,
            notifications
        ] = await Promise.all([
            // 1. Company data (from system DB)
            prisma.company.findUnique({
                where: { id: companyId }
            }).then(c => {
                if (c) {
                    const safeC = { ...c };
                    delete safeC.adminPasswordHash;
                    return safeC;
                }
                return c;
            }).catch(() => null),

            // 2. Platform branding (from system DB)
            prisma.platformSettings.findFirst().then(s => {
                if (!s) return null;
                return {
                    name: s.platformName || 'Platform',
                    platformName: s.platformName,
                    logo: s.logoUrl || '',
                    favicon: s.faviconUrl || '',
                    email: s.supportEmail || '',
                    phone: s.companyPhone || '',
                    currency: s.currency || 'INR',
                    themeColor: s.themeColor || '#4f46e5',
                    tagline: s.brandingTagline || '',
                    legalName: s.companyLegalName || '',
                    address: s.companyAddress || '',
                    website: s.companyWebsite || '',
                    supportEmail: s.supportEmail || '',
                    isTenant: true,
                };
            }).catch(() => null),

            // 3. Tenant settings
            (async () => {
                try {
                    const Settings = req.prisma.settings;
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
                    
                    const safeSettings = s ? { ...s } : { companyName: 'Internal Management System', logoUrl: '', themeColor: '#4f46e5' };
                    
                    const METADATA_FIELDS = [
                        'aiProvider', 'openaiKey', 'geminiKey', 'claudeKey', 'googleSheetsId',
                        'lastAiTestStatus', 'lastAiTestDate', 'lastAiTestError',
                        'lastEmailTestStatus', 'lastEmailTestDate', 'lastEmailTestError',
                        'lastStorageTestStatus', 'lastStorageTestDate', 'lastStorageTestError',
                        'lastDbTestStatus', 'lastDbTestDate', 'lastDbTestError',
                        'customAiUrl', 'customAiKey', 'customAiModel',
                        'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpSecure', 'emailFrom',
                        'googleDriveServiceAccount', 'googleDriveFolderId',
                        'cloudinaryCloudName', 'cloudinaryApiKey', 'cloudinaryApiSecret',
                        'dbHost', 'dbPort', 'dbUser', 'dbPass', 'dbName', 'dbSrv',
                        'useManualUri', 'manualUri', 'plausibleApiKey', 'googleDriveTokens', 'plausibleSiteId'
                    ];

                    METADATA_FIELDS.forEach(field => {
                        safeSettings[field] = metadata[field] !== undefined ? metadata[field] : (field.endsWith('Status') ? 'none' : '');
                    });

                    // Ensure sensitive fields are masked so the frontend knows they are configured
                    safeSettings.openaiKey = safeSettings.openaiKey ? '********' : '';
                    safeSettings.claudeKey = safeSettings.claudeKey ? '********' : '';
                    safeSettings.geminiKey = safeSettings.geminiKey ? '********' : '';
                    safeSettings.smtpPass = safeSettings.smtpPass ? '********' : '';
                    safeSettings.customAiKey = safeSettings.customAiKey ? '********' : '';
                    safeSettings.cloudinaryApiSecret = safeSettings.cloudinaryApiSecret ? '********' : '';
                    safeSettings.dbPass = safeSettings.dbPass ? '********' : '';
                    safeSettings.recruitmentApiKey = safeSettings.recruitmentApiKey ? '********' : '';

                    delete safeSettings.webhookSecret;
                    delete safeSettings.googleDriveServiceAccount;
                    
                    return safeSettings;
                } catch (e) {
                    console.error('Init settings error:', e);
                    return { companyName: 'Internal Management System', logoUrl: '', themeColor: '#4f46e5' };
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
                    
                    // Do not leak secrets in companyConfig
                    const safeCompanyMetadata = { ...metadata };
                    const METADATA_SECRET_FIELDS = [
                        'aiProvider', 'openaiKey', 'geminiKey', 'claudeKey', 'googleSheetsId',
                        'lastAiTestStatus', 'lastAiTestDate', 'lastAiTestError',
                        'lastEmailTestStatus', 'lastEmailTestDate', 'lastEmailTestError',
                        'lastStorageTestStatus', 'lastStorageTestDate', 'lastStorageTestError',
                        'lastDbTestStatus', 'lastDbTestDate', 'lastDbTestError',
                        'customAiUrl', 'customAiKey', 'customAiModel',
                        'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpSecure', 'emailFrom',
                        'googleDriveServiceAccount', 'googleDriveFolderId',
                        'cloudinaryCloudName', 'cloudinaryApiKey', 'cloudinaryApiSecret',
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
                        enabledApps: metadata.enabledApps || [],
                        enabledModules: metadata.enabledModules || [],
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
                    if (!sub) return { daysLeft: 999, isExpired: false, isWarning: false, isTrialing: true, status: 'trial', paymentsEnabled: false, currency: 'INR' };

                    const plan = sub.plan;
                    const now = new Date();
                    const endDate = sub.subscriptionEndDate || sub.trialEndDate || now;
                    const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                    const isExpired = sub.status === 'expired' || (endDate < now && sub.status !== 'active');

                    // Extract Razorpay key id if configured in PlatformSettings paymentConfig JSON
                    const paymentConfig = platformSettings?.paymentConfig || {};
                    const razorpayKeyId = paymentConfig.razorpay?._keyId || '';

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
                        paymentsEnabled: !!platformSettings?.paymentsEnabled,
                        currency: plan?.currency || 'INR',
                        dataDeletionDate: null,
                        mandateStatus: sub.mandateStatus || 'pending',
                        autopayEnabled: !!sub.autopayEnabled,
                        autopayFailCount: sub.autopayFailCount || 0,
                        nextChargeDate: sub.nextChargeDate || null,
                    };
                } catch (err) {
                    console.error('[init.controller] Billing lookup failed:', err.message);
                    return { daysLeft: 999, isExpired: false, isWarning: false, isTrialing: true, status: 'trial', paymentsEnabled: false, currency: 'INR' };
                }
            })(),

            // 6. User preferences (favorites, recent items)
            (async () => {
                try {
                    const UserPreference = req.prisma.userPreference;
                    const prefs = await UserPreference.findFirst({ where: { userId: String(userId) } });
                    return prefs || { favorites: [], recentItems: [] };
                } catch {
                    return { favorites: [], recentItems: [] };
                }
            })(),

            // 7. Module lead check
            (async () => {
                try {
                    const Module = req.prisma.module;
                    return !!(await Module.findFirst({ where: { ownerId: String(userId) }, select: { id: true } }));
                } catch {
                    return false;
                }
            })(),

            // 8. Notification count
            (async () => {
                try {
                    const Notification = req.prisma.notification;
                    const count = await Notification.count({ where: { userId: String(userId), isRead: false } });
                    return { unreadCount: count };
                } catch {
                    return { unreadCount: 0 };
                }
            })(),
        ]);

        // Sanitize user (remove password hash, MFA secrets, etc.)
        const sanitizedUser = sanitizeUser(req.user);
        sanitizedUser.isModuleLead = isModuleLead;

        const responseData = {
            user: sanitizedUser,
            company: company ? {
                _id: company.id,
                id: company.id,
                companyName: company.name,
                name: company.name,
                slug: company.slug,
                logoUrl: company.logoUrl,
                databaseConfigured: company.databaseConfigured,
                isSuspended: company.accountStatus === 'suspended',
                suspendedReason: null,
            } : null,
            settings,
            companyConfig,
            platform: platformSettings,
            billing,
            preferences,
            notifications,
        };
        
        // Cache for 5 minutes
        await setCache(cacheKey, responseData, 300);

        res.json(responseData);
    } catch (err) {
        console.error('[Init] Failed:', err.message);
        res.status(500).json({ error: 'Failed to initialize application data' });
    }
};

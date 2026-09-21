'use strict';

const express = require('express');
const router = express.Router();
console.log('[Router] Index routes loaded with Public Edge Traffic Director & Reverse Proxy Streamer');

// Middleware
const { protect } = require('../system-configs/middleware/auth/auth');
const subscriptionGuard = require('../system-configs/middleware/auth/subscription-guard').default;
const moduleGuard = require('../system-configs/middleware/auth/module-guard').default;
const { rateLimit } = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    skip: (req: any) => {
        const ip = req.ip || req.socket?.remoteAddress || '';
        return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    },
    message: { error: 'Too many auth attempts, please try again later.' },
});

// ─── Direct Route Imports ──────────────────────────────────────────────────
const identityRoutes = require('../api/v1/identity/index').default;
const settingsDomainRoutes = require('../api/v1/settings/index').default;
const projectsAndTasksRoutes = require('../api/v1/projects-and-tasks/index').default;
const hrManagementRoutes = require('../api/v1/hr-management/index').default;
const financeRoutes = require('../api/v1/finance/index').default;
const crmAndSalesRoutes = require('../api/v1/crm-and-sales/index').default;
const workspaceToolsRoutes = require('../api/v1/workspace-tools/index').default;
const communicationsRoutes = require('../api/v1/communications/index').default;
const { protectedRoutes: advertisingRoutes, publicRoutes: advertisingPublicRoutes } = require('../api/v1/advertising/index');
const trafficDirectorModule = require('../api/v1/traffic-director/index');
const trafficDirectorRoutes = trafficDirectorModule.protectedRoutes?.default || trafficDirectorModule.protectedRoutes || trafficDirectorModule.default;
const trafficDirectorPublicRoutes = trafficDirectorModule.publicRoutes?.default || trafficDirectorModule.publicRoutes || require('../api/v1/traffic-director/public-routing.routes').default || require('../api/v1/traffic-director/public-routing.routes');
const { publicContractRoutes } = require('../api/v1/crm-and-sales/index');
const socialMediaRoutes = require('../api/v1/social-media/index').default;
const releaseNotesRoutes = require('../api/v1/communications/index').default;

// Initialize CRM listeners
require('@workspace/crm-and-sales').SalesListeners.initializeCRMListeners();

const setupRoutes = require('../api/v1/identity/setup/setup.routes').default;
const platformBillingRoutes = require('../api/v1/platform-billing/index').default;
// Health is now in system
const insightsRoutes = require('../api/v1/insights/index').default;
const publicRoutes = require('../api/v1/public/public.routes').default;
const voiceforceRoutes = require('../api/v1/voiceforce/index').default;
const walletRoutes = require('../api/v1/wallet/index').default;
// ─── Legacy Route Proxy ────────────────────────────────────────────────────
// Maps old frontend API calls (e.g. /api/dashboard) to the new v1 structure
router.use((req: any, res: any, next: any) => {
    // Only intercept requests missing /v1/, /auth, /setup, /public, /company-profile
    if (req.url.startsWith('/v1/') || req.url.startsWith('/wallet') || req.url.startsWith('/auth') || req.url.startsWith('/setup') || req.url.startsWith('/public') || req.url.startsWith('/company-profile') || req.url.startsWith('/system') || req.url.startsWith('/integrations') || req.url.startsWith('/init') || req.url.startsWith('/health') || req.url.startsWith('/bootstrap') || req.url.startsWith('/superadmin')) {
        return next();
    }

    const path = req.path; // e.g. /dashboard
    
    if (path === '/billing' || path.startsWith('/billing/')) {
        req.url = req.url.replace('/billing', '/v1/platform-billing');
    }
    // Explicit rewrites for components like CeoOverview and useSubscription
    const rewrites: Record<string, string> = {
        '/insights': '/v1/ai/insights',
        '/weekly-trends': '/v1/hr-management/hrms/weekly-trends',
        '/dashboard': '/v1/hr-management/hrms/dashboard',
        '/calendar': '/v1/workspace-tools/calendar',
        '/leaves': '/v1/hr-management/leaves',
        '/goals': '/v1/hr-management/hrms/goals',
        '/sticky-notes': '/v1/hr-management/hrms/sticky-notes',
        '/expenses': '/v1/finance/expenses',
        '/ceo-insights': '/v1/hr-management/hrms/ceo-insights',
        '/files': '/v1/workspace-tools/storage',
        '/files/upload': '/v1/workspace-tools/storage/upload',
        '/files/upload-video': '/v1/workspace-tools/storage/upload-video',
        '/files/upload-voice': '/v1/workspace-tools/storage/upload-voice',
        '/invoices': '/v1/finance/invoices',
        '/settings': '/v1/settings/configs',
        '/180documents/generate-ai': '/v1/ai/documents/generate',
        '/180documents/ai-status': '/v1/ai/status',
        '/settings/test-ai': '/v1/ai/test-connection'
    };

    if (rewrites[path]) {
        req.url = req.url.replace(path, rewrites[path]);
    } else if (path.startsWith('/content-calendar/') || path === '/content-calendar') {
        req.url = req.url.replace('/content-calendar', '/v1/social-media/content-calendar');
    } else if (path.startsWith('/saved-banks/') || path === '/saved-banks') {
        req.url = req.url.replace('/saved-banks', '/v1/social-media/saved-banks');
    } else if (path.startsWith('/social-media/') || path === '/social-media') {
        req.url = req.url.replace('/social-media', '/v1/social-media');
    } else if (path.startsWith('/calendar/')) {
        req.url = req.url.replace('/calendar', '/v1/workspace-tools/calendar');
    } else if (path.startsWith('/files/')) {
        req.url = req.url.replace('/files', '/v1/workspace-tools/storage');
    } else if (path.startsWith('/projects/') || path === '/projects') {
        req.url = req.url.replace('/projects', '/v1/projects-and-tasks/projects');
    } else if (path.startsWith('/expenses/')) {
        req.url = req.url.replace('/expenses', '/v1/finance/expenses');
    } else if (path.startsWith('/milestones/') || path === '/milestones') {
        req.url = req.url.replace('/milestones', '/v1/projects-and-tasks/milestones');
    } else if (path.startsWith('/modules/') || path === '/modules') {
        req.url = req.url.replace('/modules', '/v1/projects-and-tasks/modules');
    } else if (path.startsWith('/tasks/') || path === '/tasks') {
        req.url = req.url.replace('/tasks', '/v1/projects-and-tasks/tasks');
    } else if (path.startsWith('/timelogs/') || path === '/timelogs') {
        req.url = req.url.replace('/timelogs', '/v1/projects-and-tasks/timelogs');
    } else if (path.startsWith('/work-logs/') || path === '/work-logs') {
        req.url = req.url.replace('/work-logs', '/v1/projects-and-tasks/work-logs');
    } else if (path.startsWith('/activity/') || path === '/activity') {
        req.url = req.url.replace('/activity', '/v1/projects-and-tasks/activity');
    } else if (path.startsWith('/audit/') || path === '/audit') {
        req.url = req.url.replace('/audit', '/system/audit');
    } else if (path.startsWith('/user-preferences/')) {
        req.url = req.url.replace('/user-preferences', '/v1/identity/preferences');
    } else if (path.startsWith('/users/') || path === '/users') {
        req.url = req.url.replace('/users', '/v1/identity/users');
    } else if (path.startsWith('/clients/') || path === '/clients') {
        req.url = req.url.replace('/clients', '/v1/crm-and-sales/clients');
    } else if (path.startsWith('/hrms/')) {
        req.url = req.url.replace('/hrms', '/v1/hr-management/hrms');
    } else if (path.startsWith('/goals/') || path === '/goals') {
        req.url = req.url.replace('/goals', '/v1/hr-management/hrms/goals');
    } else if (path.startsWith('/sticky-notes/') || path === '/sticky-notes') {
        req.url = req.url.replace('/sticky-notes', '/v1/hr-management/hrms/sticky-notes');
    } else if (path.startsWith('/ai/')) {
        req.url = req.url.replace('/ai', '/v1/ai');
    } else if (path.startsWith('/contracts/') || path === '/contracts') {
        req.url = req.url.replace('/contracts', '/v1/crm-and-sales/contracts');
    } else if (path.startsWith('/sales/') || path === '/sales') {
        req.url = req.url.replace('/sales', '/v1/crm-and-sales/sales');
    } else if (path.startsWith('/180documents/') || path === '/180documents') {
        req.url = req.url.replace('/180documents', '/v1/workspace-tools/documents');
    } else if (path.startsWith('/knowledge/') || path === '/knowledge') {
        req.url = req.url.replace('/knowledge', '/v1/workspace-tools/documents');
    } else if (path.startsWith('/websites/') || path === '/websites') {
        req.url = req.url.replace('/websites', '/v1/advertising/websites');
    } else if (path.startsWith('/invoices/') || path === '/invoices') {
        req.url = req.url.replace('/invoices', '/v1/finance/invoices');
    } else if (path.startsWith('/emails/') || path === '/emails') {
        req.url = req.url.replace('/emails', '/v1/communications/emails');
    } else if (path.startsWith('/chat/') || path === '/chat') {
        req.url = req.url.replace('/chat', '/v1/communications/chat');
    } else if (path.startsWith('/meetings/') || path === '/meetings') {
        req.url = req.url.replace('/meetings', '/v1/communications/meetings');
    } else if (path.startsWith('/meeting/') || path === '/meeting') {
        req.url = req.url.replace('/meeting', '/v1/communications/meetings');
    } else if (path.startsWith('/notifications/') || path === '/notifications') {
        req.url = req.url.replace('/notifications', '/v1/communications/notifications');
    } else if (path.startsWith('/analytics/') || path === '/analytics') {
        req.url = req.url.replace('/analytics', '/v1/insights/analytics');
    } else if (path.startsWith('/attendance/') || path === '/attendance') {
        req.url = req.url.replace('/attendance', '/v1/hr-management/attendance');
    } else if (path.startsWith('/employee/') || path === '/employee') {
        req.url = req.url.replace('/employee', '/v1/hr-management/employees');
    } else if (path.startsWith('/events/') || path === '/events') {
        req.url = req.url.replace('/events', '/v1/workspace-tools/calendar');
    } else if (path.startsWith('/finance/') || path === '/finance') {
        req.url = req.url.replace('/finance', '/v1/finance/finance-overview');
    } else if (path.startsWith('/forms/') || path === '/forms') {
        req.url = req.url.replace('/forms', '/v1/advertising/forms');
    } else if (path.startsWith('/holidays/') || path === '/holidays') {
        req.url = req.url.replace('/holidays', '/v1/hr-management/holidays');
    } else if (path.startsWith('/roles-access/') || path === '/roles-access') {
        req.url = req.url.replace('/roles-access', '/v1/settings/roles');
    } else if (path.startsWith('/salary/') || path === '/salary') {
        req.url = req.url.replace('/salary', '/v1/finance/salary');
    } else if (path.startsWith('/social-media/') || path === '/social-media') {
        req.url = req.url.replace('/social-media', '/v1/social-media');
    } else if (path.startsWith('/transactions/') || path === '/transactions') {
        req.url = req.url.replace('/transactions', '/v1/finance/transactions');
    } else if (path.startsWith('/vendors/') || path === '/vendors') {
        req.url = req.url.replace('/vendors', '/v1/finance/vendors');
    } else if (path.startsWith('/company/') || path === '/company') {
        req.url = req.url.replace('/company', '/v1/company/profile');
    } else if (path.startsWith('/branding/') || path === '/branding') {
        req.url = req.url.replace('/branding', '/v1/company/config');
    } else if (path.startsWith('/assets/') || path === '/assets') {
        req.url = req.url.replace('/assets', '/v1/workspace-tools/assets');
    } else if (path.startsWith('/settings/company')) {
        req.url = req.url.replace('/settings/company', '/company-profile/private');
    } else if (path.startsWith('/settings/test-') || path.startsWith('/settings/clear-data')) {
        req.url = req.url.replace('/settings', '/v1/settings/configs');
    } else if (path.startsWith('/settings/')) {
        req.url = req.url.replace('/settings', '/v1/settings');
    } else if (path.startsWith('/support/tickets') || path === '/support/tickets') {
        req.url = req.url.replace('/support/tickets', '/v1/settings/support');
    } else if (path.startsWith('/support/') || path === '/support') {
        req.url = req.url.replace('/support', '/v1/settings/support');
    }
    
    next();
});

// ─── Public & Core ─────────────────────────────────────────────────────────
router.use('/v1/identity', identityRoutes);
router.use('/auth', require('../api/v1/identity/auth/auth.routes').authRoutes);
router.use('/v1/settings', protect, settingsDomainRoutes);
router.use('/v1/projects-and-tasks', protect, moduleGuard('projects'), projectsAndTasksRoutes);
router.use('/v1/hr-management', protect, moduleGuard('hr'), hrManagementRoutes);
router.use('/v1/finance', protect, moduleGuard('finance'), financeRoutes);
router.use('/v1/crm-and-sales', protect, moduleGuard('crm'), crmAndSalesRoutes);
router.use('/v1/workspace-tools', protect, moduleGuard('tools'), workspaceToolsRoutes);
// Public Edge Traffic Director routes (unauthenticated for client tag / ad review bots / tag verifier)
router.options('/v1/traffic-director/evaluate/:slug', (req: any, res: any) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
});
router.post('/v1/traffic-director/evaluate/:slug', (req: any, res: any, next: any) => {
    try {
        const mod = require('../api/v1/traffic-director/public-routing.controller');
        const ctrl = mod.PublicRoutingController || mod.default?.PublicRoutingController || mod;
        return ctrl.handleEdgeEvaluate(req, res);
    } catch (err) {
        next(err);
    }
});
router.all('/v1/traffic-director/tag/:slug', (req: any, res: any, next: any) => {
    try {
        const mod = require('../api/v1/traffic-director/public-routing.controller');
        const ctrl = mod.PublicRoutingController || mod.default?.PublicRoutingController || mod;
        return ctrl.handleDynamicTag(req, res);
    } catch (err) {
        next(err);
    }
});
router.all('/v1/traffic-director/stream-proxy', (req: any, res: any, next: any) => {
    try {
        const mod = require('../api/v1/traffic-director/public-routing.controller');
        const ctrl = mod.PublicRoutingController || mod.default?.PublicRoutingController || mod;
        return ctrl.handleProxyStream(req, res);
    } catch (err) {
        next(err);
    }
});
router.all('/v1/traffic-director/asset-proxy', (req: any, res: any, next: any) => {
    try {
        const mod = require('../api/v1/traffic-director/public-routing.controller');
        const ctrl = mod.PublicRoutingController || mod.default?.PublicRoutingController || mod;
        return ctrl.handleProxyAsset(req, res);
    } catch (err) {
        next(err);
    }
});
router.post('/v1/traffic-director/verify-tag', (req: any, res: any, next: any) => {
    try {
        const mod = require('../api/v1/traffic-director/traffic-director.controller');
        const ctrl = mod.TrafficDirectorController || mod.default?.TrafficDirectorController || mod;
        return ctrl.verifyTagInstallation(req, res);
    } catch (err) {
        next(err);
    }
});

// Public Social Media Review Session (Magic Link Portal)
router.use('/v1/social-media/reviews/public', require('../api/v1/social-media/reviews/client-review.routes').publicReviewRouter);

router.use('/v1/communications', protect, communicationsRoutes);
router.use('/v1/advertising', protect, moduleGuard('advertising'), advertisingRoutes);
router.use('/v1/traffic-director', protect, moduleGuard('traffic-director'), trafficDirectorRoutes);
router.use('/v1/social-media', protect, moduleGuard('social-media'), socialMediaRoutes);
router.use('/social-media', protect, moduleGuard('social-media'), socialMediaRoutes);
router.use('/content-calendar', protect, moduleGuard('social-media'), require('../api/v1/social-media/content-calendar/content-calendar.routes').default);
router.use('/saved-banks', protect, moduleGuard('social-media'), require('../api/v1/social-media/saved-banks/saved-banks.routes').default);
router.use('/v1/insights', protect, moduleGuard('insights'), insightsRoutes);
router.use('/v1/platform-billing', protect, platformBillingRoutes);
router.use('/v1/ai', require('../api/v1/ai').default);
router.use('/v1/domains', require('../api/v1/domains/domains.routes').default);
router.use('/domains', require('../api/v1/domains/domains.routes').default);
router.use('/p/contract', publicContractRoutes);
router.use('/p/document', require('../api/v1/workspace-tools/documents/documents.public.routes').default);
router.use('/public', publicRoutes);
router.use('/v1/public', publicRoutes);
router.use('/public', advertisingPublicRoutes);
router.use('/r', trafficDirectorPublicRoutes);
router.use('/shield/:slug', (req: any, res: any) => {
    return require('../api/v1/traffic-director/public-routing.controller').PublicRoutingController.handleShieldRoute(req, res);
});
router.use('/tag/:slug', (req: any, res: any) => {
    return require('../api/v1/traffic-director/public-routing.controller').PublicRoutingController.handleDynamicTag(req, res);
});
router.options('/evaluate/:slug', (req: any, res: any) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
});
router.post('/evaluate/:slug', (req: any, res: any) => {
    return require('../api/v1/traffic-director/public-routing.controller').PublicRoutingController.handleEdgeEvaluate(req, res);
});
router.use('/setup', setupRoutes);
// Release notes endpoint
router.get('/release-notes', async (req: any, res: any, next: any) => {
    try {
        const { ReleaseNoteService } = require('@workspace/platform-admin');
        const notes = await ReleaseNoteService.listPublished();
        res.json({ success: true, data: { releaseNotes: notes } });
    } catch (err) {
        next(err);
    }
});
router.get('/v1/release-notes', async (req: any, res: any, next: any) => {
    try {
        const { ReleaseNoteService } = require('@workspace/platform-admin');
        const notes = await ReleaseNoteService.listPublished();
        res.json({ success: true, data: { releaseNotes: notes } });
    } catch (err) {
        next(err);
    }
});
router.use('/company-profile', require('../api/v1/company/routes/company-profile.routes').default);
router.use('/integrations', require('../api/v1/integrations/index').default);
router.use('/system', require('../api/v1/system/index').default);
// ─── Super Admin (isolated) ────────────────────────────────────────────────
router.use('/superadmin', require('../api/v1/platform-admin/index').default);

// ─── Subscription Guard (Protect business routes) ──────────────────────────
// Merged init endpoint
const { getInit } = require('../api/v1/system/init/init.controller');
router.get('/init', protect, getInit);
router.get('/health', require('../api/v1/system/health/health.controller').getHealth);
router.get('/bootstrap', protect, require('../api/v1/system/init/init.controller').getBootstrap);

router.use(subscriptionGuard);

// ─── Protected Routes (Company) ─────────────────────────────────────────────
const featureFlagGuard = require('../system-configs/middleware/billing/featureFlagGuard');

// ─── HR ──────────────────────────────────────────────────────────────────
router.use('/onboarding', protect, moduleGuard('hr'), require('../api/v1/company/onboarding/onboarding.routes').default);
router.use('/company-config', protect, require('../api/v1/company/routes/company-config.routes').default);

// ─── Support & Tickets ─────────────────────────────────────────────────────
const { supportRoutes } = require('../api/v1/settings/support/support.routes');
router.use('/support/tickets', protect, supportRoutes);
router.use('/support', protect, supportRoutes);
router.use('/v1/support', protect, supportRoutes);

// ─── 180 Voiceforce (AI Voice Calling Engine) ──────────────────────────────
router.use('/voiceforce', voiceforceRoutes);
router.use('/v1/voiceforce', voiceforceRoutes);

// ─── 180 Dedicated Prepaid Wallet Engine ──────────────────────────────────
router.use('/wallet', walletRoutes);
router.use('/v1/wallet', walletRoutes);

// ─── 180 Media Studio (Autonomous Video Production Engine & NLE) ─────────────
const mediaEditorRoutes = require('../api/v1/media-editor/media-editor.routes').default;

// Public Native Installer Downloads
router.get([
  '/download/:platform',
  '/v1/download/:platform',
  '/workspace/download/:platform',
  '/v1/workspace/download/:platform',
  '/media-editor/download/:platform',
  '/v1/media-editor/download/:platform',
], (req: any, res: any) => {
  const platform = String(req.params.platform || "").toLowerCase();
  // platform -> [download file name, env var holding the published release URL]
  const artifacts: Record<string, [string, string]> = {
    windows: ["180Workspace-Setup-x64.exe", "DESKTOP_DOWNLOAD_URL_WINDOWS"],
    win: ["180Workspace-Setup-x64.exe", "DESKTOP_DOWNLOAD_URL_WINDOWS"],
    msi: ["180Workspace-Setup-x64.exe", "DESKTOP_DOWNLOAD_URL_WINDOWS"],
    mac: ["180Workspace-Universal.dmg", "DESKTOP_DOWNLOAD_URL_MAC"],
    mac_intel: ["180Workspace-x64.dmg", "DESKTOP_DOWNLOAD_URL_MAC_INTEL"],
    linux: ["180Workspace-x86_64.AppImage", "DESKTOP_DOWNLOAD_URL_LINUX"],
    linux_deb: ["180Workspace-amd64.deb", "DESKTOP_DOWNLOAD_URL_LINUX_DEB"],
    android: ["180Workspace-v1.0.apk", "DESKTOP_DOWNLOAD_URL_ANDROID"],
    apk: ["180Workspace-v1.0.apk", "DESKTOP_DOWNLOAD_URL_ANDROID"],
  };
  const artifact = artifacts[platform];
  if (!artifact) {
    return res.status(400).json({ success: false, error: "UNKNOWN_PLATFORM", message: "Unknown platform" });
  }
  const [fileName, urlEnv] = artifact;

  // 1. Preferred: the signed release published by CI (GitHub Releases / R2 / CDN), configured per platform.
  const releaseUrl = process.env[urlEnv];
  if (releaseUrl && /^https:\/\//i.test(releaseUrl)) {
    return res.redirect(302, releaseUrl);
  }

  // 2. Legacy: an installer file shipped next to the backend (kept until the Tauri release pipeline is live).
  const fs = require("fs");
  const path = require("path");
  const isAndroid = platform === "android" || platform === "apk";
  const isWindows = platform === "windows" || platform === "win" || platform === "msi";
  const candidatePaths: string[] = isWindows
    ? [
        path.resolve(__dirname, "../../../desktop-app/windows/180Workspace-Setup-x64.exe"),
        path.resolve(__dirname, "../../../frontend/public/downloads/180Workspace-Setup-x64.exe"),
        path.resolve(__dirname, "../../downloads/180Workspace-Setup-x64.exe"),
      ]
    : isAndroid
    ? [
        path.resolve(__dirname, "../../../frontend/android/app/build/outputs/apk/release/app-release.apk"),
        path.resolve(__dirname, "../../downloads/180Workspace-v1.0.apk"),
      ]
    : [path.resolve(__dirname, "../../downloads", fileName)];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader(
        "Content-Type",
        isWindows ? "application/vnd.microsoft.portable-executable" : isAndroid ? "application/vnd.android.package-archive" : "application/octet-stream"
      );
      return res.sendFile(p);
    }
  }

  // 3. Never fabricate an installer: a placeholder file named ".exe/.dmg" that is really text looks like a
  //    corrupted download to the user. Say plainly that it is not published yet.
  return res.status(404).json({
    success: false,
    error: "INSTALLER_NOT_AVAILABLE",
    message: "The desktop installer for this platform has not been published yet.",
    platform,
  });
});

// NOTE: '/media-editor/ai-status' and '/media-editor/ai-direct' were previously also registered here,
// unauthenticated, and matched before the protected `/media-editor` mount below could ever run —
// an auth bypass on the AI Director endpoint. Removed; the identical routes already exist, correctly
// protected, in media-editor.routes.ts (mounted below via `protect, moduleGuard('media-editor')`).

const syncRoutes = require('../api/v1/sync/sync.routes').default || require('../api/v1/sync/sync.routes');

router.use('/sync', protect, syncRoutes);
router.use('/v1/sync', protect, syncRoutes);

// Desktop device registration / revocation (see api/v1/desktop/desktop-device.ts)
const desktopRoutes = require('../api/v1/desktop/desktop.routes').default || require('../api/v1/desktop/desktop.routes');
router.use('/desktop', protect, desktopRoutes);
router.use('/v1/desktop', protect, desktopRoutes);

router.use('/media-editor', protect, moduleGuard('media-editor'), mediaEditorRoutes);
router.use('/v1/media-editor', protect, moduleGuard('media-editor'), mediaEditorRoutes);

export default router;

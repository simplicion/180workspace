'use strict';

const express = require('express');
const router = express.Router();

// Middleware
const { protect } = require('../system-configs/middleware/auth/auth.ts');
const subscriptionGuard = require('../system-configs/middleware/auth/subscription-guard.ts').default;
const moduleGuard = require('../system-configs/middleware/auth/module-guard.ts').default;
const { rateLimit } = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    skip: (req) => {
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
// Force nodemon restart
const { protectedRoutes: advertisingRoutes, publicRoutes: advertisingPublicRoutes } = require('../api/v1/advertising/index');
const socialMediaRoutes = require('../api/v1/social-media/index').default;
const { publicContractRoutes } = require('../api/v1/crm-and-sales/index');
const releaseNotesRoutes = require('../api/v1/communications/index').default;

// Initialize CRM listeners
require('@workspace/crm-and-sales').SalesListeners.initializeCRMListeners();

const setupRoutes = require('../api/v1/identity/setup/setup.routes').default;
const platformBillingRoutes = require('../api/v1/platform-billing/index').default;
// Health is now in system
const insightsRoutes = require('../api/v1/insights/index').default;
const publicRoutes = require('../api/v1/public/public.routes').default;
// ─── Legacy Route Proxy ────────────────────────────────────────────────────
// Maps old frontend API calls (e.g. /api/dashboard) to the new v1 structure
router.use((req, res, next) => {
    // Only intercept requests missing /v1/, /auth, /setup, /public, /company-profile
    if (req.url.startsWith('/v1/') || req.url.startsWith('/auth') || req.url.startsWith('/setup') || req.url.startsWith('/public') || req.url.startsWith('/company-profile') || req.url.startsWith('/system') || req.url.startsWith('/integrations') || req.url.startsWith('/init') || req.url.startsWith('/health') || req.url.startsWith('/bootstrap') || req.url.startsWith('/superadmin')) {
        return next();
    }

    const path = req.path; // e.g. /dashboard
    
    if (path === '/billing' || path.startsWith('/billing/')) {
        req.url = req.url.replace('/billing', '/v1/platform-billing');
    }
    // Explicit rewrites for components like CeoOverview and useSubscription
    const rewrites = {
        '/insights': '/v1/workspace-tools/ai-assistant/insights',
        '/weekly-trends': '/v1/hr-management/hrms/weekly-trends',
        '/dashboard': '/v1/hr-management/hrms/dashboard',
        '/projects': '/v1/projects-and-tasks/projects',
        '/calendar': '/v1/workspace-tools/calendar',
        '/leaves': '/v1/hr-management/leaves',
        '/goals': '/v1/hr-management/hrms/goals',
        '/expenses': '/v1/finance/expenses',
        '/ceo-insights': '/v1/hr-management/hrms/ceo-insights',
        '/files': '/v1/workspace-tools/documents/files',
        '/files/upload': '/v1/workspace-tools/storage/upload',
        '/files/upload-video': '/v1/workspace-tools/storage/upload-video',
        '/files/upload-voice': '/v1/workspace-tools/storage/upload-voice',
        '/invoices': '/v1/finance/invoices',
        '/work-logs': '/v1/projects-and-tasks/work-logs',
        '/activity': '/v1/projects-and-tasks/activity'
    };

    if (rewrites[path]) {
        req.url = req.url.replace(path, rewrites[path]);
    } else if (path.startsWith('/projects/')) {
        req.url = req.url.replace('/projects', '/v1/projects-and-tasks/projects');
    } else if (path.startsWith('/expenses/')) {
        req.url = req.url.replace('/expenses', '/v1/finance/expenses');
    } else if (path.startsWith('/milestones/')) {
        req.url = req.url.replace('/milestones', '/v1/projects-and-tasks/milestones');
    } else if (path.startsWith('/modules/')) {
        req.url = req.url.replace('/modules', '/v1/projects-and-tasks/modules');
    } else if (path.startsWith('/tasks/')) {
        req.url = req.url.replace('/tasks', '/v1/projects-and-tasks/tasks');
    } else if (path.startsWith('/user-preferences/')) {
        req.url = req.url.replace('/user-preferences', '/v1/identity/preferences');
    } else if (path.startsWith('/users/') || path === '/users') {
        req.url = req.url.replace('/users', '/v1/identity/users');
    } else if (path.startsWith('/clients/') || path === '/clients') {
        req.url = req.url.replace('/clients', '/v1/crm-and-sales/clients');
    } else if (path.startsWith('/hrms/')) {
        req.url = req.url.replace('/hrms', '/v1/hr-management/hrms');
    } else if (path.startsWith('/ai/')) {
        req.url = req.url.replace('/ai', '/v1/workspace-tools/ai-assistant');
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
    } else if (path.startsWith('/jobs/') || path === '/jobs') {
        req.url = req.url.replace('/jobs', '/v1/hr-management/jobs');
    } else if (path.startsWith('/reviews/') || path === '/reviews') {
        req.url = req.url.replace('/reviews', '/v1/hr-management/reviews');
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
    } else if (path.startsWith('/company-config/') || path === '/company-config') {
        req.url = req.url.replace('/company-config', '/v1/company/config');
    } else if (path.startsWith('/company/') || path === '/company') {
        req.url = req.url.replace('/company', '/v1/company/profile');
    } else if (path.startsWith('/branding/') || path === '/branding') {
        req.url = req.url.replace('/branding', '/v1/company/config');
    } else if (path.startsWith('/assets/') || path === '/assets') {
        req.url = req.url.replace('/assets', '/v1/workspace-tools/assets');
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
router.use('/v1/communications', protect, communicationsRoutes);
router.use('/v1/advertising', protect, moduleGuard('advertising'), advertisingRoutes);
router.use('/v1/social-media', protect, moduleGuard('tools'), socialMediaRoutes);
router.use('/v1/insights', protect, moduleGuard('insights'), insightsRoutes);
router.use('/v1/platform-billing', protect, platformBillingRoutes);
router.use('/p/contract', publicContractRoutes);
router.use('/public', publicRoutes);
router.use('/public', advertisingPublicRoutes);
router.use('/setup', setupRoutes);
// Health moved to system routes
// Release notes are now handled in communications
router.use('/company-profile', require('../api/v1/company/routes/company-profile.routes').default);
router.use('/integrations', require('../api/v1/integrations/index').default);
router.use('/system', require('../api/v1/system/index').default);
// ─── Subscription Guard (Protect business routes) ──────────────────────────
// Merged init endpoint
const { getInit } = require('../api/v1/system/init/init.controller');
router.get('/init', protect, getInit);
router.get('/health', require('../api/v1/system/health/health.controller').getHealth);
router.get('/bootstrap', protect, require('../api/v1/system/init/init.controller').getBootstrap);

router.use(subscriptionGuard);

// ─── Protected Routes (Company) ─────────────────────────────────────────────
const featureFlagGuard = require('../system-configs/middleware/billing/featureFlagGuard.ts');

// ─── HR ──────────────────────────────────────────────────────────────────
router.use('/onboarding', protect, moduleGuard('hr'), require('../api/v1/company/onboarding/onboarding.routes').default);
router.use('/company-config', protect, require('../api/v1/company/routes/company-config.routes').default);

// ─── Super Admin (isolated) ────────────────────────────────────────────────
router.use('/superadmin', require('../api/v1/platform-admin/index').default);

// ─── Support & Billing ─────────────────────────────────────────────────────
// router.use('/support/tickets', supportRoutes);


export default router;

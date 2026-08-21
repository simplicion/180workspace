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
const { protectedRoutes: advertisingRoutes, publicRoutes: advertisingPublicRoutes } = require('../api/v1/advertising/index');
const socialMediaRoutes = require('../api/v1/social-media/index').default;
const { publicContractRoutes } = require('../api/v1/crm-and-sales/index');
const releaseNotesRoutes = require('../api/v1/communications/index').default;

// Initialize CRM listeners
require('@workspace/crm-and-sales').SalesListeners.initializeCRMListeners();

const setupRoutes = require('../api/v1/identity/setup/setup.routes').default;
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
    
    if (path === '/billing') {
        // Return a mock billing response to satisfy useSubscription without 404s
        return res.json({
            subscription: null,
            plan: null,
            daysLeft: 999,
            isExpired: false,
            isWarning: false,
            isTrialing: true,
            status: 'trial',
            paymentsEnabled: false,
            currency: 'INR',
            dataDeletionDate: null,
            mandateStatus: 'pending',
            autopayEnabled: false,
            autopayFailCount: 0,
            nextChargeDate: null
        });
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
        '/ceo-insights': '/v1/hr-management/hrms/ceo-insights'
    };

    if (rewrites[path]) {
        req.url = req.url.replace(path, rewrites[path]);
    } else if (path.startsWith('/projects/')) {
        req.url = req.url.replace('/projects', '/v1/projects-and-tasks/projects');
    } else if (path.startsWith('/expenses/')) {
        req.url = req.url.replace('/expenses', '/v1/finance/expenses');
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

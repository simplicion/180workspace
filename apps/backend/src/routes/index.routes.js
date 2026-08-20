'use strict';

const express = require('express');
const router = express.Router();

// Middleware
const { protect } = require('../system-configs/middleware/auth/auth.js');
const subscriptionGuard = require('../system-configs/middleware/auth/subscription-guard.js');
const moduleGuard = require('../system-configs/middleware/auth/module-guard.js');
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
const authRoutes = require('../app-registry/auth-app/auth.routes');
const userRoutes = require('../app-registry/user-identity-app/user.routes');
const projectRoutes = require('../app-registry/projects-and-tasks-app/projects/project.routes');
const taskRoutes = require('../app-registry/projects-and-tasks-app/tasks/task.routes');
const clientRoutes = require('../app-registry/crm-and-sales-app/clients/client.routes');
const attendanceRoutes = require('../app-registry/hr-management-app/attendance/attendance.routes');
const hrmsRoutes = require('../app-registry/hr-management-app/hr-operations/hrms.routes');
const salaryRoutes = require('../app-registry/finance-app/salary/salary.routes');
const notificationRoutes = require('../platform-core/platform-communications/routes/notification.routes');
const fileRoutes = require('../platform-core/platform-storage/routes/file.routes');

const moduleRoutes = require('../app-registry/projects-and-tasks-app/modules/module.routes');
const attachmentRoutes = require('../platform-core/platform-storage/routes/file.routes');
const applicationRoutes = require('../app-registry/settings-app/apps-config/application.routes');
const webhookRoutes = require('../platform-core/platform-integrations/webhooks/webhook.routes');
const forumRoutes = require('../app-registry/community/forum.routes');
const releaseNotesRoutes = require('../platform-core/platform-communications/routes/release-notes.routes');
const jobRoutes = require('../app-registry/hr-management-app/recruitment/job.routes');
const websiteRoutes = require('../app-registry/advertising-app/websites/website.routes');
const contractRoutes = require('../app-registry/crm-and-sales-app/contracts/contract.routes');
const publicContractRoutes = require('../app-registry/crm-and-sales-app/contracts/public-contract.routes');

// Initialize CRM listeners
require('@workspace/crm-and-sales').SalesListeners.initializeCRMListeners();

const setupRoutes = require('../app-registry/setup-app/setup.routes');
const healthRoutes = require('../platform-core/platform-engine/routes/health.routes');
const aiRoutes = require('../app-registry/workspace-tools-app/ai-assistant/ai.routes');
const settingsRoutes = require('../app-registry/settings-app/system-configs/settings.routes');
const leaveRoutes = require('../app-registry/hr-management-app/attendance/leave.routes');
const holidayRoutes = require('../app-registry/hr-management-app/attendance/holiday.routes');
const superAdminRoutes = require('../app-registry/superadmin/superadmin.routes');
const supportRoutes = require('../app-registry/settings-app/help-support/support.routes');

const salesRoutes = require('../app-registry/crm-and-sales-app/sales/sales.routes');
const formBuilderRoutes = require('../app-registry/advertising-app/forms/form-builder.routes');
const analyticsRoutes = require('../app-registry/insights-app/analytics/analytics.routes');

// ─── Public & Core ─────────────────────────────────────────────────────────
router.use('/auth', authLimiter, authRoutes);
router.use('/p/contract', publicContractRoutes);
router.use('/public', require('../app-registry/public/public.routes'));
router.use('/public/forms', require('../app-registry/advertising-app/forms/public-forms.routes'));
router.use('/public/websites', require('../app-registry/advertising-app/websites/website-public.routes'));
router.use('/setup', setupRoutes);
router.use('/health', healthRoutes);
router.use('/branding', require('../platform-core/platform-security-audit/routes/branding.routes'));
router.use('/webhooks', webhookRoutes);
router.use('/community', forumRoutes);
router.use('/release-notes', releaseNotesRoutes);
router.use('/company-profile', require('../app-registry/company-hub-app/company-profile/company-profile.routes'));
router.use('/events', require('../app-registry/company-hub-app/events/events.routes'));
router.use('/services', require('../platform-core/platform-integrations/routes/services.routes'));
router.use('/integrations/google', require('../platform-core/platform-integrations/routes/google-oauth.routes'));
// ─── Subscription Guard (Protect business routes) ──────────────────────────
// Merged init endpoint — returns user, settings, company-config, branding, billing, preferences in ONE call
const { getInit } = require('../platform-core/platform-engine/controllers/init.controller');
router.get('/init', protect, getInit);
router.use('/', require('./bootstrap.routes'));

router.use(subscriptionGuard);

// ─── Protected Routes (Company) ─────────────────────────────────────────────
router.use('/users', protect, userRoutes);
router.use('/projects', protect, moduleGuard('projects'), projectRoutes);
router.use('/modules', protect, moduleGuard('projects'), moduleRoutes);
router.use('/tasks', protect, moduleGuard('projects'), taskRoutes);
router.use('/clients', protect, moduleGuard('crm'), clientRoutes);
router.use('/attendance', protect, moduleGuard('hr'), attendanceRoutes);
router.use('/hrms', protect, moduleGuard('hr'), hrmsRoutes);
router.use('/chat', protect, require('../app-registry/communications-app/chat/chat.routes'));
router.use('/notifications', protect, notificationRoutes);
router.use('/files', protect, fileRoutes);

router.use('/jobs', protect, moduleGuard('hr'), jobRoutes);
router.use('/applications', protect, moduleGuard('hr'), applicationRoutes);
router.use('/salary', protect, moduleGuard('hr'), salaryRoutes);
const featureFlagGuard = require('../system-configs/middleware/billing/featureFlagGuard.js');

router.use('/ai', protect, moduleGuard('tools'), featureFlagGuard('aiAssistant'), aiRoutes);
router.use('/settings', protect, settingsRoutes);
router.use('/emails', protect, moduleGuard('tools'), featureFlagGuard('emailServices'), require('../app-registry/communications-app/emails/email.routes'));
router.use('/audit', protect, require('../platform-core/platform-security-audit/routes/audit.routes'));
router.use('/activity', protect, require('../app-registry/projects-and-tasks-app/activities/activity.routes'));
// ─── HR ──────────────────────────────────────────────────────────────────
router.use('/employees', protect, moduleGuard('hr'), require('../app-registry/hr-management-app/employees/employee.routes'));
router.use('/designations', protect, moduleGuard('hr'), require('../app-registry/hr-management-app/employees/designation.routes'));
router.use('/leaves', protect, moduleGuard('hr'), require('../app-registry/hr-management-app/attendance/leave.routes'));
router.use('/holidays', protect, moduleGuard('hr'), require('../app-registry/hr-management-app/attendance/holiday.routes'));
router.use('/attendance', protect, moduleGuard('hr'), require('../app-registry/hr-management-app/attendance/attendance.routes'));
router.use('/reviews', protect, moduleGuard('hr'), require('../app-registry/hr-management-app/reviews/review.routes'));
router.use('/hrms', protect, moduleGuard('hr'), require('../app-registry/hr-management-app/hr-operations/hrms.routes'));
router.use('/salaries', protect, moduleGuard('hr'), require('../app-registry/finance-app/salary/salary.routes'));
router.use('/calendar', protect, moduleGuard('tools'), require('../app-registry/workspace-tools-app/calendar/calendar.routes'));
router.use('/meeting', protect, moduleGuard('tools'), require('../app-registry/communications-app/meetings/meeting.routes'));
router.use('/timelogs', protect, moduleGuard('projects'), require('../app-registry/projects-and-tasks-app/timelogs/timelog.routes'));
router.use('/expenses', protect, moduleGuard('finance'), require('../app-registry/finance-app/expense-transactions/expense.routes'));
router.use('/invoices', protect, moduleGuard('crm'), require('../app-registry/finance-app/invoices/invoice.routes'));
router.use('/onboarding', protect, moduleGuard('hr'), require('../app-registry/setup-app/onboarding.routes'));
router.use('/milestones', protect, moduleGuard('projects'), require('../app-registry/projects-and-tasks-app/milestones/milestone.routes'));
router.use('/assets', protect, require('../app-registry/workspace-tools-app/assets/asset.routes'));
router.use('/content-calendar', protect, moduleGuard('tools'), require('../app-registry/social-media-management-app/content-calendar/content-calendar.routes'));
router.use('/social-media', protect, moduleGuard('tools'), require('../app-registry/social-media-management-app/social-media.routes'));
router.use('/company-config', protect, require('../app-registry/company-hub-app/company-config/company-config.routes'));
router.use('/analytics', protect, moduleGuard('insights'), analyticsRoutes);
router.use('/sales', protect, moduleGuard('crm'), salesRoutes);
router.use('/forms', protect, moduleGuard('advertising'), formBuilderRoutes);
router.use('/websites', protect, moduleGuard('advertising'), websiteRoutes);
router.use('/finance', protect, moduleGuard('finance'), require('../app-registry/finance-app/finance-overview/finance.routes'));
router.use('/transactions', protect, moduleGuard('finance'), require('../app-registry/finance-app/transactions/transactions.routes'));
router.use('/vendors', protect, moduleGuard('finance'), require('../app-registry/finance-app/vendors/vendor.routes'));
router.use('/search', protect, require('../platform-core/platform-integrations/routes/search.routes'));
router.use('/user-preferences', protect, require('../app-registry/user-identity-app/user-preference.routes'));
router.use('/180documents', protect, require('../app-registry/workspace-tools-app/documents/documents.routes'));
router.use('/knowledge', protect, require('../app-registry/workspace-tools-app/knowledge/knowledge.routes')); // Deprecated
router.use('/work-logs', protect, moduleGuard('projects'), require('../app-registry/projects-and-tasks-app/work-logs/worklog.routes'));
router.use('/apikey', require('../platform-core/platform-integrations/routes/apikey.routes'));
router.use('/contracts', protect, moduleGuard('crm'), contractRoutes); // Deprecated

router.use('/employee', protect, require('../app-registry/hr-management-app/employees/employee.routes'));
router.use('/designations', protect, require('../app-registry/hr-management-app/employees/designation.routes'));
router.use('/roles-access', protect, require('../app-registry/settings-app/roles-access/roles-access.routes'));
router.use('/profile', protect, require('../app-registry/user-identity-app/profile.routes'));

// ─── Super Admin (isolated) ────────────────────────────────────────────────
router.use('/superadmin', superAdminRoutes);

// ─── Support & Billing ─────────────────────────────────────────────────────
router.use('/support/tickets', supportRoutes);


module.exports = router;


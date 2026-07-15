'use strict';
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const superAdminAuth = require('../../system-configs/middleware/auth/superadmin-auth');
const superAdminAudit = require('../../system-configs/middleware/audit/superadmin-audit');

const authCtrl = require('./identity-and-access/auth.controller');
const overviewCtrl = require('./system-operations/overview.controller');
const companyCtrl = require('./tenant-management/company.controller');
const userCtrl = require('./identity-and-access/user.controller');
const planCtrl = require('./monetization/plan.controller');
const couponCtrl = require('./monetization/coupon.controller');
const subscriptionCtrl = require('./monetization/subscription.controller');
const paymentCtrl = require('./monetization/payment.controller');
const settingsCtrl = require('./system-operations/settings.controller');
const featureFlagCtrl = require('./system-operations/featureflag.controller');
const announcementCtrl = require('./communications/announcement.controller');
const ticketCtrl = require('./communications/supportticket.controller');
const releaseNoteCtrl = require('./system-operations/releasenote.controller');
const forumCtrl = require('../community/forum.controller');
const logCtrl = require('./system-operations/log.controller');
const databaseCtrl = require('./tenant-management/database.controller');

const saLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many login attempts' } });

// ── Public (no auth) ────────────────────────────────────────────────────────
router.post('/auth/login', saLimiter, authCtrl.login);

// ── All routes below require super admin JWT ─────────────────────────────────
router.use(superAdminAuth);
router.use(superAdminAudit);

// Auth
router.get('/auth/me', authCtrl.getMe);
router.put('/auth/profile', authCtrl.updateProfile);
router.put('/auth/change-password', authCtrl.changePassword);
router.post('/auth/logout', authCtrl.logout);

// Overview
router.get('/overview', overviewCtrl.getOverview);

// Companies
router.get('/companies', companyCtrl.list);
router.post('/companies', companyCtrl.create);
router.get('/companies/:id', companyCtrl.getOne);
router.put('/companies/:id/suspend', companyCtrl.suspend);
router.put('/companies/:id/unsuspend', companyCtrl.unsuspend);
router.delete('/companies/:id', companyCtrl.deleteCompany);
router.post('/companies/bulk-delete', companyCtrl.bulkDelete);
router.post('/companies/:id/reset-password', companyCtrl.resetAdminPassword);

// Users
router.get('/users', userCtrl.list);
router.put('/users/:id/suspend', userCtrl.suspend);
router.delete('/users/:id', userCtrl.deleteUser);

// Plans
router.get('/plans', planCtrl.list);
router.post('/plans', planCtrl.create);
router.put('/plans/:id', planCtrl.update);
router.put('/plans/:id/toggle', planCtrl.toggleActive);
router.delete('/plans/:id', planCtrl.remove);

// Coupons
router.get('/coupons', couponCtrl.list);
router.post('/coupons', couponCtrl.create);
router.put('/coupons/:id', couponCtrl.update);
router.put('/coupons/:id/toggle', couponCtrl.toggle);
router.delete('/coupons/:id', couponCtrl.remove);
router.get('/coupons/validate/:code', couponCtrl.validate);

// Subscriptions
router.get('/subscriptions', subscriptionCtrl.list);
router.get('/subscriptions/company/:id', subscriptionCtrl.getHistoryByCompany);
router.put('/subscriptions/:id/cancel', subscriptionCtrl.cancel);
router.put('/subscriptions/:id/renew', subscriptionCtrl.forceRenew);
router.post('/subscriptions/:id/refund', subscriptionCtrl.refund);

// Payments / Razorpay
router.get('/payments/config', paymentCtrl.getConfig);
router.put('/payments/config', paymentCtrl.updateConfig);
router.post('/payments/test', paymentCtrl.testConnection);

// Platform Settings
router.get('/settings', settingsCtrl.get);
router.put('/settings', settingsCtrl.update);
router.post('/settings/toggle-maintenance', settingsCtrl.toggleMaintenance);
router.post('/settings/test-db', settingsCtrl.testDbConnection);
router.post('/settings/test-email', settingsCtrl.testEmailConnection);

// Feature Flags
router.get('/feature-flags', featureFlagCtrl.list);
router.post('/feature-flags', featureFlagCtrl.create);
router.put('/feature-flags/:id/toggle', featureFlagCtrl.toggle);
router.delete('/feature-flags/:id', featureFlagCtrl.remove);

// Announcements
router.get('/announcements', announcementCtrl.list);
router.get('/announcements/active', announcementCtrl.listActive);
router.post('/announcements', announcementCtrl.create);
router.put('/announcements/:id', announcementCtrl.update);
router.delete('/announcements/:id', announcementCtrl.remove);

router.get('/tickets', ticketCtrl.list);
router.get('/tickets/:id', ticketCtrl.getOne);
router.post('/tickets/:id/reply', ticketCtrl.reply);
router.put('/tickets/:id/status', ticketCtrl.updateStatus);

// Release Notes
router.get('/release-notes', releaseNoteCtrl.list);
router.post('/release-notes', releaseNoteCtrl.create);
router.put('/release-notes/:id', releaseNoteCtrl.update);
router.delete('/release-notes/:id', releaseNoteCtrl.remove);

// Community Management
router.get('/forum/posts', forumCtrl.listPosts);
router.delete('/forum/posts/:id', forumCtrl.deletePost);
router.delete('/forum/replies/:id', forumCtrl.deleteReply);

// Logs
router.get('/logs/activity', logCtrl.activityLogs);
router.get('/logs/errors', logCtrl.failedLogins);

// Databases
router.get('/databases', databaseCtrl.list);
router.post('/databases/:id/test', databaseCtrl.testConnection);

module.exports = router;

'use strict';

import express from 'express';
import { DeveloperApiController } from '../controllers/developer.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// ─── OAuth Applications Management ───────────────────────────────────────────
router.get('/apps', protect, DeveloperApiController.listApps);
router.get('/apps/:id', protect, DeveloperApiController.getApp);
router.post('/apps', protect, DeveloperApiController.createApp);
router.put('/apps/:id', protect, DeveloperApiController.updateApp);
router.patch('/apps/:id', protect, DeveloperApiController.updateApp);
router.post('/apps/:id/rotate-secret', protect, DeveloperApiController.rotateSecret);
router.post('/apps/:id/rotate-webhook-secret', protect, DeveloperApiController.rotateWebhookSecret);
router.post('/apps/:id/test-webhook', protect, DeveloperApiController.testWebhook);
router.delete('/apps/:id', protect, DeveloperApiController.deleteApp);

// ─── App Real-Time Telemetry & Financial Analytics ───────────────────────────
router.get('/apps/:id/auth-logs', protect, DeveloperApiController.getAuthLogs);
router.get('/apps/:id/payment-analytics', protect, DeveloperApiController.getPaymentAnalytics);
router.get('/apps/:id/bank-details', protect, DeveloperApiController.getBankDetails);
router.put('/apps/:id/bank-details', protect, DeveloperApiController.saveBankDetails);

// ─── Earnings & Manual Payouts ───────────────────────────────────────────────
router.post('/apps/:appId/payouts', protect, DeveloperApiController.requestPayout);
router.get('/apps/:appId/payouts', protect, DeveloperApiController.listPayouts);

// ─── Super Admin Vendor Payouts & Global Intelligence ────────────────────────
router.get('/admin/payouts', DeveloperApiController.listAdminPayouts);
router.post('/admin/payouts/:id/status', DeveloperApiController.updateAdminPayoutStatus);
router.get('/admin/analytics', DeveloperApiController.getAdminAnalytics);

export default router;

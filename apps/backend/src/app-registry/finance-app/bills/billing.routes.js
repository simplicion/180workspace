const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../../system-configs/middleware/auth/auth.js');
const {
    getStatus,
    getPlans,
    getHistory,
    validateCoupon,
    triggerCron,
    initiateMandate,
    verifyMandate,
    activatePlan,
    cancelAutopay,
    resumeAutopay
} = require('./billing.controller');

// All billing routes require authentication
router.use(protect);

// GET  /api/billing        â€” current subscription & autopay status
router.get('/', getStatus);

// GET  /api/billing/plans  â€” list available plans
router.get('/plans', getPlans);

// GET  /api/billing/history â€” list transaction history
router.get('/history', getHistory);

// Admin-only routes below
router.use(authorize('admin', 'manager'));

// POST /api/billing/mandate/initiate  â€” start â‚¹1 mandate order
router.post('/mandate/initiate', initiateMandate);

// POST /api/billing/mandate/verify    â€” verify â‚¹1 mandate payment + save token
router.post('/mandate/verify', verifyMandate);

// POST /api/billing/activate          â€” manual activation / re-activation
router.post('/activate', activatePlan);

// POST /api/billing/cancel-autopay
router.post('/cancel-autopay', cancelAutopay);

// POST /api/billing/resume-autopay
router.post('/resume-autopay', resumeAutopay);

// POST /api/billing/coupon            â€” validate coupon code
router.post('/coupon', validateCoupon);

// POST /api/billing/cron-test         â€” manual cron trigger (debug)
router.post('/cron-test', triggerCron);

module.exports = router;

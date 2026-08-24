import express, { Router } from 'express';
import { BillingController } from './billing.controller';

const router = Router();

router.get('/', BillingController.getBillingInfo);
router.get('/plans', BillingController.getPlans);
router.get('/history', BillingController.getHistory);


import * as webhookCtrl from '../integrations/webhooks/webhook.controller';

router.post('/plan/checkout', BillingController.checkoutPlan);
router.post('/plan/verify', BillingController.verifyPlan);
router.post('/coupon', BillingController.validateCoupon);

// Redirect legacy /webhook endpoint to the unified universal webhook handler for razorpay
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
    req.params.provider = 'razorpay';
    webhookCtrl.handleUniversalWebhook(req, res, next);
});

export default router;

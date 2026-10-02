import express, { Router } from 'express';
import { BillingController } from './billing.controller';

const router = Router();

router.get('/', BillingController.getBillingInfo);
router.get('/plans', BillingController.getPlans);
router.get('/history', BillingController.getHistory);


router.post('/plan/checkout', BillingController.checkoutPlan);
router.post('/plan/verify', BillingController.verifyPlan);
router.post('/plan/cancel', BillingController.cancelPlan);
router.post('/coupon', BillingController.validateCoupon);

// 180 Pay Official Sovereign Webhook endpoints
router.post('/webhooks/180-pay', BillingController.handle180PayWebhook);
router.post('/webhook', BillingController.handle180PayWebhook);

export default router;


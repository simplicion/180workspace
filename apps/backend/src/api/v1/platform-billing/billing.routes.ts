import { Router } from 'express';
import { BillingController } from './billing.controller';

const router = Router();

router.get('/', BillingController.getBillingInfo);
router.get('/plans', BillingController.getPlans);
router.get('/history', BillingController.getHistory);


router.post('/plan/checkout', BillingController.checkoutPlan);
router.post('/plan/verify', BillingController.verifyPlan);
router.post('/coupon', BillingController.validateCoupon);

export default router;

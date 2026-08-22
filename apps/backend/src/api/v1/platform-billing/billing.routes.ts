import { Router } from 'express';
import { BillingController } from './billing.controller';

const router = Router();

router.get('/', BillingController.getBillingInfo);
router.get('/plans', BillingController.getPlans);
router.get('/history', BillingController.getHistory);
router.post('/storage/checkout', BillingController.checkoutStorage);
router.post('/storage/verify', BillingController.verifyStorage);

export default router;

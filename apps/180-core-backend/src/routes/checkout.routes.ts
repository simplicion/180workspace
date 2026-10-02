'use strict';

import express from 'express';
import { CheckoutApiController } from '../controllers/checkout.controller';
import { protect, optionalAuth } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/sessions', optionalAuth, CheckoutApiController.createCheckoutSession);
router.get('/sessions/:id', CheckoutApiController.getCheckoutSession);
router.post('/sessions/:id/pay', protect, CheckoutApiController.payCheckoutSession);
router.post('/sessions/:id/direct-order', CheckoutApiController.createDirectOrder);
router.post('/sessions/:id/direct-verify', CheckoutApiController.verifyDirectPayment);

export default router;


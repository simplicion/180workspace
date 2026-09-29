'use strict';

import express from 'express';
import { CheckoutApiController } from '../controllers/checkout.controller';
import { protect, optionalAuth } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/sessions', optionalAuth, CheckoutApiController.createCheckoutSession);
router.get('/sessions/:id', CheckoutApiController.getCheckoutSession);
router.post('/sessions/:id/pay', protect, CheckoutApiController.payCheckoutSession);

export default router;

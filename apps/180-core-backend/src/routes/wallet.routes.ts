'use strict';

import express from 'express';
import { WalletApiController } from '../controllers/wallet.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/', protect, WalletApiController.getUserWallet);
router.post('/topup/order', protect, WalletApiController.createTopupOrder);
router.post('/topup/verify', protect, WalletApiController.verifyTopup);
router.post('/topup/webhook', WalletApiController.handleWebhook);
router.post('/webhook', WalletApiController.handleWebhook);
router.get('/ledger', protect, WalletApiController.getLedger);

export default router;

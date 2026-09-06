import { Router } from 'express';
import { WalletController } from './wallet.controller';

const { protect } = require('../../../system-configs/middleware/auth/auth');
const superAdminAuth = require('../../../system-configs/middleware/auth/superadmin-auth').default || require('../../../system-configs/middleware/auth/superadmin-auth');

const router: Router = Router();

// ─── Public Webhooks (Cryptographically verified by HMAC SHA-256) ─────────────
router.post('/webhooks/razorpay', WalletController.handleRazorpayWebhook);

// ─── Superadmin Platform Observability ─────────────────────────────────────────
router.get('/platform/summary', superAdminAuth, WalletController.getPlatformSummary);

// ─── Protected Multi-Tenant Wallet Endpoints ──────────────────────────────────
// Balance & Overview
router.get('/', protect, WalletController.getWallet);

// Ledger, Receipts & Exports
router.get('/transactions', protect, WalletController.getTransactions);
router.get('/transactions/export', protect, WalletController.exportTransactions);
router.get('/transactions/:id/receipt', protect, WalletController.getReceipt);

// Gateway Integration (Razorpay Orders & Client Signatures)
router.post('/coupon/validate', protect, WalletController.validateCoupon);
router.post('/order', protect, WalletController.createOrder);
router.post('/verify', protect, WalletController.verifyPayment);

// Tenant Auto-Recharge & Threshold Settings
router.put('/settings', protect, WalletController.updateSettings);

export default router;

import { Router } from 'express';
import { protect } from '../../../system-configs/middleware/auth/auth';
import walletRoutes from './wallet.routes';
import { WalletController } from './wallet.controller';

const router: Router = Router();

// 1. Dedicated Public Webhooks (Secured via 180 Pay HMAC signature, not user JWT)
router.post('/webhooks/180-pay', WalletController.handle180PayWebhook);

// 2. Tenant Authenticated Endpoints
router.use(protect);
router.use('/', walletRoutes);

export default router;

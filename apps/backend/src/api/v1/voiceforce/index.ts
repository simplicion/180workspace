import { Router } from 'express';
import { protect } from '../../../system-configs/middleware/auth/auth';
import { VoiceforceWebhooksController } from './webhooks.controller';
import voiceforceRoutes from './voiceforce.routes';

const router: Router = Router();

// 1. Dedicated Public Webhooks (Secured via LiveKit HMAC & Telnyx signature, not user JWT)
router.post('/webhooks/livekit', VoiceforceWebhooksController.handleLiveKitWebhook);
router.post('/webhooks/telnyx', VoiceforceWebhooksController.handleTelnyxWebhook);

// 2. Tenant Authenticated Endpoints
router.use(protect);
router.use('/', voiceforceRoutes);

export default router;

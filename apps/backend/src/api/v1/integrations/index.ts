import express from 'express';
import { protect } from '../../../system-configs/middleware/auth/auth';
import * as apikeyController from './apikey.controller';
import * as offeringsController from './offerings.controller';
import webhookRoutes from './webhooks/webhook.routes';

const router = express.Router();

// ─── API KEY ROUTES ──────────────────────────────────────────────────────────
const apikeyRouter = express.Router();
apikeyRouter.get('/status', protect, apikeyController.getApiKeyStatus);
apikeyRouter.post('/generate', protect, apikeyController.generateApiKey);
apikeyRouter.delete('/revoke', protect, apikeyController.revokeApiKey);
// Public route secured by API key in query string
apikeyRouter.get('/public/profile', apikeyController.publicProfile);

router.use('/apikey', apikeyRouter);

// ─── OFFERINGS ROUTES ─────────────────────────────────────────────────────────
const offeringsRouter = express.Router();
// Public routes
offeringsRouter.post('/request', offeringsController.submitServiceRequest);
offeringsRouter.get('/company/:companyId', offeringsController.getServices);

// Protected routes (Requires authentication)
offeringsRouter.post('/', protect, offeringsController.addService);
offeringsRouter.put('/:id', protect, offeringsController.updateService);
offeringsRouter.delete('/:id', protect, offeringsController.deleteService);
offeringsRouter.get('/requests', protect, offeringsController.getServiceRequests);
offeringsRouter.put('/requests/:id', protect, offeringsController.updateServiceRequestStatus);

router.use('/services', offeringsRouter);

// ─── WEBHOOK ROUTES ──────────────────────────────────────────────────────────
router.use('/webhooks', webhookRoutes);

export default router;

import express from 'express';
import { protect } from '../../../system-configs/middleware/auth/auth';
import * as apikeyController from './apikey.controller';
import * as googleOauthController from './google-oauth.controller';
import * as servicesController from './services.controller';
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

// ─── GOOGLE OAUTH ROUTES ──────────────────────────────────────────────────────
const googleRouter = express.Router();
googleRouter.get('/auth', protect, googleOauthController.getAuthUrl);
googleRouter.post('/callback', protect, googleOauthController.handleCallback);
googleRouter.get('/folders', protect, googleOauthController.getFolders);
googleRouter.get('/files', protect, googleOauthController.getFiles);
googleRouter.post('/folders', protect, googleOauthController.createFolder);
googleRouter.post('/disconnect', protect, googleOauthController.disconnect);

router.use('/google', googleRouter);

// ─── SERVICES ROUTES ─────────────────────────────────────────────────────────
const servicesRouter = express.Router();
// Public routes
servicesRouter.post('/request', servicesController.submitServiceRequest);
servicesRouter.get('/company/:companyId', servicesController.getServices);

// Protected routes (Requires authentication)
servicesRouter.post('/', protect, servicesController.addService);
servicesRouter.put('/:id', protect, servicesController.updateService);
servicesRouter.delete('/:id', protect, servicesController.deleteService);
servicesRouter.get('/requests', protect, servicesController.getServiceRequests);
servicesRouter.put('/requests/:id', protect, servicesController.updateServiceRequestStatus);

router.use('/services', servicesRouter);

// ─── WEBHOOK ROUTES ──────────────────────────────────────────────────────────
router.use('/webhooks', webhookRoutes);

export default router;

'use strict';

import express from 'express';
import { rateLimit } from 'express-rate-limit';
import {
    OAuthController,
    DeveloperController,
    Msg91OtpService,
    UsernameService,
    LocationService,
    IdentityAuthController
} from '@workspace/identity';

const router = express.Router();

const isLocalIp = (req: any) => {
    const ip = req.ip || req.socket?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
};

const tokenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    skip: isLocalIp,
    message: { error: 'slow_down', error_description: 'Too many token exchange requests, please try again later.' }
});

const validateAuthorizeLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 150,
    skip: isLocalIp,
    message: { error: 'slow_down', error_description: 'Too many authorization validation requests.' }
});

const consentLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 80,
    skip: isLocalIp,
    message: { error: 'slow_down', error_description: 'Too many consent submissions, please try again later.' }
});

const verifyLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 600,
    skip: isLocalIp,
    message: { error: 'slow_down', error_description: 'Too many verification requests.' }
});

// Middleware for authentication
const { protect, optionalAuth } = require('../system-configs/middleware/auth/auth');

// ─── OpenID Connect Discovery & JWKS ──────────────────────────────────────────
router.get('/.well-known/openid-configuration', OAuthController.getOpenIdConfiguration);
router.get('/openid-configuration', OAuthController.getOpenIdConfiguration);
router.get('/.well-known/jwks.json', OAuthController.getJwks);
router.get('/jwks.json', OAuthController.getJwks);
router.get('/certs', OAuthController.getJwks);

// ─── Authorize & Consent Flow ────────────────────────────────────────────────
router.get('/authorize/validate', validateAuthorizeLimiter, optionalAuth || ((req: any, res: any, next: any) => next()), OAuthController.validateAuthorize);
router.post('/authorize/consent', consentLimiter, protect, OAuthController.submitConsent);

// ─── Token Endpoints (RFC 6749) ──────────────────────────────────────────────
router.post('/token', tokenLimiter, OAuthController.exchangeToken);

// ─── UserInfo Endpoint (OIDC) ────────────────────────────────────────────────
router.get('/userinfo', OAuthController.getUserInfo);
router.post('/userinfo', OAuthController.getUserInfo);

// ─── Token Verification & Revocation ─────────────────────────────────────────
router.post('/verify', verifyLimiter, OAuthController.verifyToken);
router.get('/verify', verifyLimiter, OAuthController.verifyToken);
router.post('/revoke', OAuthController.revokeToken);

// ─── Developer Portal App Management ─────────────────────────────────────────
router.get('/developer/apps', protect, DeveloperController.listApps);
router.get('/developer/apps/:id', protect, DeveloperController.getApp);
router.post('/developer/apps', protect, DeveloperController.createApp);
router.put('/developer/apps/:id', protect, DeveloperController.updateApp);
router.post('/developer/apps/:id/rotate-secret', protect, DeveloperController.rotateSecret);
router.delete('/developer/apps/:id', protect, DeveloperController.deleteApp);

// Aliases for /api/developer/apps directly on router
router.get('/apps', protect, DeveloperController.listApps);
router.get('/apps/:id', protect, DeveloperController.getApp);
router.post('/apps', protect, DeveloperController.createApp);
router.put('/apps/:id', protect, DeveloperController.updateApp);
router.post('/apps/:id/rotate-secret', protect, DeveloperController.rotateSecret);
router.delete('/apps/:id', protect, DeveloperController.deleteApp);

// ─── 180 Identity Helper Endpoints ───────────────────────────────────────────

// 1. WhatsApp OTP Dispatch via MSG91
router.post('/otp/send-whatsapp', async (req: any, res: any) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }
        const result = await Msg91OtpService.sendWhatsAppOtp(phone);
        return res.json(result);
    } catch (e: any) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

// 2. WhatsApp OTP Verification via MSG91
router.post('/otp/verify-whatsapp', async (req: any, res: any) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
        }
        const result = await Msg91OtpService.verifyWhatsAppOtp(phone, otp);
        return res.json(result);
    } catch (e: any) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

// 3. Check Username Availability or Auto-generate
router.get('/check-username', async (req: any, res: any) => {
    try {
        const { username, name } = req.query;

        if (name && !username) {
            const generated = await UsernameService.generateUniqueUsername(String(name));
            return res.json({ success: true, username: generated });
        }

        if (!username) {
            return res.status(400).json({ success: false, message: 'username or name query parameter is required' });
        }

        const result = await UsernameService.checkAvailability(String(username));
        return res.json({ success: true, ...result });
    } catch (e: any) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

// 4. Resolve Location (HTML5 Geolocation Lat/Long -> City/Country)
router.post('/resolve-location', async (req: any, res: any) => {
    try {
        const { latitude, longitude } = req.body;
        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
        }
        const result = await LocationService.resolveCoordinates(Number(latitude), Number(longitude));
        return res.json({ success: true, location: result });
    } catch (e: any) {
// 5. Direct 180 Identity Modal Auth Routes
router.post('/auth/login', IdentityAuthController.login);
router.post('/auth/register', IdentityAuthController.register);
router.post('/auth/forgot-password', IdentityAuthController.forgotPassword);
router.post('/auth/reset-password', IdentityAuthController.resetPassword);
router.post('/auth/google-continue', IdentityAuthController.googleContinue);

export default router;

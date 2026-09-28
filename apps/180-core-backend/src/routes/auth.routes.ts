'use strict';

import express from 'express';
import { AuthApiController } from '../controllers/auth.controller';
import { protect, optionalAuth } from '../middleware/auth.middleware';

const router = express.Router();

// ─── OpenID Connect Discovery & JWKS ──────────────────────────────────────────
router.get('/.well-known/openid-configuration', AuthApiController.getOpenIdConfiguration);
router.get('/openid-configuration', AuthApiController.getOpenIdConfiguration);
router.get('/.well-known/jwks.json', AuthApiController.getJwks);
router.get('/jwks.json', AuthApiController.getJwks);
router.get('/certs', AuthApiController.getJwks);

// ─── Authorize & Consent Flow ────────────────────────────────────────────────
router.get('/authorize/validate', optionalAuth, AuthApiController.validateAuthorize);
router.post('/authorize/consent', protect, AuthApiController.submitConsent);

// ─── Token Endpoints ─────────────────────────────────────────────────────────
router.post('/token', AuthApiController.exchangeToken);
router.get('/userinfo', protect, AuthApiController.getUserInfo);
router.post('/userinfo', protect, AuthApiController.getUserInfo);
router.post('/verify', AuthApiController.verifyToken);
router.get('/verify', AuthApiController.verifyToken);
router.post('/revoke', AuthApiController.revokeToken);

// ─── Auth Direct Endpoints ───────────────────────────────────────────────────
router.post('/login', AuthApiController.login);
router.post('/register', AuthApiController.register);
router.post('/forgot-password', AuthApiController.forgotPassword);
router.post('/reset-password', AuthApiController.resetPassword);
router.post('/google-continue', AuthApiController.googleContinue);

// ─── OTP & Verification ──────────────────────────────────────────────────────
router.post('/otp/send-whatsapp', AuthApiController.sendOtp);
router.post('/otp/verify-whatsapp', AuthApiController.verifyOtp);

// ─── Username & Location Helpers ─────────────────────────────────────────────
router.get('/check-username', AuthApiController.checkUsername);
router.post('/resolve-location', AuthApiController.resolveLocation);

export default router;

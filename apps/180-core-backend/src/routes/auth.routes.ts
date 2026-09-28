'use strict';

import express from 'express';
import { AuthApiController } from '../controllers/auth.controller';
import { protect, optionalAuth } from '../middleware/auth.middleware';
import {
  otpRateLimiter,
  authRateLimiter,
  tokenRateLimiter,
} from '../middleware/rate-limiter.middleware';

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
router.post('/token', tokenRateLimiter, AuthApiController.exchangeToken);
router.get('/userinfo', protect, AuthApiController.getUserInfo);
router.post('/userinfo', protect, AuthApiController.getUserInfo);
router.post('/verify', AuthApiController.verifyToken);
router.get('/verify', AuthApiController.verifyToken);
router.post('/revoke', AuthApiController.revokeToken);

// ─── Auth Direct Endpoints ───────────────────────────────────────────────────
router.post('/login', authRateLimiter, AuthApiController.login);
router.post('/register', authRateLimiter, AuthApiController.register);
router.post('/forgot-password', authRateLimiter, AuthApiController.forgotPassword);
router.post('/reset-password', authRateLimiter, AuthApiController.resetPassword);
router.post('/google-continue', authRateLimiter, AuthApiController.googleContinue);

// ─── OTP & Verification ──────────────────────────────────────────────────────
router.post('/otp/send-whatsapp', otpRateLimiter, AuthApiController.sendOtp);
router.post('/otp/verify-whatsapp', otpRateLimiter, AuthApiController.verifyOtp);

// ─── Username & Location Helpers ─────────────────────────────────────────────
router.get('/check-username', AuthApiController.checkUsername);
router.post('/resolve-location', AuthApiController.resolveLocation);

export default router;


'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../system-configs/middleware/auth/auth.js');
const {
    registerUser, registerTenant, login, logout, refreshToken,
    getMe, changePassword,
    setupMFA, enableMFA,
    completeWorkspaceSetup, googleLogin,
    findWorkspaces, forgotPassword, checkForgotEligibility,
    sendOtpEmail, sendOtp, verifyOtp, onboarding, checkUsername
} = require('./auth.controller');

router.get('/check-username', checkUsername);
router.post('/send-otp-email', sendOtpEmail);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', registerTenant);
router.post('/register-user', protect, registerUser);
router.post('/onboarding', protect, onboarding);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.get('/check-forgot-eligibility', checkForgotEligibility);
router.get('/find-workspaces', findWorkspaces);
router.post('/logout', protect, logout);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.put('/complete-workspace-setup', completeWorkspaceSetup);

// MFA
router.post('/mfa/setup', protect, setupMFA);
router.post('/mfa/enable', protect, enableMFA);

module.exports = router;

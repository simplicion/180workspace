import express from 'express';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { AuthValidation } from './auth.validation';

const router = express.Router();

router.get('/check-username', AuthController.checkUsername);
router.post('/send-otp-email', validateRequest(AuthValidation.sendOtpEmail), AuthController.sendOtpEmail);
router.post('/send-otp', validateRequest(AuthValidation.sendOtp), AuthController.sendOtp);
router.post('/verify-otp', validateRequest(AuthValidation.verifyOtp), AuthController.verifyOtp);
router.post('/register', validateRequest(AuthValidation.registerTenant), AuthController.registerTenant);
router.post('/register-user', protect, validateRequest(AuthValidation.registerUser), AuthController.registerUser);
router.post('/onboarding', protect, AuthController.onboarding);
router.post('/login', validateRequest(AuthValidation.login), AuthController.login);
router.post('/google', AuthController.googleLogin);
router.post('/forgot-password', validateRequest(AuthValidation.forgotPassword), AuthController.forgotPassword);
router.get('/check-forgot-eligibility', AuthController.checkForgotEligibility);
router.get('/find-workspaces', AuthController.findWorkspaces);
router.post('/logout', AuthController.logout); // no protect: a native client must be able to revoke its refresh token after the access token expired
router.post('/refresh', AuthController.refreshToken);
router.get('/me', protect, AuthController.getMe);
router.put('/change-password', protect, validateRequest(AuthValidation.changePassword), AuthController.changePassword);
router.put('/complete-workspace-setup', protect, AuthController.completeWorkspaceSetup);

// MFA
router.post('/mfa/setup', protect, AuthController.setupMFA);
router.post('/mfa/enable', protect, AuthController.enableMFA);

export const authRoutes = router;

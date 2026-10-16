import express from 'express';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { AuthValidation } from './auth.validation';

const router = express.Router();

// 180 Identity Sovereign Authentication Callback
router.post('/180-identity/callback', AuthController.handle180IdentityCallback);

// Session, Me & Profile synchronization
router.get('/me', protect, AuthController.getMe);
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', AuthController.logout);

// Workspace Onboarding & Setup
router.get('/check-username', AuthController.checkUsername);
router.post('/onboarding', protect, AuthController.onboarding);
router.put('/complete-workspace-setup', protect, AuthController.completeWorkspaceSetup);
router.post('/register-user', protect, validateRequest(AuthValidation.registerUser), AuthController.registerUser);

export const authRoutes = router;

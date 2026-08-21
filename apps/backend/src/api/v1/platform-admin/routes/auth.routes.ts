import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, getMe, updateProfile, changePassword, logout } from '../controllers/auth.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { loginSchema, updateProfileSchema, changePasswordSchema } from '../validation/auth.validation';

const superAdminAuth = require('../../../../system-configs/middleware/auth/superadmin-auth').default;

const router = Router();

const saLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many login attempts' } });

// Public (no auth)
router.post('/login', saLimiter, validateRequest(loginSchema), login);

// Requires super admin JWT
router.use(superAdminAuth);

router.get('/me', getMe);
router.put('/profile', validateRequest(updateProfileSchema), updateProfile);
router.put('/change-password', validateRequest(changePasswordSchema), changePassword);
router.post('/logout', logout);

export default router;

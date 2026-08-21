import express from 'express';
import { authRoutes } from './auth/auth.routes';
import { userRoutes } from './users/user.routes';
import { profileRoutes } from './profile/profile.routes';
import { preferenceRoutes } from './preferences/preference.routes';
import setupRoutes from './setup/setup.routes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/profile', profileRoutes);
router.use('/preferences', preferenceRoutes);
router.use('/setup', setupRoutes);

export default router;

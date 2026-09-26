import { Router } from 'express';
import authRoutes from './routes/auth.routes';
import overviewRoutes from './routes/overview.routes';
import companyRoutes from './routes/company.routes';
import userRoutes from './routes/user.routes';
import planRoutes from './routes/plan.routes';
import couponRoutes from './routes/coupon.routes';
import subscriptionRoutes from './routes/subscription.routes';
import settingsRoutes from './routes/settings.routes';
import featureFlagRoutes from './routes/feature-flag.routes';
import releaseNoteRoutes from './routes/release-note.routes';
import blogRoutes from './routes/blog.routes';
import logRoutes from './routes/log.routes';
import ticketRoutes from './routes/ticket.routes';
import aiRoutes from './routes/ai.routes';

import { VoiceforceController } from '../voiceforce/voiceforce.controller';

const superAdminAuth = require('../../../system-configs/middleware/auth/superadmin-auth').default;

const router = Router();

router.use('/auth', authRoutes);

// Protected Routes
router.use(superAdminAuth);

router.use('/overview', overviewRoutes);
router.use('/companies', companyRoutes);
router.use('/users', userRoutes);
router.use('/plans', planRoutes);
router.use('/coupons', couponRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/settings', settingsRoutes);
router.use('/feature-flags', featureFlagRoutes);
router.use('/release-notes', releaseNoteRoutes);
router.use('/blogs', blogRoutes);
router.use('/logs', logRoutes);
router.use('/tickets', ticketRoutes);
router.use('/ai', aiRoutes);
router.get('/voiceforce', VoiceforceController.getSuperadminOverview);
router.post('/voiceforce/killswitch', VoiceforceController.superadminKillswitch);

export default router;

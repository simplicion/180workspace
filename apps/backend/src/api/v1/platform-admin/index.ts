import { Router } from 'express';
import authRoutes from './routes/auth.routes';
import overviewRoutes from './routes/overview.routes';
import companyRoutes from './routes/company.routes';
import userRoutes from './routes/user.routes';
import planRoutes from './routes/plan.routes';
import couponRoutes from './routes/coupon.routes';
import subscriptionRoutes from './routes/subscription.routes';
import paymentRoutes from './routes/payment.routes';
import settingsRoutes from './routes/settings.routes';
import featureFlagRoutes from './routes/feature-flag.routes';
import releaseNoteRoutes from './routes/release-note.routes';
import logRoutes from './routes/log.routes';
import databaseRoutes from './routes/database.routes';
import announcementRoutes from './routes/announcement.routes';
import ticketRoutes from './routes/ticket.routes';
import forumRoutes from './routes/forum.routes';
import aiRoutes from './routes/ai.routes';

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
router.use('/payments', paymentRoutes);
router.use('/settings', settingsRoutes);
router.use('/feature-flags', featureFlagRoutes);
router.use('/release-notes', releaseNoteRoutes);
router.use('/logs', logRoutes);
router.use('/databases', databaseRoutes);
router.use('/announcements', announcementRoutes);
router.use('/tickets', ticketRoutes);
router.use('/forum', forumRoutes);
router.use('/ai', aiRoutes);

export default router;

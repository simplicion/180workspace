import { Router } from 'express';
import { protect } from '../../../system-configs/middleware/auth/auth';
import chatRoutes from './chat/chat.routes';
import emailRoutes from './emails/email.routes';
import meetingRoutes from './meetings/meeting.routes';
import notificationRoutes from './notifications/notification.routes';

const router = Router();

// Apply auth middleware to all communications routes
router.use(protect);

router.use('/chat', chatRoutes);
router.use('/emails', emailRoutes);
router.use('/meetings', meetingRoutes);
router.use('/notifications', notificationRoutes);

export default router;

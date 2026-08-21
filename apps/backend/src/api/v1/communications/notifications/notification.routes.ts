import { Router } from 'express';
import { getNotifications, markRead, markAllRead, deleteNotification } from './notification.controller';



const router = Router();

router.get('/', getNotifications);
router.put('/:id/read', markRead);
router.put('/read-all', markAllRead);
router.delete('/:id', deleteNotification);

export default router;

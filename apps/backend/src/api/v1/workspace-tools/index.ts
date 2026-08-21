import { Router } from 'express';
import aiRoutes from './ai-assistant/ai.routes';
import calendarRoutes from './calendar/calendar.routes';
import documentsRoutes from './documents/documents.routes';
import storageRoutes from './storage/storage.routes';

const router = Router();

router.use('/ai-assistant', aiRoutes);
router.use('/calendar', calendarRoutes);
router.use('/documents', documentsRoutes);
router.use('/storage', storageRoutes);

export default router;

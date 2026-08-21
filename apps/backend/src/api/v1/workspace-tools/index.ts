import { Router } from 'express';
import aiRoutes from './ai-assistant/ai.routes';
import calendarRoutes from './calendar/calendar.routes';
import documentsRoutes from './documents/documents.routes';
import storageRoutes from './storage/storage.routes';
import assetRoutes from './assets/asset.routes';

const router = Router();

router.use('/ai-assistant', aiRoutes);
router.use('/calendar', calendarRoutes);
router.use('/documents', documentsRoutes);
router.use('/storage', storageRoutes);
router.use('/assets', assetRoutes);

export default router;

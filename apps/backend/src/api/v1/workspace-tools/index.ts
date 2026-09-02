import { Router } from 'express';
// NOTE: AI assistant routes have been migrated to the centralized /api/v1/ai/* namespace.
// See: apps/backend/src/api/v1/ai/
import calendarRoutes from './calendar/calendar.routes';
import documentsRoutes from './documents/documents.routes';
import storageRoutes from './storage/storage.routes';
import assetRoutes from './assets/asset.routes';

const router = Router();

// AI-related routes are now served via the centralized /v1/ai/* mount in index.routes.ts
router.use('/calendar', calendarRoutes);
router.use('/documents', documentsRoutes);
router.use('/storage', storageRoutes);
router.use('/assets', assetRoutes);

export default router;

import { Router } from 'express';
import initRoutes from './init/init.routes';
import healthRoutes from './health/health.routes';
import migrationRoutes from './migration/migration.routes';
import { marketingRoutes } from './marketing/marketing.routes';
import auditRoutes from './audit/audit.routes';

const router = Router();

router.use('/init', initRoutes);
router.use('/health', healthRoutes);
router.use('/migration', migrationRoutes);
router.use('/marketing', marketingRoutes);
router.use('/audit', auditRoutes);

export default router;

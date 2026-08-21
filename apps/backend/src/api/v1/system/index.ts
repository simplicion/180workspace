import { Router } from 'express';
import initRoutes from './init/init.routes';
import healthRoutes from './health/health.routes';
import migrationRoutes from './migration/migration.routes';

const router = Router();

router.use('/init', initRoutes);
router.use('/health', healthRoutes);
router.use('/migration', migrationRoutes);

export default router;

import express from 'express';
import { rolesRoutes } from './roles/roles.routes';
import { appsRoutes } from './apps/apps.routes';
import { supportRoutes } from './support/support.routes';
import { configsRoutes } from './configs/configs.routes';

const router = express.Router();

router.use('/roles', rolesRoutes);
router.use('/apps', appsRoutes);
router.use('/support', supportRoutes);
router.use('/configs', configsRoutes);

export default router;

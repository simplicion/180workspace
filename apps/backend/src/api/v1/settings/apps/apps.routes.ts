import express from 'express';
import { AppsController } from './apps.controller';
import { authorize } from '../../../../system-configs/middleware/auth/auth';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { AppsValidation } from './apps.validation';

const router = express.Router();

router.use(authorize('admin'));

router.get('/', AppsController.getConfig);
router.put('/', validateRequest(AppsValidation.updateConfig), AppsController.updateConfig);

export const appsRoutes = router;

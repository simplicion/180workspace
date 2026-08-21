import express from 'express';
import { RolesController } from './roles.controller';
import { authorize } from '../../../../system-configs/middleware/auth/auth';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { RolesValidation } from './roles.validation';

const router = express.Router();

router.use(authorize('admin'));

router.get('/matrix', RolesController.getMatrix);
router.put('/bulk-update', validateRequest(RolesValidation.bulkUpdate), RolesController.bulkUpdate);

export const rolesRoutes = router;

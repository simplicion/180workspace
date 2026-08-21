import { Router } from 'express';
import * as ctrl from './vendor.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requirePermission } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

router.use(protect);
router.use(requirePermission('can_manage_finance', 'admin'));

router.get('/', ctrl.getVendors);
router.post('/', ctrl.createVendor);
router.put('/:id', ctrl.updateVendor);

export default router;

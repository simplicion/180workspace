import { Router } from 'express';
import * as ctrl from './task.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requireManager } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

router.get('/', protect, ctrl.getTasks);
router.post('/', protect, requireManager, ctrl.createTask);
router.get('/:id', protect, ctrl.getTaskById);
router.put('/:id', protect, ctrl.updateTask);
router.delete('/:id', protect, requireManager, ctrl.deleteTask);

export default router;

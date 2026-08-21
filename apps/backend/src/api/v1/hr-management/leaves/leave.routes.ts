import { Router } from 'express';
import * as ctrl from './leave.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requireHR } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

// Employee applies for leave
router.post('/', protect, ctrl.applyForLeave);

// Get leaves — admin/hr sees all, employee sees own
router.get('/', protect, ctrl.getLeaves);

// Approve / Reject — admin or hr
router.put('/:id/review', protect, requireHR, ctrl.reviewLeave);

// Delete own pending leave request
router.delete('/:id', protect, ctrl.deletePendingLeave);

export default router;

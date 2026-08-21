import { Router } from 'express';
import * as ctrl from './expense.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requirePermission } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

router.use(protect);

router.get('/', ctrl.getExpenses);
router.post('/', ctrl.createExpense);
router.get('/:id', ctrl.getExpenseById);
// Needs admin, manager, finance
router.patch('/:id/approve', requirePermission('can_manage_finance', 'admin'), ctrl.approveClaim);
router.patch('/:id/status', requirePermission('can_manage_finance', 'admin'), ctrl.updateStatus);

export default router;

import { Router } from 'express';
import * as ctrl from './salary.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requireHR } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

router.get('/', protect, requireHR, ctrl.getSalaries);
router.get('/preview', protect, requireHR, ctrl.getSalaryPreview);
router.post('/generate', protect, requireHR, ctrl.generateSalary);
router.put('/:id/approve', protect, requireHR, ctrl.approveSalary);
router.put('/:id/hr-approve', protect, requireHR, ctrl.hrApproveSalary);
router.put('/:id/mark-paid', protect, requireHR, ctrl.markPaid);
router.post('/:id/initiate-payout', protect, requireHR, ctrl.initiateSalaryPayout);
router.get('/my', protect, ctrl.getMySalaries);

export default router;

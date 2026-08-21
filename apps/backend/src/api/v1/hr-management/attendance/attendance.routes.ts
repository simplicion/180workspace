import { Router } from 'express';
import * as ctrl from './attendance.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requireHR } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

router.get('/', protect, requireHR, ctrl.getAttendance);
router.get('/my', protect, ctrl.getMyAttendance);
// Both route names for compatibility — frontend calls monthly-report
router.get('/report', protect, requireHR, ctrl.getMonthlyReport);
router.get('/monthly-report', protect, requireHR, ctrl.getMonthlyReport);
router.post('/mark', protect, requireHR, ctrl.markAttendance);
router.post('/auto-checkin', protect, ctrl.autoCheckIn);
router.post('/auto-checkout', protect, ctrl.autoCheckOut);
router.put('/:id', protect, requireHR, ctrl.updateAttendance);

export default router;

import { Router } from 'express';
import * as ctrl from './hrms.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requireHR } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

router.get('/dashboard', protect, requireHR, ctrl.getDashboard);
router.get('/ceo-insights', protect, requireHR, ctrl.getCEOInsights);
router.get('/weekly-trends', protect, ctrl.getWeeklyTrends);
router.get('/attendance-trend', protect, ctrl.getAttendanceTrend);
router.get('/attendance-report', protect, requireHR, ctrl.getAttendanceReport);
router.get('/salary-report', protect, requireHR, ctrl.getSalaryReport);
router.get('/goals', protect, ctrl.getGoals);

export default router;

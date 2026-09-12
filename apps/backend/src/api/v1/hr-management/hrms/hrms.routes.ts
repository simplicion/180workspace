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
router.post('/goals', protect, ctrl.createGoal);
router.patch('/goals/:id', protect, ctrl.updateGoal);
router.delete('/goals/:id', protect, ctrl.deleteGoal);

router.get('/sticky-notes', protect, ctrl.getStickyNotes);
router.post('/sticky-notes', protect, ctrl.createStickyNote);
router.patch('/sticky-notes/:id', protect, ctrl.updateStickyNote);
router.delete('/sticky-notes/:id', protect, ctrl.deleteStickyNote);

export default router;

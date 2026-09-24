import { Router } from 'express';
import * as analyticsController from './analytics.controller';
import { authorize } from '../../../../system-configs/middleware/auth/auth';

const router = Router();

// All analytics routes are restricted to admin/manager roles
router.use(authorize('admin', 'manager'));

// Team Activity
router.get('/team-activity', analyticsController.getTeamActivity);

// Financial Analytics
router.get('/financial/stats', analyticsController.getFinancialStats);
router.get('/financial/pl-report', analyticsController.getPLReport);
router.get('/financial/projects', analyticsController.getAllProjectsProfitability);
router.get('/financial/projects/:projectId', analyticsController.getProjectFinancials);

export default router;

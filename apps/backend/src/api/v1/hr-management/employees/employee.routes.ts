import { Router } from 'express';
import * as ctrl from './employee.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';

const router = Router();

// GET /api/employee/dashboard
router.get('/dashboard', protect, ctrl.getDashboardStats);

export default router;

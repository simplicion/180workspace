import { Router } from 'express';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requireRole } from '../../../../system-configs/middleware/auth/rbac';
import * as activityController from './activity.controller';

const router = Router();

// GET /api/activity — list automation logs (activity feed)
router.get('/', protect, activityController.getActivityLogs);

// PUT /api/activity/access — Admin only: grant/revoke activity feed access
router.put('/access', protect, requireRole(['admin']), activityController.updateActivityAccess);

export default router;

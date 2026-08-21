import { Router } from 'express';
import * as ctrl from './designation.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requirePermission } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

// All designation routes require authentication
router.use(protect);

// GET /api/designations - list available designations for a company
router.get('/', ctrl.getDesignations);

// POST /api/designations - create a new custom designation
// We allow users with team management permission to add new designations
router.post('/', requirePermission('can_manage_team', 'admin'), ctrl.createDesignation);

export default router;

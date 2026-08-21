import { Router } from 'express';
import * as ctrl from './holiday.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requireHR } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

// Get all holidays (all authenticated users)
router.get('/', protect, ctrl.getHolidays);

// Create a holiday (admin / hr only)
router.post('/', protect, requireHR, ctrl.createHoliday);

// Update a holiday (admin / hr only)
router.put('/:id', protect, requireHR, ctrl.updateHoliday);

// Delete a holiday (admin / hr only)
router.delete('/:id', protect, requireHR, ctrl.deleteHoliday);

export default router;

import { Router } from 'express';
import * as milestoneController from './milestone.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';

const router = Router();

// Get milestones for a project
router.get('/project/:projectId', protect, milestoneController.getMilestones);

// Create a milestone in a project
router.post('/project/:projectId', protect, milestoneController.createMilestone);

// Toggle complete
router.patch('/:id/toggle', protect, milestoneController.toggleMilestone);

// Update milestone
router.put('/:id', protect, milestoneController.updateMilestone);

// Delete milestone
router.delete('/:id', protect, milestoneController.deleteMilestone);

export default router;

const express = require('express');
const router = express.Router();
const milestoneController = require('./milestone.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');

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

module.exports = router;

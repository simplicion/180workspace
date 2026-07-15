'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireManager } = require('../../../system-configs/middleware/auth/rbac.js');
const ctrl = require('./goal.controller');

router.get('/', protect, ctrl.getGoals);
router.post('/', protect, requireManager, ctrl.createGoal);
router.get('/:id', protect, ctrl.getGoalById);
router.put('/:id', protect, requireManager, ctrl.updateGoal);
router.delete('/:id', protect, requireManager, ctrl.deleteGoal);

module.exports = router;

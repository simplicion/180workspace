'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireManager } = require('../../../system-configs/middleware/auth/rbac.js');
const ctrl = require('./task.controller');

router.get('/', protect, ctrl.getTasks);
router.post('/', protect, requireManager, ctrl.createTask);
router.get('/:id', protect, ctrl.getTaskById);
router.put('/:id', protect, ctrl.updateTask);
router.delete('/:id', protect, requireManager, ctrl.deleteTask);

module.exports = router;

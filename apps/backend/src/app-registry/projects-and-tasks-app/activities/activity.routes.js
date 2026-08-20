'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireRole } = require('../../../system-configs/middleware/auth/rbac.js');
const activityController = require('./activity.controller.js');

// GET /api/activity — list automation logs (activity feed)
router.get('/', protect, activityController.getActivityLogs);

// PUT /api/activity/access — Admin only: grant/revoke activity feed access
router.put('/access', protect, requireRole(['admin']), activityController.updateActivityAccess);

module.exports = router;

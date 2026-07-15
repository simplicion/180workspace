'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireHR } = require('../../../system-configs/middleware/auth/rbac.js');
const ctrl = require('../controllers/notification.controller');

router.get('/', protect, ctrl.getNotifications);
router.put('/:id/read', protect, ctrl.markRead);
router.put('/read-all', protect, ctrl.markAllRead);
router.delete('/:id', protect, ctrl.deleteNotification);

module.exports = router;

'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireHR } = require('../../../system-configs/middleware/auth/rbac.js');
const ctrl = require('./attendance.controller');

router.get('/', protect, requireHR, ctrl.getAttendance);
router.get('/my', protect, ctrl.getMyAttendance);
// Both route names for compatibility â€” frontend calls monthly-report
router.get('/report', protect, requireHR, ctrl.getMonthlyReport);
router.get('/monthly-report', protect, requireHR, ctrl.getMonthlyReport);
router.post('/mark', protect, requireHR, ctrl.markAttendance);
router.post('/auto-checkin', protect, ctrl.autoCheckIn);
router.post('/auto-checkout', protect, ctrl.autoCheckOut);
router.put('/:id', protect, requireHR, ctrl.updateAttendance);

module.exports = router;

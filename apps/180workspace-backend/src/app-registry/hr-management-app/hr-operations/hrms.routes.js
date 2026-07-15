'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireHR } = require('../../../system-configs/middleware/auth/rbac.js');
const ctrl = require('./hrms.controller');

router.get('/dashboard', protect, requireHR, ctrl.getDashboard);
router.get('/ceo-insights', protect, requireHR, ctrl.getCEOInsights);
router.get('/weekly-trends', protect, ctrl.getWeeklyTrends);
router.get('/attendance-trend', protect, ctrl.getAttendanceTrend);
router.get('/attendance-report', protect, requireHR, ctrl.getAttendanceReport);
router.get('/salary-report', protect, requireHR, ctrl.getSalaryReport);

module.exports = router;

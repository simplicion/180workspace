'use strict';

const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const { protect, authorize } = require('../../../system-configs/middleware/auth/auth.js');

// All analytics routes are protected and restricted to admin/manager roles
router.use(protect);
router.use(authorize('admin', 'manager'));

router.get('/plausible', analyticsController.getPlausibleStats);
router.post('/plausible/test', analyticsController.testPlausibleConnection);

// Financial Analytics
router.get('/financial/stats', analyticsController.getFinancialStats);
router.get('/financial/pl-report', analyticsController.getPLReport);
router.get('/financial/projects', analyticsController.getAllProjectsProfitability);
router.get('/financial/projects/:projectId', analyticsController.getProjectFinancials);

module.exports = router;

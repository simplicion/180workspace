'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const empCtrl = require('./employee.controller');

// GET /api/employee/dashboard
router.get('/dashboard', protect, empCtrl.getDashboardStats);

module.exports = router;

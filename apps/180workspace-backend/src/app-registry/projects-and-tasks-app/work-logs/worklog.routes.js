'use strict';

const express = require('express');
const router = express.Router();
const workLogController = require('./worklog.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');

router.use(protect);

router.post('/', workLogController.submitWorkLog);
router.get('/my', workLogController.getMyLogs);
router.get('/all', workLogController.getAllLogs);
router.get('/reviews', workLogController.getPendingReviews);
router.get('/stats', workLogController.getDashboardStats);
router.patch('/:id/review', workLogController.reviewWorkLog);

module.exports = router;

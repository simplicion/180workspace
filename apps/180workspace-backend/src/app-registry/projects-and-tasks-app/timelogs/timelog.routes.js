'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const ctrl = require('./timelog.controller');

// GET /api/timelogs - list timelogs
router.get('/', protect, ctrl.getTimeLogs);

// POST /api/timelogs/start - start timer
router.post('/start', protect, ctrl.startTimer);

// POST /api/timelogs/stop - stop running timer
router.post('/stop', protect, ctrl.stopTimer);

// POST /api/timelogs - manual log entry
router.post('/', protect, ctrl.createEntry);

// DELETE /api/timelogs/:id
router.delete('/:id', protect, ctrl.deleteTimeLog);

module.exports = router;

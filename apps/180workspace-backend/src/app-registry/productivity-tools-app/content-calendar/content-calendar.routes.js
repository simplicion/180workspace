const express = require('express');
const router = express.Router();
const contentCalendarController = require('./content-calendar.controller');
const { protect, authorize } = require('../../../system-configs/middleware/auth/auth.js');

// All routes require authentication
router.use(protect);

// Calendar CRUD & Generation
router.post('/create', contentCalendarController.createCalendar); // Form submission + AI generation
router.get('/', contentCalendarController.listCalendars);
router.get('/:id', contentCalendarController.getCalendar);
router.put('/:id', contentCalendarController.updateCalendar);
router.delete('/:id', contentCalendarController.deleteCalendar);

// Calendar Pieces CRUD
router.get('/:id/pieces', contentCalendarController.getCalendarPieces);
router.put('/:id/pieces/:pieceId', contentCalendarController.updateCalendarPiece);

module.exports = router;

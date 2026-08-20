'use strict';

const { ContentCalendarService } = require('@workspace/social-media');

// LIST calendars
exports.listCalendars = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const calendars = await ContentCalendarService.listCalendars(limit, offset);
        res.json({ calendars });
    } catch (err) { next(err); }
};

// GET single calendar
exports.getCalendar = async (req, res, next) => {
    try {
        const result = await ContentCalendarService.getCalendar(req.params.id);
        res.json(result);
    } catch (err) { 
        if (err.message === 'Calendar not found') {
            return res.status(404).json({ error: 'Calendar not found' });
        }
        next(err); 
    }
};

// CREATE calendar (Triggers AI Generation)
exports.createCalendar = async (req, res, next) => {
    try {
        const result = await ContentCalendarService.createCalendar(req.user.companyId, req.body, req.user);
        res.status(201).json(result);
    } catch (err) { 
        if (err.message) {
            return res.status(400).json({ error: err.message });
        }
        next(err); 
    }
};

// UPDATE calendar
exports.updateCalendar = async (req, res, next) => {
    try {
        const calendar = await ContentCalendarService.updateCalendar(req.params.id, req.body);
        res.json({ calendar });
    } catch (err) { next(err); }
};

// DELETE calendar
exports.deleteCalendar = async (req, res, next) => {
    try {
        const result = await ContentCalendarService.deleteCalendar(req.params.id);
        res.json(result);
    } catch (err) { next(err); }
};

// GET pieces
exports.getCalendarPieces = async (req, res, next) => {
    try {
        const pieces = await ContentCalendarService.getCalendarPieces(req.params.id);
        res.json({ pieces });
    } catch (err) { next(err); }
};

// UPDATE piece
exports.updateCalendarPiece = async (req, res, next) => {
    try {
        const piece = await ContentCalendarService.updateCalendarPiece(req.params.pieceId, req.body);
        res.json({ piece });
    } catch (err) { next(err); }
};


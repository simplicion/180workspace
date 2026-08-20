'use strict';

const { TimeLogService } = require('@workspace/projects-and-tasks-domain');

exports.getTimeLogs = async (req, res, next) => {
    try {
        const result = await TimeLogService.getTimeLogs(req.query, req.user);
        res.json(result);
    } catch (err) { next(err); }
};

exports.startTimer = async (req, res, next) => {
    try {
        const result = await TimeLogService.startTimer(req.body, req.user);
        res.status(201).json(result);
    } catch (err) { next(err); }
};

exports.stopTimer = async (req, res, next) => {
    try {
        const result = await TimeLogService.stopTimer(req.user);
        res.json(result);
    } catch (err) {
        if (err.message === 'No active timer found.') return res.status(404).json({ error: err.message });
        next(err);
    }
};

exports.createEntry = async (req, res, next) => {
    try {
        const result = await TimeLogService.createEntry(req.body, req.user);
        res.status(201).json(result);
    } catch (err) { next(err); }
};

exports.deleteTimeLog = async (req, res, next) => {
    try {
        const result = await TimeLogService.deleteTimeLog(req.params.id, req.user);
        res.json(result);
    } catch (err) {
        if (err.message === 'Log not found.') return res.status(404).json({ error: err.message });
        if (err.message === 'Permission denied.') return res.status(403).json({ error: err.message });
        next(err);
    }
};

module.exports = exports;

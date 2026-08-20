'use strict';

const { WorkLogService } = require('@workspace/projects-and-tasks-domain');

exports.submitWorkLog = async (req, res, next) => {
    try {
        const result = await WorkLogService.submitWorkLog(req.body, req.user);
        res.status(201).json(result);
    } catch (err) { next(err); }
};

exports.getLogs = async (req, res, next) => {
    try {
        const result = await WorkLogService.getLogs(req.query);
        res.json(result);
    } catch (err) {
        if (err.message === 'projectId is required') return res.status(400).json({ success: false, message: err.message });
        next(err);
    }
};

exports.getMyLogs = async (req, res, next) => {
    try {
        const result = await WorkLogService.getMyLogs(req.query, req.user);
        res.json(result);
    } catch (err) { next(err); }
};

exports.getAllLogs = async (req, res, next) => {
    try {
        const result = await WorkLogService.getAllLogs(req.query);
        res.json(result);
    } catch (err) { next(err); }
};

exports.getPendingReviews = async (req, res, next) => {
    try {
        const result = await WorkLogService.getPendingReviews(req.query);
        res.json(result);
    } catch (err) { next(err); }
};

exports.getDashboardStats = async (req, res, next) => {
    try {
        const result = await WorkLogService.getDashboardStats(req.query, req.user);
        res.json(result);
    } catch (err) { next(err); }
};

exports.reviewWorkLog = async (req, res, next) => {
    try {
        const result = await WorkLogService.reviewWorkLog(req.params.id, req.body, req.user);
        res.json(result);
    } catch (err) { next(err); }
};

module.exports = exports;

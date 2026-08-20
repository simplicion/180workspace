'use strict';

const { ActivityService } = require('@workspace/projects-and-tasks-domain');

exports.getActivityLogs = async (req, res, next) => {
    try {
        const result = await ActivityService.getActivityLogs(req.query, req.user);
        res.json(result);
    } catch (err) { next(err); }
};

exports.updateActivityAccess = async (req, res, next) => {
    try {
        const result = await ActivityService.updateActivityAccess(req.body.userId, req.body.canViewActivity);
        res.json(result);
    } catch (err) {
        if (err.message === 'User ID is required') return res.status(400).json({ error: err.message });
        if (err.message === 'User not found') return res.status(404).json({ error: err.message });
        next(err);
    }
};

module.exports = exports;

'use strict';

const { TaskService } = require('@workspace/projects-and-tasks-domain');

exports.getTasks = async (req, res, next) => {
    try {
        const result = await TaskService.getTasks(req.query, req.user);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createTask = async (req, res, next) => {
    try {
        const result = await TaskService.createTask(req.body, req.user);
        res.status(201).json({ success: true, ...result });
    } catch (err) { next(err); }
};

exports.getTaskById = async (req, res, next) => {
    try {
        const result = await TaskService.getTaskById(req.params.id);
        res.json(result);
    } catch (err) {
        if (err.message === 'Task not found') return res.status(404).json({ error: err.message });
        next(err);
    }
};

exports.updateTask = async (req, res, next) => {
    try {
        const result = await TaskService.updateTask(req.params.id, req.body, req.user);
        res.json({ success: true, ...result });
    } catch (err) {
        if (err.message === 'Task not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Access denied') || err.message.includes('Cannot change status')) return res.status(403).json({ error: err.message });
        next(err);
    }
};

exports.deleteTask = async (req, res, next) => {
    try {
        const result = await TaskService.deleteTask(req.params.id, req.user);
        res.json(result);
    } catch (err) { next(err); }
};

module.exports = exports;

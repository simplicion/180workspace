'use strict';

const { ModuleService } = require('@workspace/projects-and-tasks-domain');

exports.getModulesByProject = async (req, res, next) => {
    try {
        const result = await ModuleService.getModulesByProject(req.params.projectId);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createModule = async (req, res, next) => {
    try {
        const result = await ModuleService.createModule(req.body, req.user);
        res.status(201).json(result);
    } catch (err) {
        if (err.message === 'Project not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Only project owners')) return res.status(403).json({ error: err.message });
        next(err);
    }
};

exports.updateModule = async (req, res, next) => {
    try {
        const result = await ModuleService.updateModule(req.params.id, req.body, req.user);
        res.json(result);
    } catch (err) {
        if (err.message === 'Module not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Not authorized')) return res.status(403).json({ error: err.message });
        next(err);
    }
};

exports.deleteModule = async (req, res, next) => {
    try {
        const result = await ModuleService.deleteModule(req.params.id, req.query.mode, req.user);
        res.json(result);
    } catch (err) {
        if (err.message === 'Module not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Only project owners')) return res.status(403).json({ error: err.message });
        next(err);
    }
};

module.exports = exports;

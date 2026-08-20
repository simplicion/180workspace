'use strict';

const { ProjectService } = require('@workspace/projects-and-tasks-domain');

exports.getProjects = async (req, res, next) => {
    try {
        const result = await ProjectService.getProjects({
            query: req.query,
            user: req.user
        });
        res.json(result);
    } catch (err) { next(err); }
};

exports.createProject = async (req, res, next) => {
    try {
        const project = await ProjectService.createProject({
            data: req.body,
            user: req.user
        });
        res.status(201).json({ project });
    } catch (err) {
        if (err.message === 'Project name is required') {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
};

exports.getProjectById = async (req, res, next) => {
    try {
        const result = await ProjectService.getProjectById(req.params.id, {
            user: req.user
        });
        // Backwards compatibility for _id
        result.project._id = result.project.id;
        if (result.project.members) {
            result.project.members.forEach(m => m && (m._id = m.id));
        }
        res.json(result);
    } catch (err) {
        if (err.message === 'Project not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};

exports.updateProject = async (req, res, next) => {
    try {
        const result = await ProjectService.updateProject(req.params.id, req.body, {
            user: req.user
        });
        result.project._id = result.project.id;
        res.json(result);
    } catch (err) {
        if (err.message === 'Project not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Access denied')) return res.status(403).json({ error: err.message });
        next(err); 
    }
};

exports.deleteProject = async (req, res, next) => {
    try {
        const result = await ProjectService.deleteProject(req.params.id, {
            user: req.user
        });
        res.json(result);
    } catch (err) {
        if (err.message === 'Project not found') return res.status(404).json({ error: err.message });
        if (err.message === 'Access denied.') return res.status(403).json({ error: err.message });
        next(err); 
    }
};

exports.updateMembers = async (req, res, next) => {
    try {
        const result = await ProjectService.updateMembers(req.params.id, req.body.memberIds, {
            user: req.user
        });
        result.project._id = result.project.id;
        res.json(result);
    } catch (err) {
        if (err.message === 'Project not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};

exports.updateClients = async (req, res, next) => {
    try {
        const result = await ProjectService.updateClients(req.params.id, req.body.clientIds);
        result.project._id = result.project.id;
        res.json(result);
    } catch (err) {
        if (err.message === 'Project not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};

exports.getProjectTasks = async (req, res, next) => {
    try {
        const result = await ProjectService.getProjectTasks(req.params.id);
        result.tasks.forEach(t => t._id = t.id);
        res.json(result);
    } catch (err) { next(err); }
};

exports.getProjectActivity = async (req, res, next) => {
    try {
        const result = await ProjectService.getProjectActivity(req.params.id);
        res.json(result);
    } catch (err) { next(err); }
};

exports.getProjectNotes = async (req, res, next) => {
    try {
        const result = await ProjectService.getProjectNotes(req.params.id);
        result.notes.forEach(n => { n._id = n.id; });
        res.json(result);
    } catch (err) { next(err); }
};

exports.createProjectNote = async (req, res, next) => {
    try {
        const result = await ProjectService.createProjectNote(req.params.id, req.body.content, {
            user: req.user
        });
        result.note._id = result.note.id;
        res.status(201).json(result);
    } catch (err) {
        if (err.message.includes('not supported')) return res.status(400).json({ error: err.message });
        next(err); 
    }
};

exports.updateProjectNote = async (req, res, next) => {
    try {
        const result = await ProjectService.updateProjectNote(req.params.id, req.params.noteId, req.body.content, {
            user: req.user
        });
        result.note._id = result.note.id;
        res.json(result);
    } catch (err) {
        if (err.message.includes('not supported')) return res.status(400).json({ error: err.message });
        if (err.message === 'Note not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Not authorized')) return res.status(403).json({ error: err.message });
        next(err); 
    }
};

exports.deleteProjectNote = async (req, res, next) => {
    try {
        const result = await ProjectService.deleteProjectNote(req.params.id, req.params.noteId, {
            user: req.user
        });
        res.json(result);
    } catch (err) {
        if (err.message.includes('not supported')) return res.status(400).json({ error: err.message });
        if (err.message === 'Note not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Not authorized')) return res.status(403).json({ error: err.message });
        next(err); 
    }
};

module.exports = exports;

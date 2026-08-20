'use strict';

const { MilestoneService } = require('@workspace/projects-and-tasks-domain');
const { InvoiceService } = require('@workspace/finance');

exports.getMilestones = async (req, res, next) => {
    try {
        const result = await MilestoneService.getMilestones(req.params.projectId, req.user);
        res.json(result);
    } catch (error) { 
        if (error.message === 'Project not found') return res.status(404).json({ error: error.message });
        if (error.message === 'Not authorized for this project') return res.status(403).json({ error: error.message });
        next(error); 
    }
};

exports.createMilestone = async (req, res, next) => {
    try {
        const result = await MilestoneService.createMilestone(req.params.projectId, req.body, req.user);
        res.status(201).json(result);
    } catch (error) { 
        if (error.message === 'Project not found') return res.status(404).json({ error: error.message });
        if (error.message === 'Not authorized') return res.status(403).json({ error: error.message });
        next(error); 
    }
};

exports.toggleMilestone = async (req, res, next) => {
    try {
        const result = await MilestoneService.toggleMilestone(
            req.params.id, 
            req.user, 
            async (m, p) => InvoiceService.generateFromMilestone(m, p, req.user)
        );
        res.json(result);
    } catch (error) { 
        if (error.message === 'Milestone not found') return res.status(404).json({ error: error.message });
        if (error.message === 'Not authorized') return res.status(403).json({ error: error.message });
        next(error); 
    }
};

exports.deleteMilestone = async (req, res, next) => {
    try {
        const result = await MilestoneService.deleteMilestone(req.params.id, req.user);
        res.json(result);
    } catch (error) { 
        if (error.message === 'Milestone not found') return res.status(404).json({ error: error.message });
        if (error.message.includes('Only managers or admins')) return res.status(403).json({ error: error.message });
        next(error); 
    }
};

exports.updateMilestone = async (req, res, next) => {
    try {
        const result = await MilestoneService.updateMilestone(req.params.id, req.body, req.user);
        res.json(result);
    } catch (error) { 
        if (error.message === 'Milestone not found') return res.status(404).json({ error: error.message });
        if (error.message === 'Not authorized') return res.status(403).json({ error: error.message });
        next(error); 
    }
};

module.exports = exports;

'use strict';

const InvoiceService = require('../../finance-app/finance/InvoiceService.js');

exports.getMilestones = async (req, res, next) => {
    try {
        const Milestone = req.prisma.milestone;
        const Project = req.prisma.project;
        const { projectId } = req.params;

        const p = await Project.findUnique({ where: { id: projectId } });
        if (!p) return res.status(404).json({ error: 'Project not found' });

        // Authorization check
        const isMember = p.memberIds?.some(m => m.toString() === req.user.id?.toString());
        const isClient = p.clientIds?.some(m => m.toString() === req.user.id?.toString());
        const isAdmin = ['admin', 'manager', 'hr'].includes(req.user.role);

        if (!isAdmin && !isMember && !isClient) {
            return res.status(403).json({ error: 'Not authorized for this project' });
        }

        const milestones = await Milestone.findMany({ 
            where: { projectId },
            orderBy: [{ order: 'asc' }, { dueDate: 'asc' }]
        });
        res.json({ milestones });
    } catch (error) { next(error); }
};

exports.createMilestone = async (req, res, next) => {
    try {
        const Milestone = req.prisma.milestone;
        const Project = req.prisma.project;
        const { projectId } = req.params;

        const p = await Project.findUnique({ where: { id: projectId } });
        if (!p) return res.status(404).json({ error: 'Project not found' });

        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const milestone = await Milestone.create({ data: {
            ...req.body,
            projectId: p.id,
            createdById: req.user.id
        } });

        res.status(201).json({ milestone });
    } catch (error) { next(error); }
};

exports.toggleMilestone = async (req, res, next) => {
    try {
        const Milestone = req.prisma.milestone;
        const Project = req.prisma.project;
        const milestone = await Milestone.findUnique({ where: { id: req.params.id } });
        if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

        const p = await Project.findUnique({ where: { id: milestone.projectId } });
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const completed = !milestone.completed;
        const completedAt = completed ? new Date() : null;
        const completedById = completed ? req.user.id : null;

        const updateData = { completed, completedAt, completedById };

        // Auto-Invoice Logic
        let invoice = null;
        if (completed && milestone.autoInvoice && !milestone.invoiceId) {
            // Provide updated milestone state to generation service
            const m = { ...milestone, ...updateData };
            invoice = await InvoiceService.generateFromMilestone(m, p, req.prisma, req.user);
            if (invoice) {
                updateData.invoiceId = invoice.id;
            }
        }

        const updatedMilestone = await Milestone.update({
            where: { id: milestone.id },
            data: updateData
        });

        res.json({ milestone: updatedMilestone, invoice });
    } catch (error) { next(error); }
};

exports.deleteMilestone = async (req, res, next) => {
    try {
        const Milestone = req.prisma.milestone;
        const milestone = await Milestone.findUnique({ where: { id: req.params.id } });
        if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only managers or admins can delete milestones' });
        }

        await Milestone.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) { next(error); }
};

exports.updateMilestone = async (req, res, next) => {
    try {
        const Milestone = req.prisma.milestone;
        const milestone = await Milestone.findUnique({ where: { id: req.params.id } });
        if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const updatedMilestone = await Milestone.update({ 
            where: { id: req.params.id }, 
            data: req.body 
        });

        res.json({ milestone: updatedMilestone });
    } catch (error) { next(error); }
};

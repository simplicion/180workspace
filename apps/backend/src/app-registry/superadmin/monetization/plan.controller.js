'use strict';

exports.list = async (req, res) => {
    try {
        const plans = await req.prisma.plan.findMany({
            orderBy: { price: 'asc' }
        });
        res.json({ plans });
    } catch (err) {
        console.error('[Plan Controller] list error:', err);
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
};

exports.create = async (req, res) => {
    try {
        const plan = await req.prisma.plan.create({ data: req.body });
        res.status(201).json({ plan });
    } catch (err) {
        console.error('[Plan Controller] create error:', err);
        if (err.code === 'P2002') return res.status(400).json({ error: 'Plan name already exists' });
        res.status(500).json({ error: err.message || 'Failed to create plan' });
    }
};

exports.update = async (req, res) => {
    try {
        const plan = await req.prisma.plan.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json({ plan });
    } catch (err) {
        console.error('[Plan Controller] update error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Plan not found' });
        res.status(500).json({ error: 'Failed to update plan' });
    }
};

exports.remove = async (req, res) => {
    try {
        await req.prisma.plan.delete({ where: { id: req.params.id } });
        res.json({ message: 'Plan deleted' });
    } catch (err) {
        console.error('[Plan Controller] remove error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Plan not found' });
        res.status(500).json({ error: 'Failed to delete plan' });
    }
};

exports.toggleActive = async (req, res) => {
    try {
        const plan = await req.prisma.plan.findUnique({ where: { id: req.params.id } });
        if (!plan) return res.status(404).json({ error: 'Plan not found' });
        
        const updatedPlan = await req.prisma.plan.update({
            where: { id: req.params.id },
            data: { isActive: !plan.isActive }
        });
        res.json({ plan: updatedPlan });
    } catch (err) {
        console.error('[Plan Controller] toggleActive error:', err);
        res.status(500).json({ error: 'Failed to toggle plan' });
    }
};

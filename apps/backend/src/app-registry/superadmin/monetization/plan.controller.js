const { prisma } = require('@workspace/db');
'use strict';

exports.list = async (req, res) => {
    try {
        const plans = await prisma.plan.findMany({
            orderBy: { price: 'asc' }
        });
        res.json({ plans });
    } catch (err) {
        console.error('[Plan Controller] list error:', err);
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
};

exports.create = async (req, res) => {
    return res.status(403).json({ error: 'Plan creation is disabled. Pricing is managed via codebase for stability.' });
};

exports.update = async (req, res) => {
    return res.status(403).json({ error: 'Plan modification is disabled. Pricing is managed via codebase for stability.' });
};

exports.remove = async (req, res) => {
    return res.status(403).json({ error: 'Plan deletion is disabled. Pricing is managed via codebase for stability.' });
};

exports.toggleActive = async (req, res) => {
    return res.status(403).json({ error: 'Toggling plan status is disabled. Pricing is managed via codebase for stability.' });
};

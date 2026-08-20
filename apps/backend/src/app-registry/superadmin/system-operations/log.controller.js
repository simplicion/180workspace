const { prisma } = require('@workspace/db');
﻿'use strict';

exports.activityLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);

        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }).activityLog.count(),
        ]);
        res.json({ logs, total });
    } catch (err) {
        console.error('[Log Controller] Activity logs failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
};

exports.failedLogins = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const where = {
            action: { contains: 'login', mode: 'insensitive' },
            success: false,
        };

        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }).activityLog.count({ where }),
        ]);
        res.json({ logs, total });
    } catch (err) {
        console.error('[Log Controller] Failed logins query failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch error logs' });
    }
};

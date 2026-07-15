'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireManager } = require('../../../system-configs/middleware/auth/rbac.js');

// GET /api/audit â€” list audit logs (manager/admin only)
router.get('/', protect, requireManager, async (req, res, next) => {
    try {
        const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query;
        
        const query = {};
        if (action) query.action = { contains: action, mode: 'insensitive' };
        if (userId) query.userId = userId;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.gte = new Date(startDate);
            if (endDate) query.createdAt.lte = new Date(endDate);
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [logs, total] = await Promise.all([
            req.prisma.auditLog.findMany({
                where: query,
                include: {
                    user: {
                        select: { name: true, email: true, role: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit)
            }),
            req.prisma.auditLog.count({ where: query })
        ]);
        res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (err) { next(err); }
});

// Utility to write audit log (used by other controllers)
router.log = async ({ userId, action, resourceType = '', resourceId = '', details = {}, req }) => {
    try {
        if (req && req.prisma) {
            await req.prisma.auditLog.create({
                data: {
                    userId,
                    action,
                    resourceType,
                    resourceId: String(resourceId),
                    details: details || {},
                    ipAddress: req?.ip || '',
                    userAgent: req?.headers?.['user-agent'] || '',
                }
            });
        }
    } catch (e) { console.error('[AuditLog Error]', e); }
};

module.exports = router;

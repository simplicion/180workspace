'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireRole } = require('../../../system-configs/middleware/auth/rbac.js');

// GET /api/activity â€” list automation logs (activity feed)
router.get('/', protect, async (req, res, next) => {
    try {
        const { page = 1, limit = 50, eventType, triggeredBy, startDate, endDate, includeNotifications = 'true' } = req.query;

        const activityQuery = {};
        if (eventType) activityQuery.eventType = eventType;
        if (triggeredBy) activityQuery.triggeredById = triggeredBy;
        
        if (startDate || endDate) {
            activityQuery.timestamp = {};
            if (startDate) activityQuery.timestamp.gte = new Date(startDate);
            if (endDate) activityQuery.timestamp.lte = new Date(endDate);
        }

        const skip = (Number(page) - 1) * Number(limit);
        const isAdmin = ['admin', 'manager'].includes(req.user.role);
        const hasAccess = isAdmin || req.user.canViewActivity;

        let activityLogs = [];
        let activitiesTotal = 0;

        // Only admins or permitted users can see system activities
        if (hasAccess) {
            [activityLogs, activitiesTotal] = await Promise.all([
                req.prisma.automationLog.findMany({
                    where: activityQuery,
                    include: {
                        triggeredBy: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                        targetUser: { select: { id: true, name: true, email: true, photoUrl: true, role: true } }
                    },
                    orderBy: { timestamp: 'desc' },
                    skip: skip,
                    take: Number(limit)
                }),
                req.prisma.automationLog.count({ where: activityQuery }),
            ]);
        }

        let combinedLogs = activityLogs.map(log => ({ ...log, isNotification: false }));

        // If including notifications, fetch user specifically-intended ones
        if (includeNotifications === 'true') {
            const notifQuery = { userId: req.user.id };
            if (startDate || endDate) {
                notifQuery.createdAt = {};
                if (startDate) notifQuery.createdAt.gte = new Date(startDate);
                if (endDate) notifQuery.createdAt.lte = new Date(endDate);
            }

            const notifications = await req.prisma.notification.findMany({
                where: notifQuery,
                orderBy: { createdAt: 'desc' },
                take: Number(limit)
            });

            const normalizedNotifs = notifications.map(n => ({
                id: n.id,
                eventType: n.type,
                triggeredBy: null,
                description: n.message,
                metadata: { title: n.title, actionUrl: n.link, link: n.link },
                timestamp: n.createdAt,
                isNotification: true,
                isRead: n.isRead,
                title: n.title
            }));

            // Combine and sort by timestamp
            combinedLogs = [...combinedLogs, ...normalizedNotifs]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, Number(limit));
        }

        res.json({
            logs: combinedLogs,
            total: activitiesTotal,
            page: Number(page),
            pages: Math.ceil(activitiesTotal / Number(limit))
        });
    } catch (err) {
        next(err);
    }
});

// PUT /api/activity/access â€” Admin only: grant/revoke activity feed access
router.put('/access', protect, requireRole(['admin']), async (req, res, next) => {
    try {
        const { userId, canViewActivity } = req.body;

        if (!userId) return res.status(400).json({ error: 'User ID is required' });

        const user = await req.prisma.user.update({
            where: { id: userId },
            data: { canViewActivity: !!canViewActivity }
        }).catch(() => null);
        
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ message: `Access ${user.canViewActivity ? 'granted' : 'revoked'} for ${user.name}`, user });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

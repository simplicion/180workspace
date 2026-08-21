import type { UserContext } from '../tasks/task.service.js';

import { prisma } from '@workspace/db';

export class ActivityService {
    static async getActivityLogs(queryOptions: any, user: UserContext) {
        const { page = 1, limit = 50, eventType, triggeredBy, startDate, endDate, includeNotifications = 'true' } = queryOptions;

        const activityQuery: any = {};
        if (eventType) activityQuery.eventType = eventType;
        if (triggeredBy) activityQuery.triggeredById = triggeredBy;
        
        if (startDate || endDate) {
            activityQuery.timestamp = {};
            if (startDate) activityQuery.timestamp.gte = new Date(startDate);
            if (endDate) activityQuery.timestamp.lte = new Date(endDate);
        }

        const skip = (Number(page) - 1) * Number(limit);
        const isAdmin = ['admin', 'manager'].includes(user.role || '');
        const hasAccess = isAdmin || (user as any).canViewActivity;

        let activityLogs: any[] = [];
        let activitiesTotal = 0;

        if (hasAccess) {
            [activityLogs, activitiesTotal] = await Promise.all([
                prisma.automationLog.findMany({
                    where: activityQuery,
                    include: {
                        triggeredBy: { select: { id: true, name: true, email: true, photoUrl: true, role: true } },
                        targetUser: { select: { id: true, name: true, email: true, photoUrl: true, role: true } }
                    },
                    orderBy: { timestamp: 'desc' },
                    skip: skip,
                    take: Number(limit)
                }),
                prisma.automationLog.count({ where: activityQuery }),
            ]);
        }

        let combinedLogs = activityLogs.map((log: any) => ({ ...log, isNotification: false }));

        if (includeNotifications === 'true') {
            const notifQuery: any = { userId: user.id };
            if (startDate || endDate) {
                notifQuery.createdAt = {};
                if (startDate) notifQuery.createdAt.gte = new Date(startDate);
                if (endDate) notifQuery.createdAt.lte = new Date(endDate);
            }

            const notifications = await prisma.notification.findMany({
                where: notifQuery,
                orderBy: { createdAt: 'desc' },
                take: Number(limit)
            });

            const normalizedNotifs = notifications.map((n: any) => ({
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

            combinedLogs = [...combinedLogs, ...normalizedNotifs]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, Number(limit));
        }

        return {
            logs: combinedLogs,
            total: activitiesTotal,
            page: Number(page),
            pages: Math.ceil(activitiesTotal / Number(limit))
        };
    }

    static async updateActivityAccess(userId: string, canViewActivity: boolean) {
        if (!userId) throw new Error('User ID is required');

        const user = await prisma.user.update({
            where: { id: userId },
            data: { canViewActivity: !!canViewActivity }
        }).catch(() => null);
        
        if (!user) throw new Error('User not found');

        return { message: `Access ${user.canViewActivity ? 'granted' : 'revoked'} for ${user.name}`, user };
    }
}


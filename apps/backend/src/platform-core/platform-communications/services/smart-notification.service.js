'use strict';

const EmailService = require('../../../app-registry/communications-app/emails/email.service');
const { AnalyticsScoringService } = require('@workspace/insights');

/**
 * Smart Notification Service
 * Handles delivery optimization, prioritization, and delivery channel selection.
 * Multi-company aware: methods now accept companyPrisma context.
 */
class SmartNotificationService {
    /**
     * Send notification with smart routing
     * @param {Object} params - { userId, type, title, message, actionUrl, priority }
     * @param {Object} companyPrisma - The company's database connection
     */
    async send(params, companyPrisma) {
        if (!companyPrisma) {
            console.error('[SmartNotificationService] companyPrisma context is required for send');
            return null;
        }

        const Notification = companyPrisma.notification;
        const User = companyPrisma.user;

        const { userId, type, title, message, actionUrl, priority = 'medium' } = params;

        // 1. Save to Database for persistence
        const notification = await Notification.create({
            data: {
                userId,
                type,
                title,
                message,
                actionUrl,
                priority
            }
        });

        // 2. Real-time Socket Delivery
        let io = null;
        let onlineUsers = null;
        try {
            const sockets = require('../../../system-configs/sockets');
            io = sockets.getIo();
            onlineUsers = sockets.onlineUsers;
        } catch (err) {
            // Socket not initialized
        }
        if (io && onlineUsers) {
            const sockets = onlineUsers.get(userId.toString());
            if (sockets) {
                for (const sid of sockets) {
                    io.to(sid).emit('notification:new', notification);
                }
            }
        }

        // 3. Smart Email Delivery
        const score = AnalyticsScoringService.calculateNotificationScore(
            priority === 'high' ? 3 : (priority === 'medium' ? 2 : 1),
            ['meeting_reminder', 'project_deadline', 'project_risk_alert', 'task_overdue'].includes(type) ? 3 : 1,
            1 // Default relevance
        );

        const { onlineUsers: currentOnlineUsers } = require('../../../system-configs/sockets');
        const isUserOnline = currentOnlineUsers.has(userId.toString());
        const THRESHOLD = 4; // Threshold for immediate email dispatch

        const shouldSendEmail = score >= THRESHOLD || !isUserOnline;

        if (shouldSendEmail) {
            const user = await User.findUnique({ where: { id: userId }, select: { name: true, email: true } });
            if (user && user.email) {
                const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
                await EmailService.notify(user, type, {
                    subject: title,
                    message: message,
                    ctaLink: actionUrl ? `${clientUrl}${actionUrl}` : null,
                    ctaText: 'View Details'
                }, companyPrisma);
            }
        }

        return notification;
    }

    /**
     * Batch notifications for a user to reduce fatigue (Daily Summary)
     * @param {string} userId
     * @param {Object} companyPrisma - The company's database connection
     */
    async sendDailySummary(userId, companyPrisma) {
        if (!companyPrisma) return;

        const Notification = companyPrisma.notification;
        const User = companyPrisma.user;

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const unread = await Notification.findMany({
            where: {
                userId,
                isRead: false,
                createdAt: { gte: yesterday },
                priority: { not: 'high' }
            }
        });

        if (unread.length === 0) return;

        const user = await User.findUnique({ where: { id: userId }, select: { name: true, email: true } });
        if (user && user.email) {
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            const summary = unread.map(n => `â€¢ ${n.title}: ${n.message}`).join('\n');
            await EmailService.notify(user, 'daily_summary', {
                subject: 'Your Daily Activity Summary',
                message: `You have ${unread.length} new notifications:\n\n${summary}`,
                ctaLink: `${clientUrl}/dashboard/notifications`,
                ctaText: 'Open Notifications'
            }, companyPrisma);
        }
    }
}

module.exports = new SmartNotificationService();

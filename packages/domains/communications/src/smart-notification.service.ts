import { prisma } from '@workspace/db';
import { EmailManagementService } from './emails/email-management.service';
// Assuming AnalyticsScoringService is moved or will be moved, but for now we might have to mock it or import from '@workspace/insights'
// Let's create a stub here if it doesn't exist, or just use a simple score calculation inline.

export class SmartNotificationService {
    static async send(params: { userId: string, type: string, title: string, message: string, actionUrl?: string, priority?: string }) {
        const { userId, type, title, message, actionUrl, priority = 'medium' } = params;

        // 1. Save to Database for persistence
        const notification = await prisma.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                link: actionUrl || null
            }
        });

        // 2. Real-time Socket Delivery
        // In a proper microservice/DDD setup, sockets shouldn't be directly imported from apps/backend.
        // We should publish an event to EventBus, and the websocket gateway listens to it.
        // For now, we omit the direct socket logic to keep domain clean.
        
        // 3. Smart Email Delivery
        const score = (priority === 'high' ? 3 : (priority === 'medium' ? 2 : 1)) + 
            (['meeting_reminder', 'project_deadline', 'project_risk_alert', 'task_overdue'].includes(type) ? 3 : 1) + 1;

        const THRESHOLD = 4;
        const shouldSendEmail = score >= THRESHOLD; // Simplified for now since we removed direct socket check

        if (shouldSendEmail) {
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, companyId: true } });
            if (user && user.email && user.companyId) {
                const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
                await EmailManagementService.sendCustomEmail(
                    user.companyId,
                    'system',
                    user.email,
                    title,
                    `${message}\n\n${actionUrl ? `View Details: ${clientUrl}${actionUrl}` : ''}`
                );
            }
        }

        return notification;
    }

    static async sendDailySummary(userId: string) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const unread = await prisma.notification.findMany({
            where: {
                userId,
                isRead: false,
                createdAt: { gte: yesterday }
            }
        });

        if (unread.length === 0) return;

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, companyId: true } });
        if (user && user.email && user.companyId) {
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            const summary = unread.map((n: any) => `• ${n.title}: ${n.message}`).join('\n');
            await EmailManagementService.sendCustomEmail(
                user.companyId,
                'system',
                user.email,
                'Your Daily Activity Summary',
                `You have ${unread.length} new notifications:\n\n${summary}\n\nView Notifications: ${clientUrl}/dashboard/notifications`
            );
        }
    }
}

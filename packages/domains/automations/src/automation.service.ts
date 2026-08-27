import { prisma } from '@workspace/db';
import { EmailManagementService, SmartNotificationService } from '@workspace/communications';
// Socket emission should be handled by the caller or an event bus
// import { getIo } from '../../../apps/backend/src/system-configs/sockets';

export class AutomationService {
    static async trigger(params: any, companyPrisma: any = prisma) {
        if (!companyPrisma) {
            companyPrisma = prisma;
        }

        const AutomationLog = companyPrisma.automationLog;
        const { eventType, triggeredBy, targetUser, targetClient, relatedItem, description, metadata, sendEmailNotification } = params;
        
        let configError = null;
        if (sendEmailNotification !== false) {
            // Check config would happen here, abstracting for now or rely on EmailManagementService
        }

        try {
            const log = await AutomationLog.create({
                data: {
                    eventType,
                    triggeredById: triggeredBy || undefined,
                    targetUserId: targetUser || undefined,
                    targetClientId: targetClient || undefined,
                    relatedItemId: relatedItem?.itemId || undefined,
                    relatedItemModel: relatedItem?.itemModel || undefined,
                    description,
                    metadata: metadata || {},
                    status: 'pending'
                }
            });

            // Offload processing or process inline for now since we don't have the background worker implemented in this snippet
            const result = await this.processTrigger({ ...params, eventType, logId: log.id }, companyPrisma);

            return { 
                log, 
                notificationResult: configError ? { success: false, error: configError } : result 
            };
        } catch (err: any) {
            console.error(`[AutomationService] Error queueing [${eventType}]:`, err.message);
            return { log: null, notificationResult: { success: false, error: err.message } };
        }
    }

    static async processTrigger(params: any, companyPrisma: any) {
        const AutomationLog = companyPrisma.automationLog;
        const User = companyPrisma.user;
        const { eventType, targetUser, logId, sendEmailNotification } = params;

        try {
            let user = null;
            if (targetUser) {
                user = await User.findUnique({
                    where: { id: targetUser },
                    select: { name: true, email: true }
                });
            }

            let emailResult: any = { success: true, skipped: true };
            if (user && user.email && sendEmailNotification !== false) {
                emailResult = await this.handleEmailDispatch(eventType, user, params, companyPrisma);
            }

            if (params.targetUser) {
                const companyName = process.env.COMPANY_NAME || 'Your Company';
                const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
                let subject = '';
                let message = params.description;
                let actionUrl = clientUrl;

                switch (eventType) {
                    case 'project_assigned':
                        subject = `New Project Assigned: ${params.metadata?.projectName || 'A new project'}`;
                        message = `You have been assigned to the project: ${params.metadata?.projectName}.`;
                        actionUrl = `${clientUrl}/dashboard/projects/${params.relatedItem?.itemId}`;
                        break;
                    case 'task_assigned':
                        subject = `New Task Assigned: ${params.metadata?.taskName || 'A new task'}`;
                        message = `Assignee: You. Task: ${params.metadata?.taskName}. Project: ${params.metadata?.projectName || 'N/A'}. Due: ${params.metadata?.dueDate || 'N/A'}. Priority: ${params.metadata?.priority || 'medium'}. Assigned by: ${params.metadata?.assignedBy || 'Admin'}`;
                        actionUrl = `${clientUrl}/dashboard/tasks/${params.relatedItem?.itemId}`;
                        break;
                    // ... other cases easily extrapolated for simplicity if needed
                    default:
                        subject = `Update from ${companyName}`;
                        message = params.description;
                        actionUrl = clientUrl;
                }

                const throttled = await this.shouldThrottle(params.targetUser, params.eventType, AutomationLog);
                if (!throttled) {
                    await SmartNotificationService.send({
                        userId: params.targetUser,
                        type: params.eventType,
                        title: subject,
                        message: message,
                        actionUrl: actionUrl,
                        priority: params.eventType.includes('deadline') || params.eventType.includes('risk') ? 'high' : 'medium'
                    });
                } else {
                    console.log(`[AutomationService] Throttled notification for user ${params.targetUser}, event: ${params.eventType}`);
                }
            }

            if (logId) {
                await AutomationLog.update({
                    where: { id: logId },
                    data: {
                        status: 'success',
                        processedAt: new Date()
                    }
                });
            }

            const companyId = params.companyId || (companyPrisma && companyPrisma.companyId);
            if (companyId) {
                try {
                    // const io = getIo();
                    // if (io) io.to(`company:${companyId}`).emit('activity:new', { ...params, status: 'success' });
                } catch (err) {}
            }

            return emailResult || { success: true };
        } catch (err: any) {
            console.error(`[AutomationService] Error [${eventType}]:`, err.message);
            try {
                await AutomationLog.create({
                    data: {
                        eventType: eventType || params.eventType,
                        triggeredById: params.triggeredBy || undefined,
                        targetUserId: params.targetUser || undefined,
                        description: `FAILED: ${params.description || 'System Action'}`,
                        status: 'failed',
                        metadata: { error: err.message }
                    }
                });
            } catch (loggingErr: any) {
                console.error('[AutomationService] Critical Logging Failure:', loggingErr.message);
            }
            return { success: false, error: err.message };
        }
    }

    private static async handleEmailDispatch(eventType: string, user: any, params: any, companyPrisma: any) {
        try {
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            await EmailManagementService.sendCustomEmail(
                'system',
                user.email,
                `Notification: ${eventType}`,
                `${params.description || 'You have a new notification.'}\n\nView details at ${clientUrl}`
            );
            return { success: true, skipped: false };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private static async shouldThrottle(userId: string, eventType: string, AutomationLog: any) {
        if (['project_risk_alert', 'meeting_reminder', 'project_deadline'].includes(eventType)) return false;

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const count = await AutomationLog.count({
            where: {
                targetUserId: userId,
                createdAt: { gte: oneHourAgo },
                status: 'success'
            }
        });

        return count >= 5;
    }

    static moderateContent(text: string) {
        const blockedWords: string[] = [];
        if (blockedWords.length === 0) return text;
        let moderated = text;
        blockedWords.forEach(word => {
            const reg = new RegExp(word, 'gi');
            moderated = moderated.replace(reg, '***');
        });
        return moderated;
    }
}

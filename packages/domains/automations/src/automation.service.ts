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
                    select: { name: true, email: true, companyId: true }
                });
            }

            const companyId = params.companyId || (companyPrisma && companyPrisma.companyId) || user?.companyId;

            let emailResult: any = { success: true, skipped: true };
            if (user && user.email && sendEmailNotification !== false) {
                emailResult = await this.handleEmailDispatch(eventType, user, { ...params, companyId }, companyPrisma);
            }

            if (params.targetUser) {
                const companyName = process.env.COMPANY_NAME || 'Your Company';
                const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
                const clientUrl = rawClientUrl.split(',')[0].trim().replace(/\/$/, '');
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
                        status: 'success'
                    }
                });
            }

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
            const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            const clientUrl = rawClientUrl.split(',')[0].trim().replace(/\/$/, '');
            const companyId = params.companyId || (companyPrisma && companyPrisma.companyId) || user?.companyId;
            
            const templateData: any = {
                name: user.name || 'User',
                ...params.metadata
            };
            
            // Map specific fields for standard templates
            if (eventType === 'task_assigned') {
                templateData.taskTitle = params.metadata?.taskName || 'A new task';
                templateData.taskUrl = `${clientUrl}/dashboard/tasks/${params.relatedItem?.itemId}`;
            } else if (eventType === 'project_assigned') {
                templateData.projectUrl = `${clientUrl}/dashboard/projects/${params.relatedItem?.itemId}`;
            }
            
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const validSentById = (params.triggeredBy && uuidRegex.test(params.triggeredBy)) ? params.triggeredBy : null;

            try {
                // Attempt to send via HTML template using the company's configured SMTP
                const result = await EmailManagementService.sendManualEmail(
                    validSentById as string,
                    user.email,
                    eventType, // Matches template IDs like 'task_assigned', 'project_assigned'
                    templateData,
                    undefined,
                    undefined,
                    companyId
                );
                if (result && result.success) {
                    return { success: true, skipped: false };
                } else {
                    console.warn(`[AutomationService] sendManualEmail failed (${result?.error}), falling back to custom email.`);
                    throw new Error(result?.error || 'Template dispatch failed');
                }
            } catch (templateError: any) {
                // Fallback to raw custom email if template doesn't exist
                const customResult = await EmailManagementService.sendCustomEmail(
                    validSentById as string,
                    user.email,
                    `Notification: ${eventType.replace('_', ' ').toUpperCase()}`,
                    `${params.description || 'You have a new notification.'}\n\nView details at ${clientUrl}`,
                    companyId
                );
                return { success: customResult?.success ?? true, skipped: false, fallback: true, error: customResult?.error };
            }
        } catch (err: any) {
            console.error('[AutomationService] handleEmailDispatch exception:', err.message);
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

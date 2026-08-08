'use strict';

const EmailService = require('../../../app-registry/productivity-tools-app/emails/email.service');
const SmartNotificationService = require('./smart-notification.service');

/**
 * Automation Service - Central Event Hub
 * Handles logging and dispatching of system-wide notifications
 * Multi-company aware: methods now accept companyPrisma context.
 */
class AutomationService {
    /**
     * Trigger an automation event
     * @param {Object} params - { eventType, triggeredBy, targetUser, targetClient, relatedItem, description, metadata }
     * @param {Object} companyPrisma - The company's database connection
     */
    async trigger(params, companyPrisma) {
        if (!companyPrisma) {
            console.error('[AutomationService] companyPrisma context is required for trigger');
            return null;
        }

        const AutomationLog = companyPrisma.automationLog;
        const { eventType, triggeredBy, targetUser, targetClient, relatedItem, description, metadata, sendEmailNotification } = params;
        
        // 0. Pre-Flight SMTP Check (Immediate feedback for UI)
        let configError = null;
        if (sendEmailNotification !== false) {
            const hasConfig = await EmailService.verifyConfig('work', companyPrisma);
            if (!hasConfig) {
                configError = 'SMTP not configured for this company. Work emails cannot be sent.';
                console.warn(`[AutomationService] [${eventType}] SMTP check failed: ${configError}`);
            }
        }

        try {
            // 1. Create Log Entry (Synchronous - to provide immediate audit trail)
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

            // 2. Offload processing to background queue
            const { queueAutomation } = require('../../platform-engine/services/queue.service');
            // Use companyId attached to connection for proper company identification in the queue
            const companyId = companyPrisma.companyId ? companyPrisma.companyId.toString() : companyPrisma.name;

            // Include eventType explicitly in the params for the queue
            const result = await queueAutomation('internal_trigger', { ...params, eventType, logId: log._id }, companyId);

            return { 
                log, 
                notificationResult: configError ? { success: false, error: configError } : result 
            };
        } catch (err) {
            console.error(`[AutomationService] Error queueing [${eventType}]:`, err.message);
            return { log: null, notificationResult: { success: false, error: err.message } };
        }
    }

    /**
     * Process an automation trigger (Called by background worker)
     */
    async processTrigger(params, companyPrisma) {
        const AutomationLog = companyPrisma.automationLog;
        const User = companyPrisma.user;
        const { eventType, targetUser, logId, sendEmailNotification } = params;

        try {
            // 1. Fetch User Details
            let user = null;
            if (targetUser) {
                user = await User.findUnique({
                    where: { id: targetUser },
                    select: { name: true, email: true, preferences: true }
                });
            }

            // 2. Dispatch Email Notification
            // Default to true if not explicitly false
            let emailResult = { success: true, skipped: true };
            if (user && user.email && sendEmailNotification !== false) {
                emailResult = await this.#handleEmailDispatch(eventType, user, params, companyPrisma);
            }

            // 3. Dispatch Smart Notification
            if (params.targetUser) {
                const companyName = process.env.COMPANY_NAME || 'Your Company';
                const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
                let subject = '';
                let message = params.description;
                let actionUrl = clientUrl;

                switch (eventType) {
                    case 'project_assigned':
                        subject = `New Project Assigned: ${params.metadata.projectName || 'A new project'}`;
                        message = `You have been assigned to the project: ${params.metadata.projectName}.`;
                        actionUrl = `${clientUrl}/dashboard/projects/${params.relatedItem.itemId}`;
                        break;
                    case 'module_assigned':
                        subject = `Module Assigned: ${params.metadata.moduleName}`;
                        message = `You have been assigned as the owner of the module: ${params.metadata.moduleName}.`;
                        actionUrl = `${clientUrl}/dashboard/projects/${params.relatedItem?.projectId || ''}`;
                        break;
                    case 'work_log_submitted':
                        subject = `Work Log Submitted: ${params.metadata.employeeName}`;
                        message = `${params.metadata.employeeName} submitted a work log (${params.metadata.hours}h) for project ${params.metadata.projectName || 'a project'}.`;
                        actionUrl = `${clientUrl}/dashboard/work-logs`;
                        break;
                    case 'work_log_reviewed':
                        subject = `Work Log ${params.metadata.status === 'approved' ? 'Approved' : 'Rejected'}`;
                        message = `Your work log has been ${params.metadata.status}. ${params.metadata.comment ? `Comment: ${params.metadata.comment}` : ''}`;
                        actionUrl = `${clientUrl}/dashboard/work-logs`;
                        break;
                    case 'task_assigned':
                        subject = `New Task Assigned: ${params.metadata.taskName || 'A new task'}`;
                        message = `Assignee: You. Task: ${params.metadata.taskName}. Project: ${params.metadata.projectName || 'N/A'}. Due: ${params.metadata.dueDate || 'N/A'}. Priority: ${params.metadata.priority || 'medium'}. Assigned by: ${params.metadata.assignedBy || 'Admin'}`;
                        actionUrl = `${clientUrl}/dashboard/tasks/${params.relatedItem.itemId}`;
                        break;
                    case 'goal_assigned':
                        subject = `New Goal Assigned: ${params.metadata.goalTitle || 'A new goal'}`;
                        message = `Owner: You. Goal: ${params.metadata.goalTitle}. Vision: ${params.metadata.motivation || 'N/A'}. Due: ${params.metadata.dueDate || 'N/A'}. Difficulty: ${params.metadata.difficulty || 'medium'}. Assigned by: ${params.metadata.assignedBy || 'Admin'}`;
                        actionUrl = `${clientUrl}/dashboard/goals`;
                        break;
                    case 'salary_generated':
                        subject = `Salary Slip Generated - ${params.metadata.month || 'Current Month'}`;
                        message = `Your salary slip for ${params.metadata.month} has been generated and is ready for viewing.`;
                        actionUrl = `${clientUrl}/dashboard/profile/me`;
                        break;
                    case 'attendance_late':
                        subject = `Late Attendance Notification`;
                        message = `Our system recorded a late check-in today. Please ensure you mark your attendance on time.`;
                        actionUrl = `${clientUrl}/dashboard`;
                        break;
                    case 'task_deadline_approaching':
                    case 'task_reminder':
                        subject = `Task Reminder: ${params.metadata.taskName}`;
                        message = `Friendly reminder: The task "${params.metadata.taskName}" is approaching its deadline (${params.metadata.dueDate ? new Date(params.metadata.dueDate).toLocaleDateString() : 'soon'}).`;
                        actionUrl = `${clientUrl}/dashboard/tasks/${params.relatedItem.itemId}`;
                        break;
                    case 'project_deadline':
                    case 'project_deadline_approaching':
                        subject = `Project Deadline Approaching: ${params.metadata.projectName}`;
                        message = `The deadline for project "${params.metadata.projectName}" is approaching. Please review the timeline.`;
                        actionUrl = `${clientUrl}/dashboard/projects/${params.relatedItem.itemId}`;
                        break;
                    case 'task_completed':
                        subject = `Task Completed: ${params.metadata.taskName}`;
                        message = params.description || `Task "${params.metadata.taskName}" has been marked as completed.`;
                        actionUrl = `${clientUrl}/dashboard/tasks/${params.relatedItem.itemId}`;
                        break;
                    case 'task_overdue':
                        subject = `âš ï¸ Task Overdue: ${params.metadata.taskName}`;
                        message = `The task "${params.metadata.taskName}" is now overdue. Please update the status as soon as possible.`;
                        actionUrl = `${clientUrl}/dashboard/tasks/${params.relatedItem.itemId}`;
                        break;
                    case 'project_status_changed':
                        subject = `Project Status Update: ${params.metadata.projectName}`;
                        message = `The status of project "${params.metadata.projectName}" has been updated to: ${params.metadata.newStatus}.`;
                        actionUrl = `${clientUrl}/dashboard/projects/${params.relatedItem.itemId}`;
                        break;
                    case 'new_announcement':
                        subject = `New Announcement: ${params.metadata.title}`;
                        message = params.metadata.content;
                        actionUrl = `${clientUrl}/dashboard/announcements`;
                        break;
                    case 'document_shared':
                        subject = `Document Shared: ${params.metadata.documentName}`;
                        message = `A new document "${params.metadata.documentName}" has been shared with you.`;
                        actionUrl = `${clientUrl}/dashboard/documents/${params.relatedItem.itemId}`;
                        break;
                    case 'leave_request_approved':
                        subject = `Leave Request Approved`;
                        message = `Your leave request for ${params.metadata.leaveDates} has been approved.`;
                        actionUrl = `${clientUrl}/dashboard/leave`;
                        break;
                    case 'leave_request_rejected':
                        subject = `Leave Request Rejected`;
                        message = `Your leave request for ${params.metadata.leaveDates} has been rejected. Reason: ${params.metadata.reason}`;
                        actionUrl = `${clientUrl}/dashboard/leave`;
                        break;
                    case 'new_feedback':
                        subject = `New Feedback Received`;
                        message = `You have received new feedback regarding ${params.metadata.feedbackType}.`;
                        actionUrl = `${clientUrl}/dashboard/feedback`;
                        break;
                    case 'performance_review_due':
                        subject = `Performance Review Due`;
                        message = `Your performance review is due soon. Please complete it by ${params.metadata.dueDate}.`;
                        actionUrl = `${clientUrl}/dashboard/performance`;
                        break;
                    case 'expense_report_approved':
                        subject = `Expense Report Approved`;
                        message = `Your expense report for ${params.metadata.period} has been approved.`;
                        actionUrl = `${clientUrl}/dashboard/expenses`;
                        break;
                    case 'expense_report_rejected':
                        subject = `Expense Report Rejected`;
                        message = `Your expense report for ${params.metadata.period} has been rejected. Reason: ${params.metadata.reason}`;
                        actionUrl = `${clientUrl}/dashboard/expenses`;
                        break;
                    case 'new_ticket_assigned':
                        subject = `New Support Ticket Assigned: ${params.metadata.ticketSubject}`;
                        message = `A new support ticket "${params.metadata.ticketSubject}" has been assigned to you.`;
                        actionUrl = `${clientUrl}/dashboard/support/tickets/${params.relatedItem.itemId}`;
                        break;
                    case 'ticket_status_update':
                        subject = `Support Ticket Update: ${params.metadata.ticketSubject}`;
                        message = `Your support ticket "${params.metadata.ticketSubject}" has been updated to status: ${params.metadata.newStatus}.`;
                        actionUrl = `${clientUrl}/dashboard/support/tickets/${params.relatedItem.itemId}`;
                        break;
                    case 'new_message':
                        subject = `New Message from ${params.metadata.senderName}`;
                        message = params.metadata.preview;
                        actionUrl = `${clientUrl}/dashboard/messages/${params.relatedItem.itemId}`;
                        break;
                    case 'training_assigned':
                        subject = `New Training Assigned: ${params.metadata.trainingName}`;
                        message = `You have been assigned a new training module: "${params.metadata.trainingName}".`;
                        actionUrl = `${clientUrl}/dashboard/training/${params.relatedItem.itemId}`;
                        break;
                    case 'training_due_soon':
                        subject = `Training Due Soon: ${params.metadata.trainingName}`;
                        message = `The training module "${params.metadata.trainingName}" is due soon.`;
                        actionUrl = `${clientUrl}/dashboard/training/${params.relatedItem.itemId}`;
                        break;
                    case 'policy_update':
                        subject = `Company Policy Update: ${params.metadata.policyName}`;
                        message = `There has been an update to the company policy: "${params.metadata.policyName}". Please review.`;
                        actionUrl = `${clientUrl}/dashboard/policies/${params.relatedItem.itemId}`;
                        break;
                    case 'goal_set':
                        subject = `New Goal Set: ${params.metadata.goalName}`;
                        message = `A new goal "${params.metadata.goalName}" has been set for you.`;
                        actionUrl = `${clientUrl}/dashboard/goals/${params.relatedItem.itemId}`;
                        break;
                    case 'goal_update':
                        subject = `Goal Update: ${params.metadata.goalName}`;
                        message = `Your goal "${params.metadata.goalName}" has been updated.`;
                        actionUrl = `${clientUrl}/dashboard/goals/${params.relatedItem.itemId}`;
                        break;
                    case 'asset_assigned':
                        subject = `Asset Assigned: ${params.metadata.assetName}`;
                        message = `You have been assigned a new company asset: "${params.metadata.assetName}".`;
                        actionUrl = `${clientUrl}/dashboard/assets`;
                        break;
                    case 'asset_return_due':
                        subject = `Asset Return Due: ${params.metadata.assetName}`;
                        message = `The company asset "${params.metadata.assetName}" is due for return soon.`;
                        actionUrl = `${clientUrl}/dashboard/assets`;
                        break;
                    case 'project_risk_alert':
                        subject = `Risk Alert: Project "${params.metadata.projectName}"`;
                        message = `High risk detected (Risk Score: ${params.metadata.riskScore}). Immediate review recommended.`;
                        actionUrl = `${clientUrl}/dashboard/projects/${params.relatedItem.itemId}`;
                        break;
                    case 'task_escalated':
                        subject = `Escalation Notice: Task "${params.metadata.taskName}"`;
                        message = `The task "${params.metadata.taskName}" has been escalated due to delays. Please prioritize this item.`;
                        actionUrl = `${clientUrl}/dashboard/tasks/${params.relatedItem.itemId}`;
                        break;
                    case 'attendance_alert':
                        subject = `HR Attendance Alert: ${params.metadata.employeeName}`;
                        message = `${params.metadata.employeeName} has ${params.metadata.lateCount} late entries this month.`;
                        actionUrl = `${clientUrl}/dashboard/hr/attendance`;
                        break;
                    case 'attendance_absence':
                        subject = `Absence Recorded: ${params.metadata.date || 'Today'}`;
                        message = params.description || `You were marked absent today.`;
                        actionUrl = `${clientUrl}/dashboard`;
                        break;
                    case 'document_uploaded':
                        subject = `New Document: ${params.metadata.fileName}`;
                        message = `A new document "${params.metadata.fileName}" was uploaded.`;
                        actionUrl = `${clientUrl}/dashboard/documents`;
                        break;
                    case 'invoice_created':
                        subject = `New Invoice Generated: ${params.metadata.invoiceNumber}`;
                        message = `Invoice ${params.metadata.invoiceNumber} has been created for ${params.metadata.clientName}.`;
                        actionUrl = `${clientUrl}/dashboard/invoices`;
                        break;
                    case 'invoice_sent':
                        subject = `Invoice Sent: ${params.metadata.invoiceNumber}`;
                        message = `Invoice ${params.metadata.invoiceNumber} has been sent to the client.`;
                        actionUrl = `${clientUrl}/dashboard/invoices`;
                        break;
                    case 'client_converted':
                        subject = `Lead Converted: ${params.metadata.clientName}`;
                        message = `Lead ${params.metadata.clientName} has been successfully converted to a client.`;
                        actionUrl = `${clientUrl}/dashboard/clients`;
                        break;
                    case 'project_archived':
                        subject = `Project Archived: ${params.metadata.projectName}`;
                        message = `Project "${params.metadata.projectName}" has been moved to archives.`;
                        actionUrl = `${clientUrl}/dashboard/projects`;
                        break;
                    case 'opportunity_deleted':
                        subject = `Opportunity Deleted`;
                        message = `An opportunity "${params.metadata.opportunityName}" was deleted by ${params.metadata.username}.`;
                        actionUrl = `${clientUrl}/dashboard/sales/opportunities`;
                        break;
                    default:
                        subject = `Update from ${companyName}`;
                        message = params.description;
                        actionUrl = clientUrl;
                }

                // Rate-limit check before sending notification
                const throttled = await this.#shouldThrottle(params.targetUser, params.eventType, AutomationLog);
                if (!throttled) {
                    await SmartNotificationService.send({
                        userId: params.targetUser,
                        type: params.eventType,
                        title: subject,
                        message: message,
                        actionUrl: actionUrl,
                        priority: params.eventType.includes('deadline') || params.eventType.includes('risk') ? 'high' : 'medium'
                    }, companyPrisma);
                } else {
                    console.log(`[AutomationService] Throttled notification for user ${params.targetUser}, event: ${params.eventType}`);
                }
            }

            // 4. Update Log Status
            if (logId) {
                await AutomationLog.update({
                    where: { id: logId },
                    data: {
                        status: 'success',
                        processedAt: new Date()
                    }
                });
            }

            // 5. Broadcast for Global Activity Feed
            const companyId = params.companyId || (companyPrisma && companyPrisma.name);
            if (companyId) {
                try {
                    const { getIo } = require('../../../system-configs/sockets');
                    const io = getIo();
                    if (io) io.to(`company:${companyId}`).emit('activity:new', { ...params, status: 'success' });
                } catch (err) { }
            }

            return emailResult || { success: true };
        } catch (err) {
            console.error(`[AutomationService] Error [${eventType}]:`, err.message);
            try {
                await AutomationLog.create({
                    data: {
                        eventType: eventType || params.eventType,
                        triggeredBy: params.triggeredBy,
                        targetUser: params.targetUser,
                        description: `FAILED: ${params.description || 'System Action'}`,
                        status: 'failed',
                        error: err.message
                    }
                });
            } catch (loggingErr) {
                console.error('[AutomationService] Critical Logging Failure:', loggingErr.message);
            }
            return { success: false, error: err.message };
        }
    }

    /**
     * Private helper to route events to specific email templates
     */
    /**
     * Private helper to route events to the centralized notification engine
     */
    async #handleEmailDispatch(eventType, user, params, companyPrisma) {
        // use the new centralized notify method which handles template mapping internally
        return await EmailService.notify(user, eventType, params.metadata, companyPrisma);
    }

    /**
     * Internal: Rate limit notifications to prevent spam
     */
    async #shouldThrottle(userId, eventType, AutomationLog) {
        if (['project_risk_alert', 'meeting_reminder', 'project_deadline'].includes(eventType)) return false;

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const count = await AutomationLog.count({
            where: {
                targetUser: userId,
                timestamp: { gte: oneHourAgo },
                status: 'success'
            }
        });

        return count >= 5;
    }

    /**
     * Basic Chat Moderation Algorithm
     */
    moderateContent(text) {
        // Content moderation - extend blockedWords with actual terms as needed
        const blockedWords = [];
        if (blockedWords.length === 0) return text;
        let moderated = text;
        blockedWords.forEach(word => {
            const reg = new RegExp(word, 'gi');
            moderated = moderated.replace(reg, '***');
        });
        return moderated;
    }
}

module.exports = new AutomationService();

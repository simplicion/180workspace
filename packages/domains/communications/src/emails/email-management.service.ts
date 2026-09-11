import { prisma, requestContext } from '@workspace/db';
import * as nodemailer from 'nodemailer';
import { EmailService } from '@workspace/backend-infra';

export class EmailManagementService {
    static async getEmailLogs(page = 1, limit = 50, to?: string, status?: string) {
        const query: any = {};
        if (to) query.to = { contains: to, mode: 'insensitive' };
        if (status) query.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [logs, total] = await Promise.all([
            prisma.emailLog.findMany({
                where: query,
                include: { sentBy: { select: { name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit)
            }),
            prisma.emailLog.count({ where: query }),
        ]);

        return { logs, total, pages: Math.ceil(total / Number(limit)) };
    }

    static getTemplates() {
        return [
            { id: 'welcome', name: 'Welcome Email', fields: ['name', 'password'], description: 'Sent to newly created users with their credentials.' },
            { id: 'project_assigned', name: 'Project Assignment', fields: ['name', 'projectName', 'projectUrl'], description: 'Notifies a user they have been added to a project.' },
            { id: 'task_assigned', name: 'Task Assignment', fields: ['name', 'taskTitle', 'projectName', 'taskUrl'], description: 'Notifies a user of a new task.' },
            { id: 'salary_generated', name: 'Salary Generation', fields: ['name', 'month', 'netSalary'], description: 'Informs an employee that their salary slip is ready.' },
            { id: 'system_alert', name: 'System Alert', fields: ['subject', 'message'], description: 'Generic alert for important system announcements.' },
            { id: 'verification', name: 'Verification Email', fields: ['name', 'verificationUrl'], description: "Used to verify a user's email address." },
            { id: 'password_reset', name: 'Password Reset', fields: ['name', 'resetUrl'], description: 'Link to reset a forgotten password.' },
            { id: 'document_tagged', name: 'Document Shared', fields: ['name', 'documentName', 'documentUrl', 'senderName'], description: 'Notifies a user they were tagged in a shared document.' },
            { id: 'meeting_scheduled', name: 'Meeting Scheduled', fields: ['name', 'meetingTitle', 'startTime', 'ctaUrl'], description: 'Invitation mapping for upcoming meetings.' },
            { id: 'leave_approved', name: 'Leave Request Approved', fields: ['name', 'leaveType', 'startDate', 'endDate'], description: 'Notification that a leave request was approved.' },
            { id: 'leave_rejected', name: 'Leave Request Rejected', fields: ['name', 'leaveType', 'reason'], description: 'Notification that a leave request was rejected.' },
            { id: 'task_completed', name: 'Task Completed', fields: ['name', 'taskTitle', 'projectName', 'ctaUrl'], description: 'Notifies relevant parties that a task is completed.' },
            { id: 'invoice_generated', name: 'Invoice Generated', fields: ['clientName', 'invoiceNumber', 'amount', 'dueDate', 'ctaUrl'], description: 'Send a newly generated invoice to a client.' },
            { id: 'payment_received', name: 'Payment Received', fields: ['clientName', 'invoiceNumber', 'amount', 'date'], description: 'Acknowledgment of a received invoice payment.' },
            { id: 'performance_review', name: 'Performance Review Scheduled', fields: ['name', 'reviewDate', 'reviewerName', 'ctaUrl'], description: 'Invites an employee to their performance review.' },
            { id: 'document_shared', name: 'Secure Document Shared', fields: ['name', 'documentName', 'senderName', 'ctaUrl'], description: 'Notifies users of securely shared documents.' },
            { id: 'client_welcome', name: 'Client Welcome', fields: ['clientName', 'loginUrl'], description: 'Welcomes a new client to the portal.' },
            { id: 'project_completed', name: 'Project Completed', fields: ['name', 'projectName', 'completionDate', 'ctaUrl'], description: 'Celebrates and notifies the completion of a project.' },
            { id: 'expense_approved', name: 'Expense Approved', fields: ['name', 'expenseTitle', 'amount', 'date'], description: 'Notifies employee of approved business expenses.' },
            { id: 'expense_rejected', name: 'Expense Rejected', fields: ['name', 'expenseTitle', 'amount', 'reason'], description: 'Notifies employee that expense was denied.' },
            { id: 'contract_renewal', name: 'Contract Renewal', fields: ['clientName', 'contractName', 'renewalDate', 'ctaUrl'], description: 'Reminder for upcoming contract renewals.' },
            { id: 'holiday_announcement', name: 'Holiday Announcement', fields: ['holidayName', 'date', 'message'], description: 'Broadcasts upcoming holidays to staff.' },
            { id: 'probation_completed', name: 'Probation Completed', fields: ['name', 'role', 'effectiveDate'], description: 'Congratulates an employee on completing probation.' },
            { id: 'document_attachment', name: 'Document Attachment', fields: ['name', 'documentName', 'message'], description: 'Sends an email with a document attached.' }
        ];
    }

    static async sendRawWithLogging(options: any, sentById: string | null) {
        // Resolve company context
        const contextCompanyId = requestContext.getStore()?.companyId;
        const targetCompanyId = options.companyId || contextCompanyId;
        
        let company: any = null;
        if (targetCompanyId) {
            company = await prisma.company.findUnique({ where: { id: targetCompanyId } });
        }
        if (!company && sentById) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(sentById)) {
                const user = await prisma.user.findUnique({ where: { id: sentById }, select: { companyId: true } });
                if (user?.companyId) {
                    company = await prisma.company.findUnique({ where: { id: user.companyId } });
                }
            }
        }
        if (!company) {
            company = await prisma.company.findFirst();
        }

        const effectiveCompanyId = company?.id || targetCompanyId || undefined;

        // Parse metadata
        let metadata: any = company?.metadata || {};
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; }
        }

        const settingsRecord = effectiveCompanyId 
            ? await prisma.settings.findFirst({ where: { companyId: effectiveCompanyId } })
            : await prisma.settings.findFirst();
            
        const settings: any = { ...(settingsRecord || {}), ...metadata };
        
        let smtpHost = settings.smtpHost;
        let smtpPort = Number(settings.smtpPort) || 587;
        let smtpUser = settings.smtpUser;
        let smtpPass = settings.smtpPass;
        let smtpSecure = settings.smtpSecure !== undefined ? settings.smtpSecure : (smtpPort === 465);
        let emailFrom = settings.emailFrom;
        let companyName = settings.companyName || company?.name || 'Simplicion';

        // Check PlatformSettings fallback
        if (!smtpHost || !smtpUser || !smtpPass) {
            try {
                const ps = await prisma.platformSettings.findFirst();
                if (ps && ps.smtpHost && ps.smtpUser && ps.smtpPass) {
                    smtpHost = ps.smtpHost;
                    smtpPort = Number(ps.smtpPort) || 587;
                    smtpUser = ps.smtpUser;
                    smtpPass = ps.smtpPass;
                    smtpSecure = ps.smtpSecure !== undefined ? ps.smtpSecure : (smtpPort === 465);
                    emailFrom = ps.smtpFrom || emailFrom;
                    if (ps.platformName) companyName = ps.platformName;
                }
            } catch (psErr) {}
        }

        // Check .env fallback
        if (!smtpHost || !smtpUser || !smtpPass) {
            if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
                smtpHost = process.env.SMTP_HOST;
                smtpPort = Number(process.env.SMTP_PORT) || 587;
                smtpUser = process.env.SMTP_USER;
                smtpPass = process.env.SMTP_PASS;
                smtpSecure = process.env.SMTP_SECURE === 'true' || (smtpPort === 465);
            }
        }

        // Ensure sentById is a valid UUID to prevent foreign key constraint violations
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validSentById = (sentById && uuidRegex.test(sentById)) ? sentById : null;
        
        const emailData: any = {
            to: options.to,
            subject: options.subject,
            templateName: options.templateName || 'custom',
            templateData: options.templateData || {},
            status: 'failed',
            companyId: effectiveCompanyId
        };
        if (validSentById) {
            emailData.sentBy = { connect: { id: validSentById } };
        }
        
        const log = await prisma.emailLog.create({ data: emailData });
        const logId = log.id;

        if (!smtpHost || !smtpUser || !smtpPass) {
            await prisma.emailLog.update({ where: { id: logId }, data: { errorMessage: 'SMTP not configured' } });
            return { success: false, error: 'SMTP not configured' };
        }

        // Construct RFC-5322 compliant "From" header
        const effectiveFrom = options.from || emailFrom;
        let fromHeader: string;
        if (!effectiveFrom || effectiveFrom.trim() === '') {
            fromHeader = `"${companyName.replace(/"/g, '')}" <${smtpUser}>`;
        } else if (effectiveFrom.includes('<') && effectiveFrom.includes('>')) {
            fromHeader = effectiveFrom;
        } else if (effectiveFrom.includes('@')) {
            fromHeader = `"${companyName.replace(/"/g, '')}" <${effectiveFrom.trim()}>`;
        } else {
            fromHeader = `"${effectiveFrom.trim().replace(/"/g, '')}" <${smtpUser}>`;
        }

        try {
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            });

            const info = await transporter.sendMail({
                from: fromHeader,
                to: options.to,
                subject: options.subject,
                html: options.html,
            });

            await prisma.emailLog.update({ where: { id: logId }, data: { status: 'sent', errorMessage: null } });
            return { success: true, messageId: info.messageId };
        } catch (error: any) {
            console.error(`[EmailManagementService] Email dispatch failed to ${options.to}:`, error.message);
            await prisma.emailLog.update({ where: { id: logId }, data: { status: 'failed', errorMessage: error.message } });
            return { success: false, error: error.message };
        }
    }

    static async sendManualEmail(sentById: string, to: string, templateId: string, templateData: any, editedSubject?: string, editedHtml?: string, companyId?: string) {
        let subject, html;

        if (editedSubject && editedHtml) {
            subject = editedSubject;
            html = editedHtml;
        } else {
            const preview = await EmailService.getTemplatePreview(templateId, templateData || {}, companyId);
            subject = preview.subject;
            html = preview.html;
        }

        return this.sendRawWithLogging({
            to,
            subject,
            html,
            templateName: templateId,
            templateData: templateData || {},
            companyId
        }, sentById);
    }

    static async sendCustomEmail(sentById: string, to: string, subject: string, body: string, companyId?: string) {
        return this.sendRawWithLogging({
            to,
            subject,
            html: body,
            templateName: 'custom',
            companyId
        }, sentById);
    }

    static async sendBulkEmail(role: string, subject: string, message: string, sentById: string, companyId?: string) {
        const targetCompanyId = companyId || requestContext.getStore()?.companyId;
        const query: any = { isActive: true };
        if (targetCompanyId) {
            query.companyId = targetCompanyId;
        }
        if (role && role !== 'all') {
            query.role = role;
        }
        
        const users = await prisma.user.findMany({ where: query, select: { email: true, name: true } });

        if (!users.length) {
            throw new Error('No users found for the selected role');
        }

        let sent = 0;
        let failed = 0;

        for (const user of users) {
            try {
                const result = await this.sendRawWithLogging({
                    to: user.email,
                    subject,
                    html: message,
                    companyId: targetCompanyId
                }, sentById);
                if (result.success) sent++; else failed++;
            } catch (e) {
                failed++;
            }
        }

        return { sent, failed, total: users.length };
    }

    static async retryEmail(logId: string, sentById: string) {
        const emailLog: any = await prisma.emailLog.findUnique({
            where: { id: logId },
        });

        if (!emailLog) {
            throw new Error('Email log not found');
        }

        if (emailLog.status === 'sent') {
            throw new Error('Email already sent successfully');
        }

        const result = await this.sendRawWithLogging({
            to: emailLog.to,
            subject: emailLog.subject,
            html: emailLog.html || `Retry trigger: ${emailLog.subject}`,
            templateName: emailLog.templateName,
            templateData: emailLog.templateData,
            companyId: emailLog.companyId
        }, sentById);

        if (result.success) {
            await prisma.emailLog.update({
                where: { id: emailLog.id },
                data: {
                    status: 'sent',
                    errorMessage: null,
                    sentById
                }
            });
            return { success: true };
        }

        throw new Error(result.error || 'Retry failed');
    }

    static async getEmailStats() {
        const statusGroups = await prisma.emailLog.groupBy({
            by: ['status'],
            _count: { _all: true }
        });
        const statusStats = statusGroups.map(g => ({ id: g.status, _id: g.status, count: g._count._all }));

        const templateGroups = await prisma.emailLog.groupBy({
            by: ['templateName', 'status'],
            _count: { _all: true }
        });
        
        const templateMap: any = {};
        templateGroups.forEach(g => {
            const tName = g.templateName || 'custom';
            if (!templateMap[tName]) templateMap[tName] = { id: tName, _id: tName, count: 0, failed: 0 };
            templateMap[tName].count += g._count._all;
            if (g.status === 'failed') templateMap[tName].failed += g._count._all;
        });
        const templateStats = Object.values(templateMap).sort((a: any, b: any) => b.count - a.count).slice(0, 10);

        const dateLimit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentLogs = await prisma.emailLog.findMany({
            where: { createdAt: { gte: dateLimit } },
            select: { createdAt: true }
        });
        const dateMap: any = {};
        recentLogs.forEach(log => {
            if (log.createdAt) {
                const date = new Date(log.createdAt).toISOString().split('T')[0];
                dateMap[date] = (dateMap[date] || 0) + 1;
            }
        });
        const recentActivity = Object.keys(dateMap).sort().map(k => ({ id: k, _id: k, count: dateMap[k] }));

        return { stats: statusStats, templateStats, recentActivity };
    }
}


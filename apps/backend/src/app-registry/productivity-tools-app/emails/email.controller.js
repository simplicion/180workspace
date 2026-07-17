'use strict';

const EmailService = require('./email.service');
const nodemailer = require('nodemailer');

/**
 * Get all email logs with pagination
 */
exports.getEmailLogs = async (req, res, next) => {
    try {
        const EmailLog = req.prisma.emailLog;
        const { page = 1, limit = 50, to, status } = req.query;
        const query = { companyId: req.user.companyId };
        if (to) query.to = { contains: to, mode: 'insensitive' };
        if (status) query.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [logs, total] = await Promise.all([
            EmailLog.findMany({
                where: query,
                include: { sentBy: { select: { name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit)
            }),
            EmailLog.count({ where: query }),
        ]);

        res.json({ logs, total, pages: Math.ceil(total / limit) });
    } catch (err) { next(err); }
};

/**
 * Get available email templates and their definitions
 */
exports.getTemplates = async (req, res, next) => {
    try {
        const templates = [
            // Original Templates
            { id: 'welcome', name: 'Welcome Email', fields: ['name', 'password'], description: 'Sent to newly created users with their credentials.' },
            { id: 'project_assigned', name: 'Project Assignment', fields: ['name', 'projectName', 'projectUrl'], description: 'Notifies a user they have been added to a project.' },
            { id: 'task_assigned', name: 'Task Assignment', fields: ['name', 'taskTitle', 'projectName', 'taskUrl'], description: 'Notifies a user of a new task.' },
            { id: 'salary_generated', name: 'Salary Generation', fields: ['name', 'month', 'netSalary'], description: 'Informs an employee that their salary slip is ready.' },
            { id: 'system_alert', name: 'System Alert', fields: ['subject', 'message'], description: 'Generic alert for important system announcements.' },
            {
                id: 'verification', name: 'Verification Email', fields: ['name', 'verificationUrl'], description: "Used to verify a user's email address."
            },
            { id: 'password_reset', name: 'Password Reset', fields: ['name', 'resetUrl'], description: 'Link to reset a forgotten password.' },
            { id: 'document_tagged', name: 'Document Shared', fields: ['name', 'documentName', 'documentUrl', 'senderName'], description: 'Notifies a user they were tagged in a shared document.' },

            // 15 New UI Improved Templates
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
        res.json({ templates });
    } catch (err) { next(err); }
};

/**
 * Generate Template Preview (HTML & Subject) before sending
 */
exports.previewTemplate = async (req, res, next) => {
    try {
        const { templateId, templateData } = req.body;

        if (!templateId) {
            return res.status(400).json({ error: 'Template ID is required' });
        }

        const preview = await EmailService.getTemplatePreview(templateId, templateData || {}, req.user.companyId);

        res.json({
            subject: preview.subject,
            html: preview.html
        });
    } catch (err) {
        console.error('Preview error:', err);
        return res.status(500).json({ error: err.message || 'Failed to generate preview' });
    }
};

/**
 * Internal helper to send the email directly with nodemailer when using custom/edited HTML 
 */
async function sendRawWithLogging(options, req) {
    const Settings = req.prisma.settings;
    const EmailLog = req.prisma.emailLog;
    const companyId = req.user?.companyId;
    
    const settingsRecord = await Settings.findFirst({ where: { companyId } });
    const company = await req.prisma.company.findUnique({ where: { id: companyId }, select: { metadata: true } });
    const metadata = company?.metadata || {};
    
    // Merge settings with metadata to ensure we get credentials wherever they were saved
    const settings = { ...settingsRecord };
    ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpSecure', 'emailFrom'].forEach(field => {
        if (metadata[field] !== undefined) settings[field] = metadata[field];
    });
    const log = await EmailLog.create({ data: {
        to: options.to,
        subject: options.subject,
        templateName: options.templateName || 'custom',
        templateData: options.templateData || {},
        sentById: req.user ? (req.user.id) : null,
        status: 'failed',
        companyId: companyId
    } });
    const logId = log.id;

    if (!settings || !settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
        await EmailLog.update({ where: { id: logId }, data: { errorMessage: 'SMTP not configured' } });
        return { success: false, error: 'SMTP not configured' };
    }

    try {
        const transporter = nodemailer.createTransport({
            host: settings.smtpHost,
            port: settings.smtpPort,
            secure: settings.smtpSecure,
            auth: {
                user: settings.smtpUser,
                pass: settings.smtpPass,
            },
        });

        const info = await transporter.sendMail({
            from: settings.emailFrom || 'noreply@internal.system',
            to: options.to,
            subject: options.subject,
            html: options.html,
        });

        await EmailLog.update({ where: { id: logId }, data: { status: 'sent' } });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        await EmailLog.update({ where: { id: logId }, data: { status: 'failed', errorMessage: error.message } });
        return { success: false, error: error.message };
    }
}

/**
 * Send an email based on a template and manual entry (supports overridden subject & html from edit step)
 */
exports.sendManualEmail = async (req, res, next) => {
    try {
        const { to, templateId, templateData, editedSubject, editedHtml } = req.body;

        if (!to || !templateId) {
            return res.status(400).json({ error: 'Recipient address and Template ID are required' });
        }

        let subject, html;

        if (editedSubject && editedHtml) {
            // Priority to edited content
            subject = editedSubject;
            html = editedHtml;
        } else {
            // Generate standard preview
            const preview = await EmailService.getTemplatePreview(templateId, templateData || {}, req.user.companyId);
            subject = preview.subject;
            html = preview.html;
        }

        const result = await sendRawWithLogging({
            to,
            subject,
            html,
            templateName: templateId,
            templateData: templateData || {},
        }, req);

        if (!result.success) {
            return res.status(500).json({ error: result.error || 'Failed to send email' });
        }

        res.json({ message: 'Email sent successfully and logged' });
    } catch (err) { next(err); }
};

exports.sendCustomEmail = async (req, res, next) => {
    try {
        const { to, subject, body } = req.body;

        if (!to || !subject || !body) {
            return res.status(400).json({ error: 'Recipient, subject, and body are required' });
        }

        const result = await sendRawWithLogging({
            to,
            subject,
            html: body,
            templateName: 'custom'
        }, req);

        if (!result.success) {
            return res.status(500).json({ error: result.error || 'Failed to send email' });
        }

        res.json({ message: 'Custom email sent successfully' });
    } catch (err) { next(err); }
};

/**
 * Send an email with a document attachment (base64)
 */
exports.sendDocumentEmail = async (req, res, next) => {
    try {
        const { to, name, documentName, message, fileData, fileName, attachment: nestedAttachment } = req.body;

        if (!to) {
            return res.status(400).json({ error: 'Recipient email is required' });
        }

        let finalAttachment;
        if (nestedAttachment && nestedAttachment.fileData) {
            finalAttachment = {
                filename: nestedAttachment.fileName || 'document.pdf',
                content: nestedAttachment.fileData.split('base64,')[1] || nestedAttachment.fileData,
                encoding: 'base64'
            };
        } else if (fileData && fileName) {
            finalAttachment = {
                filename: fileName,
                content: fileData.split('base64,')[1] || fileData,
                encoding: 'base64'
            };
        } else {
            return res.status(400).json({ error: 'File data and file name are required' });
        }

        const result = await EmailService.notify(to, 'document_attachment', {
            name: name || 'Valued Recipient',
            documentName: documentName || 'Document',
            message: message || 'Attached document for your review.',
        }, req.user.companyId, { attachments: [finalAttachment], category: 'WORK' });

        if (!result.success) {
            return res.status(500).json({ error: result.error || 'Failed to send document email' });
        }

        res.json({ message: 'Document sent successfully via email' });
    } catch (err) { next(err); }
};

/**
 * Send bulk email to all users of a given role (or all users)
 */
exports.sendBulkEmail = async (req, res, next) => {
    try {
        const { role, subject, message } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ error: 'Subject and message are required' });
        }

        const User = req.prisma.user;
        const query = role && role !== 'all' ? { role, isActive: true, companyId: req.user.companyId } : { isActive: true, companyId: req.user.companyId };
        const users = await User.findMany({ where: query, select: { email: true, name: true } });

        if (!users.length) {
            return res.status(404).json({ error: 'No users found for the selected role' });
        }

        let sent = 0;
        let failed = 0;

        for (const user of users) {
            try {
                const result = await sendRawWithLogging({
                    to: user.email,
                    subject,
                    html: message,
                    templateName: 'bulk',
                }, req);
                if (result.success) sent++; else failed++;
            } catch (e) {
                failed++;
            }
        }

        res.json({
            message: `Bulk email complete. Sent: ${sent}, Failed: ${failed}`,
            sent,
            failed,
            total: users.length
        });
    } catch (err) { next(err); }
};

/**
 * Retry a failed email log entry
 */
exports.retryEmail = async (req, res, next) => {
    try {
        const EmailLog = req.prisma.emailLog;
        const log = await EmailLog.findUnique({ where: { id: req.params.id } });

        if (!log) {
            return res.status(404).json({ error: 'Email log not found' });
        }

        if (log.status === 'sent') {
            return res.status(400).json({ error: 'Email already sent successfully' });
        }

        const result = await sendRawWithLogging({
            to: log.to,
            subject: `Retry: ${log.subject}`,
            html: log.html || `Retry trigger: ${log.subject}`, // Ideally we'd store HTML, but fallback message for now
            templateName: log.templateName,
            templateData: log.templateData,
        }, req);

        if (result.success) {
            // Also update the original log
            await EmailLog.update({
                where: { id: log.id },
                data: {
                    status: 'sent',
                    errorMessage: null,
                    sentById: req.user.id
                }
            });
            return res.json({ message: 'Email retry successful' });
        }

        res.status(500).json({ error: result.error || 'Retry failed' });
    } catch (err) { next(err); }
};

/**
 * Get detailed stats for email service
 */
exports.getEmailStats = async (req, res, next) => {
    try {
        const EmailLog = req.prisma.emailLog;
        
        const companyId = req.user.companyId;

        // Total sent vs failed
        const statusGroups = await EmailLog.groupBy({
            by: ['status'],
            where: { companyId },
            _count: { _all: true }
        });
        const statusStats = statusGroups.map(g => ({ _id: g.status, count: g._count._all }));

        const templateGroups = await EmailLog.groupBy({
            by: ['templateName', 'status'],
            where: { companyId },
            _count: { _all: true }
        });
        
        const templateMap = {};
        templateGroups.forEach(g => {
            if (!templateMap[g.templateName]) templateMap[g.templateName] = { _id: g.templateName, count: 0, failed: 0 };
            templateMap[g.templateName].count += g._count._all;
            if (g.status === 'failed') templateMap[g.templateName].failed += g._count._all;
        });
        const templateStats = Object.values(templateMap).sort((a, b) => b.count - a.count).slice(0, 10);

        // Last 7 days activity - Prisma group by date is tricky so we do raw query or fetch and group in memory
        const dateLimit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentLogs = await EmailLog.findMany({
            where: { companyId, createdAt: { gte: dateLimit } },
            select: { createdAt: true }
        });
        const dateMap = {};
        recentLogs.forEach(log => {
            const date = log.createdAt.toISOString().split('T')[0];
            dateMap[date] = (dateMap[date] || 0) + 1;
        });
        const recentActivity = Object.keys(dateMap).sort().map(k => ({ _id: k, count: dateMap[k] }));

        res.json({ stats: statusStats, templateStats, recentActivity });
    } catch (err) { next(err); }
};

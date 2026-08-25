import { Request, Response, NextFunction } from 'express';
import { EmailService, EmailManagementService } from '@workspace/communications';

export const getEmailLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = 1, limit = 50, to, status } = req.query;
        const result = await EmailManagementService.getEmailLogs(Number(page), Number(limit), to as string, status as string);
        res.json(result);
    } catch (err) { next(err); }
};

export const getTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const templates = EmailManagementService.getTemplates();
        res.json({ templates });
    } catch (err) { next(err); }
};

export const previewTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { templateId, templateData } = req.body;
        if (!templateId) {
            return res.status(400).json({ error: 'Template ID is required' });
        }
        const preview = await EmailService.getTemplatePreview(templateId, templateData || {});
        res.json({
            subject: preview.subject,
            html: preview.html
        });
    } catch (err: any) {
  next(err);
}
};

export const sendManualEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { to, templateId, templateData, editedSubject, editedHtml } = req.body;
        if (!to || !templateId) {
            return res.status(400).json({ error: 'Recipient address and Template ID are required' });
        }

        const result = await EmailManagementService.sendManualEmail(
            (req as any).user.id,
            to,
            templateId,
            templateData,
            editedSubject,
            editedHtml
        );

        if (!result.success) {
            return res.status(500).json({ error: result.error || 'Failed to send email' });
        }

        res.json({ message: 'Email sent successfully and logged' });
    } catch (err) { next(err); }
};

export const sendCustomEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { to, subject, body } = req.body;
        if (!to || !subject || !body) {
            return res.status(400).json({ error: 'Recipient, subject, and body are required' });
        }

        const result = await EmailManagementService.sendCustomEmail(
            (req as any).user.id,
            to,
            subject,
            body
        );

        if (!result.success) {
            return res.status(500).json({ error: result.error || 'Failed to send email' });
        }

        res.json({ message: 'Custom email sent successfully' });
    } catch (err) { next(err); }
};

export const sendDocumentEmail = async (req: Request, res: Response, next: NextFunction) => {
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
        }, { attachments: [finalAttachment], category: 'WORK' });

        if (!result.success) {
            return res.status(500).json({ error: result.error || 'Failed to send document email' });
        }

        res.json({ message: 'Document sent successfully via email' });
    } catch (err) { next(err); }
};

export const sendBulkEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { role, subject, message } = req.body;
        if (!subject || !message) {
            return res.status(400).json({ error: 'Subject and message are required' });
        }

        const result = await EmailManagementService.sendBulkEmail(
            role,
            subject,
            message,
            (req as any).user.id
        );

        res.json({
            message: `Bulk email complete. Sent: ${result.sent}, Failed: ${result.failed}`,
            sent: result.sent,
            failed: result.failed,
            total: result.total
        });
    } catch (err: any) {
        if (err.message === 'No users found for the selected role') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const retryEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await EmailManagementService.retryEmail(req.params.id, (req as any).user.id);
        res.json({ message: 'Email retry successful' });
    } catch (err: any) {
  next(err);
}
};

export const getEmailStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await EmailManagementService.getEmailStats();
        res.json(stats);
    } catch (err) { next(err); }
};

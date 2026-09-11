// @ts-nocheck
import { CrmCalculationService } from '../sales/crm-calculation.service';
import { EmailService } from '@workspace/backend-infra';
const emailService = EmailService;

import { prisma } from '@workspace/db';
import moment from 'moment';
import * as salesMath from '../utils/salesMath';
const bcrypt = require('bcryptjs');

export class QuotesService {
static async getQuotes(page = 1, limit = 100) {
        const skip = (page - 1) * limit;
        const Quote = prisma.quote;

        const quotes = await Quote.findMany({
            include: { 
                createdBy: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip: skip,
            take: limit
        });

        // Manually populate client and opportunity data
        const Client = prisma.client;
        
        for (const q of quotes) {
            if (q.clientId) {
                const c = await Client.findUnique({ where: { id: q.clientId } });
                if (c) {
                    q.clientId = { id: c.id, name: c.name, company: c.company, email: c.email };
                }
            }
            if (q.opportunityId) {
                const opp = await prisma.deal.findUnique({ where: { id: q.opportunityId } });
                if (opp) {
                    q.opportunityId = { id: opp.id, title: opp.title };
                }
            }
        }

        const total = await Quote.count();
        return { quotes, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
    }

static async createQuote(data, userId) {
        const Quote = prisma.quote;
        const quoteNumber = `QT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

        const payload = { ...data };
        if (payload.validUntil) payload.validUntil = new Date(payload.validUntil).toISOString();
        if (payload.createdBy) delete payload.createdBy;
        if (payload.companyId) delete payload.companyId;
        if (payload.taxTotal !== undefined) {
            payload.tax = payload.taxTotal;
            delete payload.taxTotal;
        }

        const quote = await Quote.create({ data: {
            ...payload,
            quoteNumber,
            createdById: userId
        } });

        return quote;
    }

static async updateQuote(id, data) {
        const Quote = prisma.quote;
        const payload = { ...data };
        if (payload.validUntil) payload.validUntil = new Date(payload.validUntil);
        if (payload.taxTotal !== undefined) {
            payload.tax = payload.taxTotal;
            delete payload.taxTotal;
        }

        const quote = await Quote.update({ where: { id }, data: payload });
        if (!quote) throw new Error('Quote not found');
        return quote;
    }

static async deleteQuote(id) {
        const Quote = prisma.quote;
        const quote = await Quote.delete({ where: { id } });
        if (!quote) throw new Error('Quote not found');
        return quote;
    }

static async getQuoteForPdf(id) {
        const Quote = prisma.quote;
        const Client = prisma.client;
        const quote = await Quote.findUnique({ where: { id } });
        if (!quote) throw new Error('Quote not found');
        if (quote.clientId) {
            const client = await Client.findUnique({ where: { id: quote.clientId } });
            if (client) {
                quote.clientId = { id: client.id, name: client.name, company: client.company, email: client.email };
            }
        }
        return quote;
    }

static async sendQuoteEmail(id, user, emailOverride, reqCompany) {
        const Settings = prisma.settings;
        const Quote = prisma.quote;
        const Client = prisma.client;
        const PDFDocument = require('pdfkit');
        

        const companyId = reqCompany?.id || (user as any)?.companyId;
        const company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : await prisma.company.findFirst();
        let metadata: any = company?.metadata || {};
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
        }
        const ps = await prisma.platformSettings.findFirst();

        const settings = companyId ? await Settings.findFirst({ where: { companyId } }) : await Settings.findFirst();
        const hasSmtp = (settings && settings.smtpHost && settings.smtpUser && settings.smtpPass) ||
                        (metadata && metadata.smtpHost && metadata.smtpUser && metadata.smtpPass) ||
                        (ps && ps.smtpHost && ps.smtpUser && ps.smtpPass) ||
                        (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

        if (!hasSmtp) {
            const isAdmin = ['admin', 'superadmin', 'manager'].includes(user.role);
            const message = isAdmin
                ? 'Email configuration missing. Please go to Settings > Email and configure your SMTP settings to enable sending quotes.'
                : 'Email configuration is not set up. Please contact your system administrator to configure SMTP settings.';
            const err = new Error(message);
            err.type = 'SMTP_MISSING';
            err.status = 400;
            throw err;
        }

        const quote = await Quote.findUnique({ where: { id } });
        if (!quote) throw new Error('Quote not found');
        
        if (quote.clientId) {
            const client = await Client.findUnique({ where: { id: quote.clientId } });
            if (client) {
                quote.clientId = { id: client.id, name: client.name, company: client.company, email: client.email };
            }
        }

        const recipientEmail = emailOverride || quote.clientId?.email;
        if (!recipientEmail) {
            const err = new Error('Recipient email is missing. Please provide an email address.');
            err.status = 400;
            throw err;
        }

        const doc = new PDFDocument();
        let chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        
        pdfUtils.generateQuotationPDF(doc, quote, reqCompany);
        doc.end();

        const pdfBuffer = await new Promise((resolve) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
        });

        
        const result = await emailService.sendQuotationEmail(recipientEmail, {
            quoteNumber: quote.quoteNumber,
            grandTotal: quote.grandTotal,
            validUntil: new Date(quote.validUntil).toLocaleDateString(),
            userName: user.name,
            clientName: quote.clientId?.name || 'Customer',
            viewUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard/sales/quotes/${quote.id}`
        }, [
            {
                filename: `Quote_${quote.quoteNumber}.pdf`,
                content: pdfBuffer
            }
        ]);

        if (!result.success) {
            const err = new Error('Failed to send email: ' + result.error);
            err.status = 500;
            throw err;
        }

        await prisma.salesActivity.create({ data: {
            type: 'email',
            relatedDeal: quote.opportunityId,
            relatedContact: quote.clientId?.id,
            notes: `Sent quotation ${quote.quoteNumber} to ${recipientEmail}`,
            owner: user.id
        } });

        return { message: 'Quotation sent successfully to ' + recipientEmail, quote };
    }

}

import { Request, Response, NextFunction } from 'express';
import { SalesService } from '@workspace/crm-and-sales';
import { cacheGet, cacheSet, cacheDel } from '../../../../system-configs/middleware/system/cache';
import { logAction } from '../../../../system-configs/utils/audit';
import * as PDFDocument from 'pdfkit';
import { pdfUtils } from '@workspace/backend-infra';
const { generateQuotationPDF, generateContractPDF } = pdfUtils;

// AIAssistantService is typically in @workspace/workspace-tools now
const { AIAssistantService } = require('@workspace/workspace-tools');

const clearCRMCache = async (companyId: string, res: Response) => {
  try {

    if (!companyId) return;
    const timeframes = ['all', '7days', 'weekly', 'month', 'months'];
    for (const t of timeframes) {
        await cacheDel(`company:${companyId}:dashboard_metrics_v2:${t}`);
    }
    await cacheDel(`company:${companyId}:forecasting`);
    await cacheDel(`company:${companyId}:productivity`);

  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// DASHBOARD & METRICS
// -------------------------------------------------------------
export const getDashboardMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user, company } = req as any;
        const timeframe = req.query.timeframe || 'all';
        const cacheKey = `company:${company.id}:dashboard_metrics_v2:${timeframe}`;
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(cached);

        const result = await SalesService.getDashboardMetrics(user.id, company.id, timeframe as string);
        
        await cacheSet(cacheKey, result, 300);
        res.json(result);
    } catch (err) {
        console.error('[SalesController Error]', err);
        next(err);
    }
};

export const getProductivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user, company } = req as any;
        const cacheKey = `company:${company.id}:productivity`;
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(cached);

        const result = await SalesService.getProductivity(user.id);

        await cacheSet(cacheKey, result, 300);
        res.json(result);
    } catch (err) { next(err); }
};

export const getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await SalesService.getRecommendations((req as any).user.id);
        res.json(result);
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// LEADS
// -------------------------------------------------------------
export const getLeads = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 100;
        
        const result = await SalesService.getLeads(page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

export const createLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const lead = await SalesService.createLead(req.body, (req as any).user.id);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.status(201).json({ lead });
    } catch (err) { next(err); }
};

export const updateLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const lead = await SalesService.updateLead(req.params.id, req.body);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ lead });
    } catch (err) { next(err); }
};

export const deleteLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await SalesService.deleteLead(req.params.id);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ message: 'Lead deleted' });
    } catch (err) { next(err); }
};

export const convertLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await SalesService.convertLead(req.params.id, (req as any).user.id);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ message: 'Lead converted successfully', ...result });
    } catch (err) { next(err); }
};

export const importLeads = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const count = await SalesService.importLeads(req.body.leads, (req as any).user.id);
        res.status(201).json({ message: `Successfully imported ${count} leads`, count });
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// CONTRACTS & AI ANALYSIS
// -------------------------------------------------------------
export const analyzeContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const analysis = await SalesService.analyzeContract(req.body.text);
        res.json({ analysis });
    } catch (err) { next(err); }
};

export const proposeContractUpdates = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const proposal = await SalesService.proposeContractUpdates(req.body.text, req.body.updates);
        res.json({ proposal });
    } catch (err) { next(err); }
};

export const createContractWithAI = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contract = await SalesService.createContractWithAI((req as any).company, req.body.instructions, req.body.clientId);
        res.json({ contract });
    } catch (err) { next(err); }
};

export const downloadContractPDF = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { contractTitle, contractText, clientId } = req.body;
        if (!contractText) return res.status(400).json({ error: 'Contract text is required' });

        const clientObj = await SalesService.getClientObjForContract(clientId);
        const doc = new (PDFDocument as any)({ margin: 50 });
        const filename = `${contractTitle ? contractTitle.replace(/\s+/g, '_') : 'Contract'}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);
        generateContractPDF(doc, { contractTitle, contractText }, (req as any).company, clientObj);
        doc.end();
    } catch (err) { next(err); }
};

export const emailContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await SalesService.emailContract(
            (req as any).company, 
            (req as any).user.id, 
            (req as any).user.name, 
            req.body.contractTitle, 
            req.body.contractText, 
            req.body.clientId, 
            req.body.email
        );
        res.json(result);
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// OPPORTUNITIES
// -------------------------------------------------------------
export const getOpportunities = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 100;
        const pipelineType = req.query.pipelineType as string;
        const result = await SalesService.getOpportunities(page, limit, pipelineType);
        res.json(result);
    } catch (err) { next(err); }
};

export const createOpportunity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await SalesService.createOpportunity(req.body, (req as any).user.id);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.status(201).json({ opportunity: result });
    } catch (err) { next(err); }
};

export const updateOpportunity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await SalesService.updateOpportunity(req.params.id, req.body, (req as any).company?.id);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json(result);
    } catch (err) { next(err); }
};

export const deleteOpportunity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const opp = await SalesService.deleteOpportunity(req.params.id);
        await logAction((req as any).user.id, 'DELETE_OPPORTUNITY', 'opportunity', opp.id, { title: opp.title }, req);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ message: 'Opportunity deleted' });
    } catch (err) { next(err); }
};

export const createProjectFromOpportunity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await SalesService.createProjectFromOpportunity(req.params.id, (req as any).user.id);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.status(201).json(result);
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// ACCOUNTS & CONTACTS
// -------------------------------------------------------------
export const getAccounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 100;
        const result = await SalesService.getAccounts(page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

export const createAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account = await SalesService.createAccount(req.body, (req as any).user.id);
        await logAction((req as any).user.id, 'CREATE_ACCOUNT', 'account', account.id, { companyName: account.companyName }, req);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.status(201).json({ account });
    } catch (err) { next(err); }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account = await SalesService.updateAccount(req.params.id, req.body);
        await logAction((req as any).user.id, 'UPDATE_ACCOUNT', 'account', account.id, { companyName: account.companyName }, req);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ account });
    } catch (err) { next(err); }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account = await SalesService.deleteAccount(req.params.id);
        await logAction((req as any).user.id, 'DELETE_ACCOUNT', 'account', account.id, { companyName: account.companyName }, req);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ message: 'Account deleted' });
    } catch (err) { next(err); }
};

export const getContacts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 100;
        const result = await SalesService.getContacts(page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

export const getContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await SalesService.getContact(req.params.id);
        res.json(result);
    } catch (err) { next(err); }
};

export const createContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contact = await SalesService.createContact(req.body);
        await logAction((req as any).user.id, 'CREATE_CONTACT', 'contact', contact.id, { name: contact.name }, req);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.status(201).json({ contact });
    } catch (err: any) { 
        if (err.status) {
            return res.status(err.status).json({ error: err.message, duplicateId: err.duplicateId });
        }
        next(err); 
    }
};

export const updateContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contact = await SalesService.updateContact(req.params.id, req.body);
        await logAction((req as any).user.id, 'UPDATE_CONTACT', 'contact', contact.id, { name: contact.name }, req);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ contact });
    } catch (err) { next(err); }
};

export const deleteContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contact = await SalesService.deleteContact(req.params.id);
        await logAction((req as any).user.id, 'DELETE_CONTACT', 'contact', contact.id, { name: contact.name }, req);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ message: 'Contact deleted' });
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// ACTIVITIES
// -------------------------------------------------------------
export const getActivities = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 100;
        const result = await SalesService.getActivities(page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

export const createActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await SalesService.createActivity(req.body, (req as any).user.id);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.status(201).json({ activity: result });
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// AI ENHANCEMENTS (Phase 5)
// -------------------------------------------------------------
export const generateEmailDraft = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { contextMessage } = req.body;
        const settings = await SalesService.getSystemSettings();

        if (!settings.aiProvider || settings.aiProvider === 'none') {
            return res.status(400).json({ error: 'AI provider not configured in settings.' });
        }

        const draft = await AIAssistantService.draftSalesEmail(contextMessage, settings);
        res.json(draft);
    } catch (err) { next(err); }
};

export const salesChatAssistant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { query } = req.body;
        const settings = await SalesService.getSystemSettings();

        if (!settings.aiProvider || settings.aiProvider === 'none') {
            return res.status(400).json({ error: 'AI provider not configured in settings.' });
        }

        const contextData = await SalesService.getSalesChatContext();
        const reply = await AIAssistantService.salesAssistantChat(query, contextData, settings);
        res.json(reply);
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// QUOTATIONS
// -------------------------------------------------------------
export const getQuotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 100;
        const result = await SalesService.getQuotes(page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

export const createQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await SalesService.createQuote(req.body, (req as any).user.id, (req as any).company.id);
        await logAction((req as any).user.id, 'CREATE_QUOTE', 'quote', quote.id, { quoteNumber: quote.quoteNumber }, req).catch(() => {});
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.status(201).json({ quote });
    } catch (err) { next(err); }
};

export const updateQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await SalesService.updateQuote(req.params.id, req.body);
        await logAction((req as any).user.id, 'UPDATE_QUOTE', 'quote', quote.id, { quoteNumber: quote.quoteNumber }, req).catch(() => {});
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ quote });
    } catch (err) { next(err); }
};

export const deleteQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await SalesService.deleteQuote(req.params.id);
        await logAction((req as any).user.id, 'DELETE_QUOTE', 'quote', quote.id, { quoteNumber: quote.quoteNumber }, req).catch(() => {});
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ message: 'Quote deleted successfully' });
    } catch (err) { next(err); }
};

export const generateQuotePDF = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await SalesService.getQuoteForPdf(req.params.id);
        const doc = new (PDFDocument as any)({ margin: 50 });
        const filename = `Quote_${quote.quoteNumber}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);
        generateQuotationPDF(doc, quote, (req as any).company);
        doc.end();
    } catch (err) { next(err); }
};

export const sendQuoteEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await SalesService.sendQuoteEmail(req.params.id, (req as any).user, req.body.email, (req as any).company);
        await logAction((req as any).user.id, 'SEND_QUOTE_EMAIL', 'quote', result.quote.id, { quoteNumber: result.quote.quoteNumber, recipient: req.body.email || result.quote.clientId?.email }, req).catch(() => {});
        res.json({ message: result.message });
    } catch (err: any) { 
        if (err.type === 'SMTP_MISSING' || err.status === 400) {
            return res.status(400).json({ error: err.message, type: err.type });
        }
        next(err); 
    }
};

// -------------------------------------------------------------
// REVENUE
// -------------------------------------------------------------
export const getRevenueStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const timeframe = req.query.timeframe || 'all';
        const result = await SalesService.getRevenueStats(timeframe as string);
        res.json(result);
    } catch (err) { next(err); }
};
export const getSalesActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { prisma } = require('@workspace/db');
        const leads = await prisma.lead.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 5
        });
        const deals = await prisma.deal.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 5
        });
        
        const activity = [
            ...leads.map((l: any) => ({
                id: 'lead_' + l.id,
                client: l.clientName || l.title || 'Unknown Client',
                action: 'updated lead',
                target: l.title,
                time: l.updatedAt,
                type: 'lead'
            })),
            ...deals.map((d: any) => ({
                id: 'deal_' + d.id,
                client: d.companyName || d.name || 'Unknown Client',
                action: 'updated deal',
                target: d.name,
                time: d.updatedAt,
                type: 'deal'
            }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);
        
        res.json(activity);
    } catch (error) {
        next(error);
    }
};

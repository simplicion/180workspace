import { Request, Response, NextFunction } from 'express';
import {
    LeadsService,
    DealsService,
    QuotesService,
    ActivitiesService,
    AnalyticsService,
    ClientSalesService,
    ContractSalesService
} from '@workspace/crm-and-sales';
import { cacheGet, cacheSet, cacheDel } from '../../../../system-configs/middleware/system/cache';
import { logAction } from '../../../../system-configs/utils/audit';
import * as PDFDocument from 'pdfkit';
import { pdfUtils } from '@workspace/backend-infra';
const { generateQuotationPDF, generateContractPDF } = pdfUtils;

// AIAssistantService is typically in @workspace/workspace-tools now
const { AIAssistantService } = require('@workspace/workspace-tools');

const clearCRMCache = async (companyId: string) => {
  try {

    if (!companyId) return;
    const timeframes = ['all', '7days', 'weekly', 'month', 'months'];
    for (const t of timeframes) {
        await cacheDel(`company:${companyId}:dashboard_metrics_v2:${t}`);
    }
    await cacheDel(`company:${companyId}:forecasting`);
    await cacheDel(`company:${companyId}:productivity`);

  } catch (error) {
    console.error('Failed to clear CRM cache for company:', companyId, error);
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

        const result = await AnalyticsService.getDashboardMetrics(user.id, timeframe as string);
        
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

        const result = await AnalyticsService.getProductivity(user.id);

        await cacheSet(cacheKey, result, 300);
        res.json(result);
    } catch (err) { next(err); }
};

export const getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await AnalyticsService.getRecommendations((req as any).user.id);
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
        
        const result = await LeadsService.getLeads(page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

export const createLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const lead = await LeadsService.createLead(req.body, (req as any).user.id);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.status(201).json({ lead });
    } catch (err) { next(err); }
};

export const updateLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const lead = await LeadsService.updateLead(req.params.id, req.body);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ lead });
    } catch (err) { next(err); }
};

export const deleteLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await LeadsService.deleteLead(req.params.id);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ message: 'Lead deleted' });
    } catch (err) { next(err); }
};

export const convertLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await LeadsService.convertLead(req.params.id, (req as any).user.id);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ message: 'Lead converted successfully', ...result });
    } catch (err) { next(err); }
};

export const importLeads = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const count = await LeadsService.importLeads(req.body.leads, (req as any).user.id);
        res.status(201).json({ message: `Successfully imported ${count} leads`, count });
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// CONTRACTS & AI ANALYSIS
// -------------------------------------------------------------
export const analyzeContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const analysis = await ContractSalesService.analyzeContract(req.body.text);
        res.json({ analysis });
    } catch (err) { next(err); }
};

export const proposeContractUpdates = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const proposal = await ContractSalesService.proposeContractUpdates(req.body.text, req.body.updates);
        res.json({ proposal });
    } catch (err) { next(err); }
};

export const createContractWithAI = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contract = await ContractSalesService.createContractWithAI((req as any).company, req.body.instructions, req.body.clientId);
        res.json({ contract });
    } catch (err) { next(err); }
};

export const downloadContractPDF = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { contractTitle, contractText, clientId } = req.body;
        if (!contractText) return res.status(400).json({ error: 'Contract text is required' });

        const clientObj = await ContractSalesService.getClientObjForContract(clientId);
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
        const result = await ContractSalesService.emailContract(
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
        const result = await DealsService.getOpportunities(page, limit, pipelineType);
        res.json(result);
    } catch (err) { next(err); }
};

export const createOpportunity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await DealsService.createOpportunity(req.body, (req as any).user.id);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.status(201).json({ opportunity: result });
    } catch (err) { next(err); }
};

export const updateOpportunity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await DealsService.updateOpportunity(req.params.id, req.body);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json(result);
    } catch (err) { next(err); }
};

export const deleteOpportunity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const opp = await DealsService.deleteOpportunity(req.params.id);
        await logAction((req as any).user.id, 'DELETE_OPPORTUNITY', 'opportunity', opp.id, { title: opp.title }, req);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ message: 'Opportunity deleted' });
    } catch (err) { next(err); }
};

export const createProjectFromOpportunity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await DealsService.createProjectFromOpportunity(req.params.id, (req as any).user.id);
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
        const result = await ClientSalesService.getAccounts(page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

export const createAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account = await ClientSalesService.createAccount(req.body, (req as any).user.id);
        await logAction((req as any).user.id, 'CREATE_ACCOUNT', 'account', account.id, { companyName: account.companyName }, req);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.status(201).json({ account });
    } catch (err) { next(err); }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account = await ClientSalesService.updateAccount(req.params.id, req.body);
        await logAction((req as any).user.id, 'UPDATE_ACCOUNT', 'account', account.id, { companyName: account.companyName }, req);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ account });
    } catch (err) { next(err); }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account = await ClientSalesService.deleteAccount(req.params.id);
        await logAction((req as any).user.id, 'DELETE_ACCOUNT', 'account', account.id, { companyName: account.companyName }, req);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ message: 'Account deleted' });
    } catch (err) { next(err); }
};

export const getContacts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 100;
        const result = await ClientClientSalesService.getContacts(page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

export const getContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ClientSalesService.getContact(req.params.id);
        res.json(result);
    } catch (err) { next(err); }
};

export const createContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contact = await ClientSalesService.createContact(req.body);
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
        const contact = await ClientSalesService.updateContact(req.params.id, req.body);
        await logAction((req as any).user.id, 'UPDATE_CONTACT', 'contact', contact.id, { name: contact.name }, req);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ contact });
    } catch (err) { next(err); }
};

export const deleteContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contact = await ClientSalesService.deleteContact(req.params.id);
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
        const isAll = req.query.all === 'true';
        const ownerId = isAll ? undefined : (req as any).user.id;
        
        const result = await ActivitiesService.getActivities(page, limit, ownerId);
        res.json(result);
    } catch (err) { next(err); }
};

export const createActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ActivitiesService.createActivity(req.body, (req as any).user.id);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.status(201).json({ activity: result });
    } catch (err) { next(err); }
};

export const reviewActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, reviewComment } = req.body;
        const result = await ActivitiesService.reviewActivity(req.params.id, status, reviewComment, (req as any).user.id);
        res.json(result);
    } catch (err) { next(err); }
};
// -------------------------------------------------------------
// AI ENHANCEMENTS (Phase 5)
// -------------------------------------------------------------
export const generateEmailDraft = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { contextMessage } = req.body;
        const settings = await AnalyticsService.getSystemSettings();

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
        const settings = await AnalyticsService.getSystemSettings();

        if (!settings.aiProvider || settings.aiProvider === 'none') {
            return res.status(400).json({ error: 'AI provider not configured in settings.' });
        }

        const contextData = await ContractSalesService.getSalesChatContext();
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
        const result = await QuotesService.getQuotes(page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

export const createQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await QuotesService.createQuote(req.body, (req as any).user.id);
        await logAction((req as any).user.id, 'CREATE_QUOTE', 'quote', quote.id, { quoteNumber: quote.quoteNumber }, req).catch(() => {});
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.status(201).json({ quote });
    } catch (err) { next(err); }
};

export const updateQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await QuotesService.updateQuote(req.params.id, req.body);
        await logAction((req as any).user.id, 'UPDATE_QUOTE', 'quote', quote.id, { quoteNumber: quote.quoteNumber }, req).catch(() => {});
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ quote });
    } catch (err) { next(err); }
};

export const deleteQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await QuotesService.deleteQuote(req.params.id);
        await logAction((req as any).user.id, 'DELETE_QUOTE', 'quote', quote.id, { quoteNumber: quote.quoteNumber }, req).catch(() => {});
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ message: 'Quote deleted successfully' });
    } catch (err) { next(err); }
};

export const generateQuotePDF = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await QuotesService.getQuoteForPdf(req.params.id);
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
        const result = await QuotesService.sendQuoteEmail(req.params.id, (req as any).user, req.body.email, (req as any).company);
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
        const result = await AnalyticsService.getRevenueStats(timeframe as string);
        res.json(result);
    } catch (err) { next(err); }
};
export const getSalesActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { prisma } = require('@workspace/db');
        // Properly matching 'prisma.lead' -> Leads, 'prisma.deal' -> Deals
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
                client: l.clientName || l.name || 'Unknown Client',
                action: 'updated lead',
                target: l.name,
                time: l.updatedAt,
                type: 'lead'
            })),
            ...deals.map((d: any) => ({
                id: 'deal_' + d.id,
                client: d.companyName || d.title || 'Unknown Client',
                action: 'updated deal',
                target: d.title,
                time: d.updatedAt,
                type: 'deal'
            }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);
        
        res.json(activity);
    } catch (error) {
        next(error);
    }
};

// -------------------------------------------------------------
// DEALS
// -------------------------------------------------------------
export const getDeals = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 100;
        const pipelineType = req.query.pipelineType as string;
        const result = await DealsService.getDeals(page, limit, pipelineType);
        res.json(result);
    } catch (err) { next(err); }
};

export const createDeal = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await DealsService.createDeal(req.body, (req as any).user.id);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.status(201).json({ deal: result });
    } catch (err) { next(err); }
};

export const updateDeal = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await DealsService.updateDeal(req.params.id, req.body);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json(result);
    } catch (err) { next(err); }
};

export const deleteDeal = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deal = await DealsService.deleteDeal(req.params.id);
        await logAction((req as any).user.id, 'DELETE_DEAL', 'deal', deal.id, { title: deal.title }, req);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.json({ message: 'Deal deleted successfully' });
    } catch (err) { next(err); }
};

export const importDeals = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const count = await DealsService.importDeals(req.body.deals, (req as any).user.id);
        res.status(201).json({ message: `Successfully imported ${count} deals`, count });
    } catch (err) { next(err); }
};

export const createProjectFromDeal = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await DealsService.createProjectFromDeal(req.params.id, (req as any).user.id);
        if ((req as any).company && (req as any).company.id) await clearCRMCache((req as any).company.id);
        res.status(201).json(result);
    } catch (err) { next(err); }
};

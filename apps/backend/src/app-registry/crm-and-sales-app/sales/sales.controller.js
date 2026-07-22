'use strict';

const SalesService = require('./sales.service');
const {
    calculateRFM,
    forecastPipeline,
    scoreLead,
    calculateWinProbability,
    calculateCustomerRiskIndex,
    calculateRepProductivity
} = require('../../company-hub-app/crm/CrmCalculationService.js');
const { cacheGet, cacheSet, cacheDel } = require('../../../system-configs/middleware/system/cache.js');

const clearCRMCache = async (companyId) => {
    if (!companyId) return;
    await cacheDel(`tenant:${companyId}:dashboard_metrics_v2`);
    await cacheDel(`tenant:${companyId}:forecasting`);
    await cacheDel(`tenant:${companyId}:productivity`);
};

const AIAutomationService = require('../../productivity-tools-app/ai-assistant/ai-automation.service');
const SalesRuleEngine = require('./sales-rule-engine.service');
const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { generateQuotationPDF } = require('../../../platform-core/platform-engine/pdf/pdf.utils.js');

// -------------------------------------------------------------
// DASHBOARD & METRICS
// -------------------------------------------------------------
exports.getDashboardMetrics = async (req, res, next) => {
    try {
        const { user, company, prisma } = req;
        const cacheKey = `tenant:${company.id}:dashboard_metrics_v2`;
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(cached);

        const result = await SalesService.getDashboardMetrics(prisma, user.id, company.id);
        
        await cacheSet(cacheKey, result, 300);
        res.json(result);
    } catch (err) {
        console.error('[SalesController Error]', err);
        next(err);
    }
};

exports.getForecasting = async (req, res, next) => {
    try {
        const { company, prisma } = req;
        const cacheKey = `tenant:${company.id}:forecasting`;
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(cached);

        const result = await SalesService.getForecasting(prisma, company.id);

        await cacheSet(cacheKey, result, 600); // 10 min cache
        res.json(result);
    } catch (err) { next(err); }
};

exports.getProductivity = async (req, res, next) => {
    try {
        const { user, company, prisma } = req;
        const cacheKey = `tenant:${company.id}:productivity`;
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(cached);

        const result = await SalesService.getProductivity(prisma, user.id);

        await cacheSet(cacheKey, result, 300);
        res.json(result);
    } catch (err) { next(err); }
};

exports.getRecommendations = async (req, res, next) => {
    try {
        const result = await SalesService.getRecommendations(req.prisma, req.user.id);
        res.json(result);
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// LEADS
// -------------------------------------------------------------
exports.getLeads = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        
        const result = await SalesService.getLeads(req.prisma, page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createLead = async (req, res, next) => {
    try {
        const lead = await SalesService.createLead(req.prisma, req.body, req.user.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.status(201).json({ lead });
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// CONTRACTS & AI ANALYSIS
// -------------------------------------------------------------
exports.analyzeContract = async (req, res, next) => {
    try {
        const analysis = await SalesService.analyzeContract(req.body.text);
        res.json({ analysis });
    } catch (err) { next(err); }
};

exports.proposeContractUpdates = async (req, res, next) => {
    try {
        const proposal = await SalesService.proposeContractUpdates(req.body.text, req.body.updates);
        res.json({ proposal });
    } catch (err) { next(err); }
};

exports.createContractWithAI = async (req, res, next) => {
    try {
        const contract = await SalesService.createContractWithAI(req.prisma, req.company, req.body.instructions, req.body.clientId);
        res.json({ contract });
    } catch (err) { next(err); }
};

exports.downloadContractPDF = async (req, res, next) => {
    try {
        const { contractTitle, contractText, clientId } = req.body;
        if (!contractText) return res.status(400).json({ error: 'Contract text is required' });

        const clientObj = await SalesService.getClientObjForContract(req.prisma, clientId);

        const { generateContractPDF } = require('../../../platform-core/platform-engine/pdf/pdf.utils.js');
        const doc = new (require('pdfkit'))({ margin: 50 });
        const filename = `${contractTitle ? contractTitle.replace(/\s+/g, '_') : 'Contract'}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);
        generateContractPDF(doc, { contractTitle, contractText }, req.company, clientObj);
        doc.end();
    } catch (err) { next(err); }
};

exports.emailContract = async (req, res, next) => {
    try {
        const result = await SalesService.emailContract(
            req.prisma, 
            req.company, 
            req.user.id, 
            req.user.name, 
            req.body.contractTitle, 
            req.body.contractText, 
            req.body.clientId, 
            req.body.email
        );
        res.json(result);
    } catch (err) { next(err); }
};

exports.importLeads = async (req, res, next) => {
    try {
        const count = await SalesService.importLeads(req.prisma, req.body.leads, req.user.id);
        res.status(201).json({ message: `Successfully imported ${count} leads`, count });
    } catch (err) { next(err); }
};

exports.updateLead = async (req, res, next) => {
    try {
        const lead = await SalesService.updateLead(req.prisma, req.params.id, req.body);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ lead });
    } catch (err) { next(err); }
};


exports.deleteLead = async (req, res, next) => {
    try {
        await SalesService.deleteLead(req.prisma, req.params.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ message: 'Lead deleted' });
    } catch (err) { next(err); }
};

exports.convertLead = async (req, res, next) => {
    try {
        const result = await SalesService.convertLead(req.prisma, req.params.id, req.user.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ 
            message: 'Lead converted successfully', 
            ...result 
        });
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// OPPORTUNITIES
// -------------------------------------------------------------
exports.getOpportunities = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const pipelineType = req.query.pipelineType;
        const result = await SalesService.getOpportunities(req.prisma, page, limit, pipelineType);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createOpportunity = async (req, res, next) => {
    try {
        const result = await SalesService.createOpportunity(req.prisma, req.body, req.user.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.status(201).json({ opportunity: result });
    } catch (err) { next(err); }
};

exports.updateOpportunity = async (req, res, next) => {
    try {
        const result = await SalesService.updateOpportunity(req.prisma, req.params.id, req.body);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createProjectFromOpportunity = async (req, res, next) => {
    try {
        const result = await SalesService.createProjectFromOpportunity(req.prisma, req.params.id, req.user.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.status(201).json(result);
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// ACCOUNTS & CONTACTS
// -------------------------------------------------------------
exports.getAccounts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const result = await SalesService.getAccounts(req.prisma, page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createAccount = async (req, res, next) => {
    try {
        const account = await SalesService.createAccount(req.prisma, req.body, req.user.id);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'CREATE_ACCOUNT', 'account', account.id, { companyName: account.companyName }, req);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.status(201).json({ account });
    } catch (err) { next(err); }
};

exports.updateAccount = async (req, res, next) => {
    try {
        const account = await SalesService.updateAccount(req.prisma, req.params.id, req.body);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'UPDATE_ACCOUNT', 'account', account.id, { companyName: account.companyName }, req);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ account });
    } catch (err) { next(err); }
};

exports.deleteAccount = async (req, res, next) => {
    try {
        const account = await SalesService.deleteAccount(req.prisma, req.params.id);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'DELETE_ACCOUNT', 'account', account.id, { companyName: account.companyName }, req);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ message: 'Account deleted' });
    } catch (err) { next(err); }
};

exports.getContacts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const result = await SalesService.getContacts(req.prisma, page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

exports.getContact = async (req, res, next) => {
    try {
        const result = await SalesService.getContact(req.prisma, req.params.id);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createContact = async (req, res, next) => {
    try {
        const contact = await SalesService.createContact(req.prisma, req.body);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'CREATE_CONTACT', 'contact', contact.id, { name: contact.name }, req);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.status(201).json({ contact });
    } catch (err) { 
        console.error('[Sales Controller] createContact error:', err);
        if (err.status) {
            return res.status(err.status).json({ error: err.message, duplicateId: err.duplicateId });
        }
        next(err); 
    }
};

exports.updateContact = async (req, res, next) => {
    try {
        const contact = await SalesService.updateContact(req.prisma, req.params.id, req.body);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'UPDATE_CONTACT', 'contact', contact.id, { name: contact.name }, req);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ contact });
    } catch (err) { next(err); }
};

exports.deleteContact = async (req, res, next) => {
    try {
        const contact = await SalesService.deleteContact(req.prisma, req.params.id);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'DELETE_CONTACT', 'contact', contact.id, { name: contact.name }, req);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ message: 'Contact deleted' });
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// ACTIVITIES
// -------------------------------------------------------------
exports.getActivities = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const result = await SalesService.getActivities(req.prisma, page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createActivity = async (req, res, next) => {
    try {
        const result = await SalesService.createActivity(req.prisma, req.body, req.user.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.status(201).json({ activity: result });
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// AI ENHANCEMENTS (Phase 5)
// -------------------------------------------------------------
exports.generateEmailDraft = async (req, res, next) => {
    try {
        const { contextMessage } = req.body;
        const Settings = req.prisma.settings;
        const settings = await Settings.findFirst({ where: {} }) || {};

        if (!settings.aiProvider || settings.aiProvider === 'none') {
            return res.status(400).json({ error: 'AI provider not configured in settings.' });
        }

        const draft = await AIAutomationService.draftSalesEmail(contextMessage, settings);
        res.json(draft);
    } catch (err) { next(err); }
};

exports.salesChatAssistant = async (req, res, next) => {
    try {
        const { query } = req.body;
        const Settings = req.prisma.settings;
        const settings = await Settings.findFirst({ where: {} }) || {};

        if (!settings.aiProvider || settings.aiProvider === 'none') {
            return res.status(400).json({ error: 'AI provider not configured in settings.' });
        }

        // Gather quick context for the AI
        const [pipelines, leads] = await Promise.all([
            req.prisma.opportunity.findMany({ where: { stage: { not: 'ClosedLost' } }, select: { title: true, value: true, stage: true, priorityScore: true } }),
            req.prisma.lead.findMany({ where: { status: { not: 'Disqualified' } }, select: { name: true, companyName: true, leadScore: true } })
        ]);

        const contextData = { pipelines, leads };

        const reply = await AIAutomationService.salesAssistantChat(query, contextData, settings);
        res.json(reply);
    } catch (err) { next(err); }
};
exports.deleteOpportunity = async (req, res, next) => {
    try {
        const opp = await SalesService.deleteOpportunity(req.prisma, req.params.id);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'DELETE_OPPORTUNITY', 'opportunity', opp.id, { title: opp.title }, req);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ message: 'Opportunity deleted' });
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// QUOTATIONS
// -------------------------------------------------------------
exports.getQuotes = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const result = await SalesService.getQuotes(req.prisma, page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createQuote = async (req, res, next) => {
    try {
        const quote = await SalesService.createQuote(req.prisma, req.body, req.user.id, req.company.id);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'CREATE_QUOTE', 'quote', quote.id, { quoteNumber: quote.quoteNumber }, req).catch(() => {});
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.status(201).json({ quote });
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// REVENUE
// -------------------------------------------------------------
exports.getRevenueStats = async (req, res, next) => {
    try {
        const timeframe = req.query.timeframe || 'all';
        const result = await SalesService.getRevenueStats(req.prisma, timeframe);
        res.json(result);
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// QUOTATION ACTIONS (EXPANDED)
// -------------------------------------------------------------

exports.updateQuote = async (req, res, next) => {
    try {
        const quote = await SalesService.updateQuote(req.prisma, req.params.id, req.body);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'UPDATE_QUOTE', 'quote', quote.id, { quoteNumber: quote.quoteNumber }, req).catch(() => {});
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ quote });
    } catch (err) { next(err); }
};

exports.deleteQuote = async (req, res, next) => {
    try {
        const quote = await SalesService.deleteQuote(req.prisma, req.params.id);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'DELETE_QUOTE', 'quote', quote.id, { quoteNumber: quote.quoteNumber }, req).catch(() => {});
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ message: 'Quote deleted successfully' });
    } catch (err) { next(err); }
};

exports.generateQuotePDF = async (req, res, next) => {
    try {
        const quote = await SalesService.getQuoteForPdf(req.prisma, req.params.id);
        const PDFDocument = require('pdfkit');
        const { generateQuotationPDF } = require('../../../platform-core/platform-engine/pdf/pdf.utils.js');

        const doc = new PDFDocument({ margin: 50 });
        const filename = `Quote_${quote.quoteNumber}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);
        generateQuotationPDF(doc, quote, req.company);
        doc.end();
    } catch (err) { next(err); }
};

exports.sendQuoteEmail = async (req, res, next) => {
    try {
        const result = await SalesService.sendQuoteEmail(req.prisma, req.params.id, req.user, req.body.email, req.company);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'SEND_QUOTE_EMAIL', 'quote', result.quote.id, { quoteNumber: result.quote.quoteNumber, recipient: req.body.email || result.quote.clientId?.email }, req).catch(() => {});
        res.json({ message: result.message });
    } catch (err) { 
        if (err.type === 'SMTP_MISSING' || err.status === 400) {
            return res.status(400).json({ error: err.message, type: err.type });
        }
        next(err); 
    }
};

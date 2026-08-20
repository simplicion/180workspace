'use strict';

const { SalesService } = require('@workspace/crm-and-sales');
const {
    calculateRFM,
    forecastPipeline,
    scoreLead,
    calculateWinProbability,
    calculateCustomerRiskIndex,
    calculateRepProductivity
} = require('@workspace/crm-and-sales').CrmCalculationService;
const { cacheGet, cacheSet, cacheDel } = require('../../../system-configs/middleware/system/cache.js');

const clearCRMCache = async (companyId) => {
    if (!companyId) return;
    const timeframes = ['all', '7days', 'weekly', 'month', 'months'];
    for (const t of timeframes) {
        await cacheDel(`company:${companyId}:dashboard_metrics_v2:${t}`);
    }
    await cacheDel(`company:${companyId}:forecasting`);
    await cacheDel(`company:${companyId}:productivity`);
};

const AIAutomationService = require('@workspace/workspace-tools').AIAssistantService;
const { SalesRuleEngine } = require('@workspace/crm-and-sales');
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
        const { user, company } = req;
        const timeframe = req.query.timeframe || 'all';
        const cacheKey = `company:${company.id}:dashboard_metrics_v2:${timeframe}`;
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(cached);

        const result = await SalesService.getDashboardMetrics(user.id, company.id, timeframe);
        
        await cacheSet(cacheKey, result, 300);
        res.json(result);
    } catch (err) {
        console.error('[SalesController Error]', err);
        next(err);
    }
};



exports.getProductivity = async (req, res, next) => {
    try {
        const { user, company } = req;
        const cacheKey = `company:${company.id}:productivity`;
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(cached);

        const result = await SalesService.getProductivity(user.id);

        await cacheSet(cacheKey, result, 300);
        res.json(result);
    } catch (err) { next(err); }
};

exports.getRecommendations = async (req, res, next) => {
    try {
        const result = await SalesService.getRecommendations(req.user.id);
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
        
        const result = await SalesService.getLeads(page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createLead = async (req, res, next) => {
    try {
        const lead = await SalesService.createLead(req.body, req.user.id);
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
        const contract = await SalesService.createContractWithAI(req.company, req.body.instructions, req.body.clientId);
        res.json({ contract });
    } catch (err) { next(err); }
};

exports.downloadContractPDF = async (req, res, next) => {
    try {
        const { contractTitle, contractText, clientId } = req.body;
        if (!contractText) return res.status(400).json({ error: 'Contract text is required' });

        const clientObj = await SalesService.getClientObjForContract(clientId);

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
        const result = await SalesService.emailContract(req.company, 
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
        const count = await SalesService.importLeads(req.body.leads, req.user.id);
        res.status(201).json({ message: `Successfully imported ${count} leads`, count });
    } catch (err) { next(err); }
};

exports.updateLead = async (req, res, next) => {
    try {
        const lead = await SalesService.updateLead(req.params.id, req.body);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ lead });
    } catch (err) { next(err); }
};


exports.deleteLead = async (req, res, next) => {
    try {
        await SalesService.deleteLead(req.params.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ message: 'Lead deleted' });
    } catch (err) { next(err); }
};

exports.convertLead = async (req, res, next) => {
    try {
        const result = await SalesService.convertLead(req.params.id, req.user.id);
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
        const result = await SalesService.getOpportunities(page, limit, pipelineType);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createOpportunity = async (req, res, next) => {
    try {
        const result = await SalesService.createOpportunity(req.body, req.user.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.status(201).json({ opportunity: result });
    } catch (err) { next(err); }
};

exports.updateOpportunity = async (req, res, next) => {
    try {
        const result = await SalesService.updateOpportunity(req.params.id, req.body, req.company?.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createProjectFromOpportunity = async (req, res, next) => {
    try {
        const result = await SalesService.createProjectFromOpportunity(req.params.id, req.user.id);
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
        const result = await SalesService.getAccounts(page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createAccount = async (req, res, next) => {
    try {
        const account = await SalesService.createAccount(req.body, req.user.id);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'CREATE_ACCOUNT', 'account', account.id, { companyName: account.companyName }, req);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.status(201).json({ account });
    } catch (err) { next(err); }
};

exports.updateAccount = async (req, res, next) => {
    try {
        const account = await SalesService.updateAccount(req.params.id, req.body);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'UPDATE_ACCOUNT', 'account', account.id, { companyName: account.companyName }, req);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ account });
    } catch (err) { next(err); }
};

exports.deleteAccount = async (req, res, next) => {
    try {
        const account = await SalesService.deleteAccount(req.params.id);
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
        const result = await SalesService.getContacts(page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

exports.getContact = async (req, res, next) => {
    try {
        const result = await SalesService.getContact(req.params.id);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createContact = async (req, res, next) => {
    try {
        const contact = await SalesService.createContact(req.body);
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
        const contact = await SalesService.updateContact(req.params.id, req.body);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'UPDATE_CONTACT', 'contact', contact.id, { name: contact.name }, req);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ contact });
    } catch (err) { next(err); }
};

exports.deleteContact = async (req, res, next) => {
    try {
        const contact = await SalesService.deleteContact(req.params.id);
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
        const result = await SalesService.getActivities(page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createActivity = async (req, res, next) => {
    try {
        const result = await SalesService.createActivity(req.body, req.user.id);
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
        const settings = await SalesService.getSystemSettings();

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
        const settings = await SalesService.getSystemSettings();

        if (!settings.aiProvider || settings.aiProvider === 'none') {
            return res.status(400).json({ error: 'AI provider not configured in settings.' });
        }

        // Gather quick context for the AI
        const contextData = await SalesService.getSalesChatContext();

        const reply = await AIAutomationService.salesAssistantChat(query, contextData, settings);
        res.json(reply);
    } catch (err) { next(err); }
};
exports.deleteOpportunity = async (req, res, next) => {
    try {
        const opp = await SalesService.deleteOpportunity(req.params.id);
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
        const result = await SalesService.getQuotes(page, limit);
        res.json(result);
    } catch (err) { next(err); }
};

exports.createQuote = async (req, res, next) => {
    try {
        const quote = await SalesService.createQuote(req.body, req.user.id, req.company.id);
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
        const result = await SalesService.getRevenueStats(timeframe);
        res.json(result);
    } catch (err) { next(err); }
};

// -------------------------------------------------------------
// QUOTATION ACTIONS (EXPANDED)
// -------------------------------------------------------------

exports.updateQuote = async (req, res, next) => {
    try {
        const quote = await SalesService.updateQuote(req.params.id, req.body);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'UPDATE_QUOTE', 'quote', quote.id, { quoteNumber: quote.quoteNumber }, req).catch(() => {});
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ quote });
    } catch (err) { next(err); }
};

exports.deleteQuote = async (req, res, next) => {
    try {
        const quote = await SalesService.deleteQuote(req.params.id);
        const { logAction } = require('../../../system-configs/middleware/audit/audit.js');
        await logAction(req.user.id, 'DELETE_QUOTE', 'quote', quote.id, { quoteNumber: quote.quoteNumber }, req).catch(() => {});
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        if (req.company && req.company.id) await clearCRMCache(req.company.id);
        res.json({ message: 'Quote deleted successfully' });
    } catch (err) { next(err); }
};

exports.generateQuotePDF = async (req, res, next) => {
    try {
        const quote = await SalesService.getQuoteForPdf(req.params.id);
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
        const result = await SalesService.sendQuoteEmail(req.params.id, req.user, req.body.email, req.company);
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




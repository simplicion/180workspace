'use strict';

const express = require('express');
const router = express.Router();
const salesController = require('./sales.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireAccess } = require('../../../system-configs/middleware/auth/rbac.js');
const tenantDbMiddleware = require('../../../system-configs/middleware/tenant/tenant-db.js');

// All sales routes require tenantDb and auth
router.use(protect);
router.use(tenantDbMiddleware);

// Granular access check based on HTTP method
router.use((req, res, next) => {
    if (req.method === 'GET') {
        return requireAccess('sales', 'read')(req, res, next);
    } else {
        return requireAccess('sales', 'write')(req, res, next);
    }
});

// Dashboard & Metrics
router.get('/dashboard', salesController.getDashboardMetrics);
router.get('/metrics', salesController.getDashboardMetrics);
router.get('/recommendations', salesController.getRecommendations);
router.get('/forecasting', salesController.getForecasting);
router.get('/productivity', salesController.getProductivity);

// Leads
router.route('/leads')
    .get(salesController.getLeads)
    .post(salesController.createLead);

router.post('/leads/import', salesController.importLeads);

router.route('/leads/:id')
    .put(salesController.updateLead)
    .delete(salesController.deleteLead);

router.post('/leads/:id/convert', salesController.convertLead);

// Opportunities
router.route('/opportunities')
    .get(salesController.getOpportunities)
    .post(salesController.createOpportunity);

router.route('/opportunities/:id')
    .put(salesController.updateOpportunity)
    .delete(salesController.deleteOpportunity);

router.post('/opportunities/:id/convert', salesController.createProjectFromOpportunity);

// Accounts & Contacts
router.route('/accounts')
    .get(salesController.getAccounts)
    .post(salesController.createAccount);

router.route('/accounts/:id')
    .put(salesController.updateAccount)
    .delete(salesController.deleteAccount);
router.route('/contacts')
    .get(salesController.getContacts)
    .post(salesController.createContact);

router.route('/contacts/:id')
    .get(salesController.getContact)
    .put(salesController.updateContact)
    .delete(salesController.deleteContact);

// Activities
router.route('/activities')
    .get(salesController.getActivities)
    .post(salesController.createActivity);

// Contracts / AI Analysis
router.post('/contracts/analyze', salesController.analyzeContract);
router.post('/contracts/propose-updates', salesController.proposeContractUpdates);
router.post('/contracts/create', salesController.createContractWithAI);
router.post('/contracts/pdf', salesController.downloadContractPDF);
router.post('/contracts/send-pdf', salesController.emailContract);

// Quotations
router.route('/quotes')
    .get(salesController.getQuotes)
    .post(salesController.createQuote);

router.route('/quotes/:id')
    .put(salesController.updateQuote)
    .delete(salesController.deleteQuote);

router.get('/quotes/:id/pdf', salesController.generateQuotePDF);
router.post('/quotes/:id/send-email', salesController.sendQuoteEmail);

// Revenue
router.get('/revenue', salesController.getRevenueStats);

// AI Enhancements
router.post('/ai/email-draft', salesController.generateEmailDraft);
router.post('/ai/chat', salesController.salesChatAssistant);

module.exports = router;

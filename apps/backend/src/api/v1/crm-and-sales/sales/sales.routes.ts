import { Router } from 'express';
import * as ctrl from './sales.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';

const router = Router();

router.use(protect);

router.get('/dashboard', ctrl.getDashboardMetrics);
router.get('/productivity', ctrl.getProductivity);
router.get('/recommendations', ctrl.getRecommendations);
router.get('/activity', ctrl.getSalesActivity);


router.get('/leads', ctrl.getLeads);
router.post('/leads', ctrl.createLead);
router.put('/leads/:id', ctrl.updateLead);
router.delete('/leads/:id', ctrl.deleteLead);
router.post('/leads/:id/convert', ctrl.convertLead);
router.post('/leads/import', ctrl.importLeads);

router.post('/contracts/analyze', ctrl.analyzeContract);
router.post('/contracts/propose', ctrl.proposeContractUpdates);
router.post('/contracts/ai-create', ctrl.createContractWithAI);
router.post('/contracts/download-pdf', ctrl.downloadContractPDF);
router.post('/contracts/email', ctrl.emailContract);

router.get('/opportunities', ctrl.getOpportunities);
router.post('/opportunities', ctrl.createOpportunity);
router.put('/opportunities/:id', ctrl.updateOpportunity);
router.delete('/opportunities/:id', ctrl.deleteOpportunity);
router.post('/opportunities/:id/create-project', ctrl.createProjectFromOpportunity);

router.get('/accounts', ctrl.getAccounts);
router.post('/accounts', ctrl.createAccount);
router.put('/accounts/:id', ctrl.updateAccount);
router.delete('/accounts/:id', ctrl.deleteAccount);

router.get('/contacts', ctrl.getContacts);
router.get('/contacts/:id', ctrl.getContact);
router.post('/contacts', ctrl.createContact);
router.put('/contacts/:id', ctrl.updateContact);
router.delete('/contacts/:id', ctrl.deleteContact);

router.get('/activities', ctrl.getActivities);
router.post('/activities', ctrl.createActivity);

router.post('/ai/email-draft', ctrl.generateEmailDraft);
router.post('/ai/chat', ctrl.salesChatAssistant);

router.get('/quotes', ctrl.getQuotes);
router.post('/quotes', ctrl.createQuote);
router.put('/quotes/:id', ctrl.updateQuote);
router.delete('/quotes/:id', ctrl.deleteQuote);
router.get('/quotes/:id/pdf', ctrl.generateQuotePDF);
router.post('/quotes/:id/email', ctrl.sendQuoteEmail);

router.get('/revenue', ctrl.getRevenueStats);

router.get('/deals', ctrl.getDeals);
router.put('/deals/:id', ctrl.updateDeal);
router.delete('/deals/:id', ctrl.deleteDeal);
router.post('/deals/import', ctrl.importDeals);

export default router;

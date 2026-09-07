import { Router } from 'express';
import { VoiceforceController } from './voiceforce.controller';
import { VoiceforceWebhooksController } from './webhooks.controller';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB per file chunk
});

const router: Router = Router();

// Metrics
router.get('/metrics', VoiceforceController.getMetrics);

// Agents
router.get('/agents', VoiceforceController.listAgents);
router.get('/agents/:id', VoiceforceController.getAgentDetails);
router.post('/agents', VoiceforceController.createAgent);
router.put('/agents/:id', VoiceforceController.updateAgent);
router.delete('/agents/:id', VoiceforceController.deleteAgent);
router.post('/agents/:id/train/natural-language', VoiceforceController.parseNaturalLanguageTraining);
router.post('/agents/:id/train/apply', VoiceforceController.applyNaturalLanguageTraining);
router.get('/agents/:id/versions', VoiceforceController.listAgentVersions);
router.post('/agents/:id/versions/:versionNumber/rollback', VoiceforceController.rollbackAgentVersion);
router.get('/agents/:id/guardrails', VoiceforceController.getAgentGuardrails);
router.put('/agents/:id/guardrails', VoiceforceController.updateAgentGuardrails);
router.post('/agents/:id/briefing/generate', VoiceforceController.generateAgentBriefing);

// Cartesia Neural Voice Studio & Persona Customization
router.get('/voices', VoiceforceController.listCartesiaVoices);
router.post('/voices/preview', VoiceforceController.previewCartesiaVoice);
router.post('/voices/clone', VoiceforceController.cloneCartesiaVoice);
router.post('/stt/transcribe', VoiceforceController.transcribeCartesiaAudio);
router.get('/engine/specs', VoiceforceController.getCartesiaEngineSpecs);


// Pre-Flight Sandbox Simulator
router.get('/simulate/scenarios', VoiceforceController.listSimulationScenarios);
router.post('/simulate/start', VoiceforceController.startSimulation);

// Zero-Repeat Warm Human Escalation
router.get('/handoff/live-context/:callSessionId', VoiceforceController.getLiveHandoffContext);
router.post('/handoff/trigger', VoiceforceController.triggerWarmHandoff);

// Executive ROI & Analytics
router.get('/analytics/roi', VoiceforceController.getRoiAnalytics);

// Daily Executive Briefings
router.get('/briefings/latest', VoiceforceController.getLatestDailyBriefing);
router.post('/briefings/generate', VoiceforceController.generateDailyBriefing);

// Prebuilt Industry Templates
router.get('/templates', VoiceforceController.listTemplates);
router.post('/templates/:slug/instantiate', VoiceforceController.instantiateTemplate);

// Numbers
router.get('/numbers', VoiceforceController.listNumbers);
router.get('/numbers/search', VoiceforceController.searchAvailableNumbers);
router.post('/numbers/purchase', VoiceforceController.purchaseNumber);
router.put('/numbers/:id', VoiceforceController.updateNumber);
router.delete('/numbers/:id', VoiceforceController.releaseNumber);
router.post('/numbers/verify-request', VoiceforceController.requestCallerIdVerification);
router.post('/numbers/verify-otp', VoiceforceController.verifyCallerIdOtp);

// Call Forwarding & Routing Rules
router.get('/forwarding', VoiceforceController.listForwardingRules);
router.post('/forwarding', VoiceforceController.createForwardingRule);
router.get('/forwarding/:id', VoiceforceController.getForwardingRule);
router.put('/forwarding/:id', VoiceforceController.updateForwardingRule);
router.delete('/forwarding/:id', VoiceforceController.deleteForwardingRule);
router.post('/forwarding/:id/simulate', VoiceforceController.simulateForwardingRule);

// Active Call Hold Queues
router.get('/queues', VoiceforceController.listQueues);
router.post('/queues', VoiceforceController.createQueue);
router.put('/queues/:id', VoiceforceController.updateQueue);
router.delete('/queues/:id', VoiceforceController.deleteQueue);
router.get('/queues/:id/waiting', VoiceforceController.listQueueWaitingCallers);
router.post('/queues/:id/dequeue-takeover', VoiceforceController.dequeueTakeover);
router.post('/queues/:id/simulate', VoiceforceController.simulateQueueCaller);

// Calls & Campaigns
router.get('/campaigns', VoiceforceController.listCampaigns);
router.get('/campaigns/:id', VoiceforceController.getCampaignDetails);
router.post('/campaigns', VoiceforceController.createCampaign);
router.post('/campaigns/:id/launch', VoiceforceController.launchCampaign);
router.post('/campaigns/:id/pause', VoiceforceController.pauseCampaign);
router.post('/campaigns/:id/resume', VoiceforceController.resumeCampaign);
router.post('/campaigns/:id/stop', VoiceforceController.stopCampaign);

// Dynamic Telephony Rate Estimation
router.get('/rates/estimate', VoiceforceController.getRateEstimate);

// Calls
router.get('/calls', VoiceforceController.listCalls);
router.get('/calls/:id', VoiceforceController.getCallDetails);
router.get('/calls/:id/audit-trail', VoiceforceController.getCallAuditTrail);
router.delete('/calls/:id', VoiceforceController.deleteCall);
router.post('/calls/dispatch-single', VoiceforceController.launchSingleCall);

// Do-Not-Call (DNC) Compliance Registry
router.get('/dnc', VoiceforceController.listDnc);
router.post('/dnc', VoiceforceController.addDnc);
router.delete('/dnc/:id', VoiceforceController.removeDnc);

// Browser Softphone WebRTC Tester (₹0 Telecom Cost)
router.post('/tokens/generate', VoiceforceController.generateSoftphoneToken);
router.post('/softphone/exchange', VoiceforceController.processSoftphoneTurn);
router.post('/softphone/exchange-stream', VoiceforceController.processSoftphoneTurnStream);
router.post('/sessions/:id/turn', VoiceforceController.processSoftphoneTurn);
router.post('/sessions/:id/end', VoiceforceController.endSoftphoneCall);

// Voice Wallet & Billing
router.get('/wallet', VoiceforceController.getWallet);
router.post('/wallet/order', VoiceforceController.createWalletOrder);
router.post('/wallet/verify', VoiceforceController.verifyWalletPayment);
router.post('/wallet/recharge', VoiceforceController.rechargeWallet);
router.put('/wallet/auto-recharge', VoiceforceController.updateAutoRecharge);
router.post('/webhooks/razorpay', VoiceforceController.handleRazorpayWebhook);

// Universal Enterprise Business Brain & Dedicated RAG Knowledge Pipeline
router.post('/knowledge/upload', upload.single('file'), VoiceforceController.uploadKnowledgeDocument);
router.get('/knowledge/documents', VoiceforceController.listKnowledgeDocuments);
router.delete('/knowledge/documents/:id', VoiceforceController.deleteKnowledgeDocument);
router.post('/knowledge/query', VoiceforceController.queryKnowledgeBase);
router.put('/agents/:id/vaults', VoiceforceController.linkAgentVaults);
router.get('/agents/:id/vaults', VoiceforceController.getAgentLinkedVaults);

// Superadmin Voice Platform Operations
router.get('/superadmin/overview', VoiceforceController.getSuperadminOverview);
router.post('/superadmin/killswitch', VoiceforceController.superadminKillswitch);

export default router;

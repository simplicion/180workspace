import { Router } from 'express';
import { VoiceforceController } from './voiceforce.controller';
import { VoiceforceWebhooksController } from './webhooks.controller';

const router: Router = Router();

// Metrics
router.get('/metrics', VoiceforceController.getMetrics);

// Agents
router.get('/agents', VoiceforceController.listAgents);
router.post('/agents', VoiceforceController.createAgent);
router.put('/agents/:id', VoiceforceController.updateAgent);
router.delete('/agents/:id', VoiceforceController.deleteAgent);

// Numbers
router.get('/numbers', VoiceforceController.listNumbers);
router.get('/numbers/search', VoiceforceController.searchAvailableNumbers);
router.post('/numbers/purchase', VoiceforceController.purchaseNumber);
router.post('/numbers/verify-request', VoiceforceController.requestCallerIdVerification);
router.post('/numbers/verify-otp', VoiceforceController.verifyCallerIdOtp);

// Calls & Campaigns
router.get('/campaigns', VoiceforceController.listCampaigns);
router.post('/campaigns', VoiceforceController.createCampaign);
router.post('/campaigns/:id/launch', VoiceforceController.launchCampaign);
router.post('/campaigns/:id/pause', VoiceforceController.pauseCampaign);
router.post('/campaigns/:id/resume', VoiceforceController.resumeCampaign);
router.post('/campaigns/:id/stop', VoiceforceController.stopCampaign);

// Calls
router.get('/calls', VoiceforceController.listCalls);
router.get('/calls/:id', VoiceforceController.getCallDetails);
router.delete('/calls/:id', VoiceforceController.deleteCall);
router.post('/calls/dispatch-single', VoiceforceController.launchSingleCall);

// Do-Not-Call (DNC) Compliance Registry
router.get('/dnc', VoiceforceController.listDnc);
router.post('/dnc', VoiceforceController.addDnc);
router.delete('/dnc/:id', VoiceforceController.removeDnc);

// Browser Softphone WebRTC Tester (₹0 Telecom Cost)
router.post('/tokens/generate', VoiceforceController.generateSoftphoneToken);
router.post('/sessions/:id/turn', VoiceforceController.processSoftphoneTurn);
router.post('/sessions/:id/end', VoiceforceController.endSoftphoneCall);

// Voice Wallet & Billing
router.get('/wallet', VoiceforceController.getWallet);
router.post('/wallet/recharge', VoiceforceController.rechargeWallet);

// Superadmin Voice Platform Operations
router.get('/superadmin/overview', VoiceforceController.getSuperadminOverview);
router.post('/superadmin/killswitch', VoiceforceController.superadminKillswitch);

export default router;

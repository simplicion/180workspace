import { Router } from 'express';
import { AIController } from './ai.controller';
import { protect } from '../../../system-configs/middleware/auth/auth';
import multer from 'multer';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

const router = Router();

// Status & Key Testing
router.get('/status', protect, AIController.getStatus);
router.post('/test-connection', protect, AIController.testConnection);

// Chat & Sessions
router.get('/sessions', protect, AIController.getChatSessions);
router.get('/sessions/:id', protect, AIController.getChatSession);
router.delete('/sessions/:id', protect, AIController.deleteChatSession);
router.post('/chat', protect, AIController.chat);
router.post('/ask', protect, AIController.chat); // Legacy alias
router.post('/agent/execute', protect, AIController.executeAgent);

// Entity Mention Autocomplete Search
router.get('/search-entities', protect, AIController.searchEntities);

// Document, Website & Form Intelligence
router.post('/upload', protect, upload.single('file'), AIController.uploadDocument);
router.post('/documents/generate', protect, AIController.generateDocument);
router.post('/documents/chat-file', protect, AIController.analyzeDocument);
router.post('/analyze-document', protect, AIController.analyzeDocument); // Legacy alias
router.post('/websites/generate', protect, AIController.generateWebsite);
router.post('/websites/patch', protect, AIController.patchWebsite);
router.post('/forms/generate', protect, AIController.generateForm);
router.post('/forms/patch', protect, AIController.patchForm);

// Analytics & Insights
router.get('/analytics/dashboard', protect, AIController.getDashboardInsights);
router.get('/dashboard', protect, AIController.getDashboardInsights); // Legacy alias
router.get('/insights', protect, AIController.getDashboardInsights); // Legacy alias
router.get('/projects/:id/insights', protect, AIController.getProjectInsights);

// Content Calendar Generator
router.post('/content/calendar', protect, AIController.generateContentCalendar);

// CRM & Communications
router.post('/crm/email-draft', protect, AIController.generateEmailDraft);
router.post('/generate-email-draft', protect, AIController.generateEmailDraft); // Legacy alias
router.post('/meetings/process', protect, upload.single('file'), AIController.processMeetingTranscript);
router.post('/meeting-summary', protect, upload.single('file'), AIController.processMeetingTranscript); // Legacy alias

// Automation & Business Operations
router.post('/automation/classify', protect, AIController.classifyDocument);
router.post('/automation/task-priority', protect, AIController.detectTaskPriority);
router.post('/automation/project-risk', protect, AIController.predictProjectRisk);
router.post('/automation/sales-chat', protect, AIController.salesAssistantChat);
router.post('/automation/forecast', protect, AIController.generateAdvancedForecast);

export default router;

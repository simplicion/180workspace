import { Router } from 'express';
import * as ctrl from './ai.controller';
import { requireManager } from '../../../../system-configs/middleware/auth/rbac';
import multer from 'multer';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

const router = Router();

router.get('/dashboard', requireManager, ctrl.getDashboardInsights);
router.get('/insights', requireManager, ctrl.getDashboardInsights);
router.get('/projects/:id/insights', ctrl.getProjectInsights);

// Chat sessions
router.get('/sessions', ctrl.getChatSessions);
router.get('/sessions/:id', ctrl.getChatSession);
router.delete('/sessions/:id', ctrl.deleteChatSession);
router.post('/chat', ctrl.chatWithAI);

// Phase 2: Document Upload & Mentions Search
router.post('/upload', upload.single('file'), ctrl.uploadDocument);
router.post('/meeting-summary', upload.single('file'), ctrl.processMeetingTranscript);
router.get('/search-entities', ctrl.searchEntities);

router.post('/analyze-document', ctrl.analyzeDocument);
router.post('/generate-email-draft', ctrl.generateEmailDraft);

export default router;

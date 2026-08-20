'use strict';

const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireManager } = require('../../../system-configs/middleware/auth/rbac.js');
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

router.get('/dashboard', protect, requireManager, aiController.getDashboardInsights);
router.get('/insights', protect, requireManager, aiController.getDashboardInsights);
router.get('/projects/:id/insights', protect, aiController.getProjectInsights);

// Chat sessions
router.get('/sessions', protect, aiController.getChatSessions);
router.get('/sessions/:id', protect, aiController.getChatSession);
router.delete('/sessions/:id', protect, aiController.deleteChatSession);
router.post('/chat', protect, aiController.chatWithAI);

// Phase 2: Document Upload & Mentions Search
router.post('/upload', protect, upload.single('file'), aiController.uploadDocument);
router.post('/meeting-summary', protect, upload.single('file'), aiController.processMeetingTranscript);
router.get('/search-entities', protect, aiController.searchEntities);

router.post('/analyze-document', protect, aiController.analyzeDocument);
router.post('/generate-email-draft', protect, aiController.generateEmailDraft);

module.exports = router;

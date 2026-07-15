'use strict';

const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireManager } = require('../../../system-configs/middleware/auth/rbac.js');

router.get('/dashboard', protect, requireManager, aiController.getDashboardInsights);
router.get('/insights', protect, requireManager, aiController.getDashboardInsights);
router.get('/projects/:id/insights', protect, aiController.getProjectInsights);

// Chat sessions
router.get('/sessions', protect, aiController.getChatSessions);
router.get('/sessions/:id', protect, aiController.getChatSession);
router.delete('/sessions/:id', protect, aiController.deleteChatSession);
router.post('/chat', protect, aiController.chatWithAI);

router.post('/analyze-document', protect, aiController.analyzeDocument);
router.post('/generate-email-draft', protect, aiController.generateEmailDraft);

module.exports = router;

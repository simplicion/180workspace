'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const ctrl = require('../controllers/apikey.controller');

// Authenticated routes (user manages their own API key)
router.get('/status', protect, ctrl.getApiKeyStatus);
router.post('/generate', protect, ctrl.generateApiKey);
router.delete('/revoke', protect, ctrl.revokeApiKey);

// Public route â€” secured by API key in query string
router.get('/public/profile', ctrl.publicProfile);

module.exports = router;

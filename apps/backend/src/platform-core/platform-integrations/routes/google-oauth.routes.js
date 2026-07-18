'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/google-oauth.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');

router.get('/auth', protect, ctrl.getAuthUrl);
router.post('/callback', protect, ctrl.handleCallback);
router.get('/folders', protect, ctrl.getFolders);
router.get('/files', protect, ctrl.getFiles);
router.post('/folders', protect, ctrl.createFolder);
router.post('/disconnect', protect, ctrl.disconnect);

module.exports = router;

'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireAdmin } = require('../../../system-configs/middleware/auth/rbac.js');
const { upload, handleUpload } = require('../../../system-configs/middleware/system/upload.js');
const brandingController = require('../controllers/branding.controller');

/**
 * @route POST /api/branding/logo
 * @desc Upload company/workspace logo to system storage
 * @access Protected (Admin only)
 */
router.post('/logo', 
    protect, 
    requireAdmin, 
    upload.single('file'), 
    handleUpload('logos', { isLogo: true, forceR2: true }), 
    brandingController.uploadLogo
);

module.exports = router;

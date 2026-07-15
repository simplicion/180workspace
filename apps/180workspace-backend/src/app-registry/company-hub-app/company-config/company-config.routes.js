'use strict';

const express = require('express');
const router = express.Router();
const companyConfigController = require('./company-config.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireAdmin } = require('../../../system-configs/middleware/auth/rbac.js');

router.get('/', protect, companyConfigController.getCompanyConfig);
router.put('/', protect, requireAdmin, companyConfigController.updateCompanyConfig);
router.patch('/apps', protect, requireAdmin, companyConfigController.updateEnabledApps);
router.patch('/modules', protect, requireAdmin, companyConfigController.updateEnabledModules);

module.exports = router;

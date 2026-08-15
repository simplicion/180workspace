'use strict';
const express = require('express');
const router = express.Router();
const vendorController = require('./vendor.controller');
const { protect, authorize } = require('../../../system-configs/middleware/auth/auth.js');

// All vendor routes require authentication and admin/finance role
router.use(protect);
router.use(authorize('admin', 'manager', 'finance'));

// Vendors
router.get('/', vendorController.getVendors);
router.post('/', vendorController.createVendor);
router.put('/:id', vendorController.updateVendor);



module.exports = router;

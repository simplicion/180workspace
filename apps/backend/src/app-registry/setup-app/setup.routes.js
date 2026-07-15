'use strict';

const express = require('express');
const router = express.Router();
const setupController = require('./setup.controller');
const { upload } = require('../../system-configs/middleware/system/upload.js');

// @route   GET /api/setup/status
// @desc    Check if database is configured (Legacy/Global fallback)
// @access  Public
router.get('/status', setupController.getSetupStatus);

// @route   POST /api/setup/register-tenant
// @desc    Register a new company admin and company name into the System DB
// @access  Public
router.post('/register-tenant', upload.single('logo'), setupController.registerTenant);

// @route   POST /api/setup/register-tenant-google
// @desc    Register a new company admin via Google OAuth into the System DB
// @access  Public
router.post('/register-tenant-google', upload.single('logo'), setupController.registerTenantGoogle);

// @route   POST /api/setup/configure-tenant
// @desc    Configure database credentials for a specific tenant token and seed it
// @access  Public
router.post('/configure-tenant', setupController.configureTenant);

// Legacy configuration route (kept for rollback safety or global scripts)
router.post('/database', setupController.configureDatabase);

module.exports = router;

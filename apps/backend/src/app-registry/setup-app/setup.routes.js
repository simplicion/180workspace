'use strict';

const express = require('express');
const router = express.Router();
const setupController = require('./setup.controller');
const { upload } = require('../../system-configs/middleware/system/upload.js');

// @route   GET /api/setup/status
// @desc    Check if database is configured (Legacy/Global fallback)
// @access  Public
router.get('/status', setupController.getSetupStatus);

// @route   POST /api/setup/register-company
// @desc    Register a new company admin and company name into the System DB
// @access  Public
router.post('/register-company', upload.single('logo'), setupController.registerCompany);

// @route   POST /api/setup/register-company-google
// @desc    Register a new company admin via Google OAuth into the System DB
// @access  Public
router.post('/register-company-google', upload.single('logo'), setupController.registerCompanyGoogle);

// @route   POST /api/setup/configure-company
// @desc    Configure database credentials for a specific company token and seed it
// @access  Public
router.post('/configure-company', setupController.configureCompany);

// Legacy configuration route (kept for rollback safety or global scripts)
router.post('/database', setupController.configureDatabase);

module.exports = router;

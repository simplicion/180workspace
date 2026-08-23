import express from 'express';
import { SetupController } from './setup.controller';
import { upload } from '../../../../system-configs/middleware/system/central-upload';

const router = express.Router();

// @route   GET /api/v1/identity/setup/status
// @desc    Check if database is configured (Legacy/Global fallback)
// @access  Public
router.get('/status', SetupController.getSetupStatus);

// @route   POST /api/v1/identity/setup/register-company
// @desc    Register a new company admin and company name into the System DB
// @access  Public
router.post('/register-company', upload.single('logo'), SetupController.registerCompany);

// @route   POST /api/v1/identity/setup/register-company-google
// @desc    Register a new company admin via Google OAuth into the System DB
// @access  Public
router.post('/register-company-google', upload.single('logo'), SetupController.registerCompanyGoogle);

// @route   POST /api/v1/identity/setup/configure-company
// @desc    Configure database credentials for a specific company token and seed it
// @access  Public
router.post('/configure-company', SetupController.configureCompany);

// Legacy configuration route (kept for rollback safety or global scripts)
router.post('/database', SetupController.configureDatabase);

export default router;

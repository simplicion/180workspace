const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const migrationController = require('../../../platform-core/platform-engine/controllers/migration.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');

router.get('/', settingsController.getSettings); // Public or authenticated to read
router.put('/', protect, settingsController.updateSettings); // Admin only to update
router.post('/test-email', protect, settingsController.testEmailConnection); // Admin only to test
router.post('/test-ai', protect, settingsController.testAiConnection); // Admin only to test
router.post('/test-storage', protect, settingsController.testStorageConnection); // Admin only to test
router.post('/test-db', protect, settingsController.testDatabaseConnection); // Admin only to test
router.post('/clear-data', protect, settingsController.clearDatabase); // Admin only to bulk delete data

// Migration Routes
router.post('/migrate-db', protect, migrationController.startMigration);
router.get('/migration-status', protect, migrationController.getMigrationStatus);

module.exports = router;

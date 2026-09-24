import express from 'express';
import { ConfigsController } from './configs.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { ConfigsValidation } from './configs.validation';
import featureFlagGuard from '../../../../system-configs/middleware/billing/featureFlagGuard';
// Import migrationController, assuming we will migrate it later, for now we will keep the reference
// const migrationController = require('../../../../platform-core/platform-engine/controllers/migration.controller');

const router = express.Router();

router.get('/', ConfigsController.getSettings); 
router.put('/', protect, validateRequest(ConfigsValidation.updateSettings), ConfigsController.updateSettings); 
router.post('/test-email', protect, featureFlagGuard('hasEmailServices'), ConfigsController.testEmailConnection); 
router.post('/test-ai', protect, featureFlagGuard('hasAIAssistant'), ConfigsController.testAiConnection); 
router.post('/test-db', protect, ConfigsController.testDatabaseConnection); 
router.post('/clear-data', protect, ConfigsController.clearDatabase); 

// Migration Routes (temporarily commented out until platform-engine is migrated)
// router.post('/migrate-db', protect, migrationController.startMigration);
// router.get('/migration-status', protect, migrationController.getMigrationStatus);

export const configsRoutes = router;

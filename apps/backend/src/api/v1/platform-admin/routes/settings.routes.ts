import { Router } from 'express';
import { get, update, toggleMaintenance, testDbConnection, testEmailConnection } from '../controllers/settings.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { updateSettingsSchema, testEmailSchema } from '../validation/settings.validation';

const router = Router();

router.get('/', get);
router.put('/', validateRequest(updateSettingsSchema), update);
router.post('/toggle-maintenance', toggleMaintenance);
router.post('/test-db', testDbConnection);
router.post('/test-email', validateRequest(testEmailSchema), testEmailConnection);

export default router;

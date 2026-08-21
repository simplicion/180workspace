import { Router } from 'express';
import { getConfig, updateConfig, testConnection } from '../controllers/payment.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { updatePaymentConfigSchema } from '../validation/payment.validation';

const router = Router();

router.get('/config', getConfig);
router.put('/config', validateRequest(updatePaymentConfigSchema), updateConfig);
router.post('/test', testConnection);

export default router;

import { Router } from 'express';
import { list, cancel, forceRenew, refund, getHistoryByCompany } from '../controllers/subscription.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { listSubscriptionsSchema, cancelSubscriptionSchema } from '../validation/subscription.validation';

const router = Router();

router.get('/', validateRequest(listSubscriptionsSchema), list);
router.get('/company/:id', getHistoryByCompany);
router.put('/:id/cancel', validateRequest(cancelSubscriptionSchema), cancel);
router.put('/:id/renew', forceRenew);
router.post('/:id/refund', refund);

export default router;

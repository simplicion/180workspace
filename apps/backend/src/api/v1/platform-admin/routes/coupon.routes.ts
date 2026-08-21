import { Router } from 'express';
import { list, create, update, toggle, remove, validate } from '../controllers/coupon.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { createCouponSchema, updateCouponSchema } from '../validation/coupon.validation';

const router = Router();

router.get('/', list);
router.post('/', validateRequest(createCouponSchema), create);
router.put('/:id', validateRequest(updateCouponSchema), update);
router.put('/:id/toggle', toggle);
router.delete('/:id', remove);
router.get('/validate/:code', validate);

export default router;

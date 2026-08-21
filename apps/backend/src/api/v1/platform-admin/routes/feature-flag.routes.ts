import { Router } from 'express';
import { list, create, toggle, remove } from '../controllers/feature-flag.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { createFeatureFlagSchema } from '../validation/feature-flag.validation';

const router = Router();

router.get('/', list);
router.post('/', validateRequest(createFeatureFlagSchema), create);
router.put('/:id/toggle', toggle);
router.delete('/:id', remove);

export default router;

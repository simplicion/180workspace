import { Router } from 'express';
import { list, suspend, deleteUser } from '../controllers/user.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { listUsersSchema } from '../validation/user.validation';

const router = Router();

router.get('/', validateRequest(listUsersSchema), list);
router.put('/:id/suspend', suspend);
router.delete('/:id', deleteUser);

export default router;

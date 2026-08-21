import { Router } from 'express';
import * as ctrl from './calendar.controller';
import { requireAdmin } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

router.get('/', ctrl.getEvents);
router.post('/', requireAdmin, ctrl.createEvent);
router.put('/:id', ctrl.updateEvent);
router.post('/:id/resend-invite', ctrl.resendInvite);
router.delete('/:id', ctrl.deleteEvent);

export default router;

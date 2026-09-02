import { Router } from 'express';
import * as ctrl from './client.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requirePermission } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

router.use(protect);

router.get('/', ctrl.getClients);
router.get('/categories', ctrl.getClientCategories);
router.post('/', requirePermission('can_manage_clients', 'admin'), ctrl.createClient);
router.get('/:id', ctrl.getClientById);
router.put('/:id', requirePermission('can_manage_clients', 'admin'), ctrl.updateClient);
router.delete('/:id', requirePermission('can_manage_clients', 'admin'), ctrl.deleteClient);

router.get('/:id/communications', ctrl.getCommunications);
router.post('/:id/communications', ctrl.createCommunication);
router.delete('/:id/communications/:commId', ctrl.deleteCommunication);

router.get('/:id/activity', ctrl.getActivity);

export default router;

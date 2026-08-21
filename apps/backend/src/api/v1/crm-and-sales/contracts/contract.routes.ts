import { Router } from 'express';
import * as ctrl from './contract.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';

const router = Router();

router.use(protect);

router.post('/', ctrl.createContract);
router.get('/', ctrl.getContracts);
router.get('/:id', ctrl.getContract);
router.put('/:id', ctrl.updateContract);
router.delete('/:id', ctrl.deleteContract);
router.post('/:id/share', ctrl.generateShareLink);

export default router;

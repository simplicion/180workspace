import { Router } from 'express';
import * as ctrl from './contract.controller';

const router = Router();

router.get('/:token', ctrl.getContractByToken);
router.post('/:token/sign', ctrl.signContract);

export default router;

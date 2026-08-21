import { Router } from 'express';
import * as moduleController from './module.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';

const router = Router();

router.use(protect);

router.post('/', moduleController.createModule);
router.get('/project/:projectId', moduleController.getModulesByProject);
router.put('/:id', moduleController.updateModule);
router.delete('/:id', moduleController.deleteModule);

export default router;

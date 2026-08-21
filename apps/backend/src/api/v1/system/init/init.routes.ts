import { Router } from 'express';
import { getInit, getBootstrap } from './init.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';

const router = Router();

router.get('/', protect, getInit);
router.get('/bootstrap', protect, getBootstrap);

export default router;

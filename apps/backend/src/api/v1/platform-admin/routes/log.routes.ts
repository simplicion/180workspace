import { Router } from 'express';
import { activityLogs, failedLogins } from '../controllers/log.controller';

const router = Router();

router.get('/activity', activityLogs);
router.get('/errors', failedLogins);

export default router;

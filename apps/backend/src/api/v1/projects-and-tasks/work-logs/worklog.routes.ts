import { Router } from 'express';
import * as workLogController from './worklog.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';

const router = Router();

router.use(protect);

router.post('/', workLogController.submitWorkLog);
router.get('/', workLogController.getLogs);
router.get('/my', workLogController.getMyLogs);
router.get('/all', workLogController.getAllLogs);
router.get('/reviews', workLogController.getPendingReviews);
router.get('/stats', workLogController.getDashboardStats);
router.patch('/:id/review', workLogController.reviewWorkLog);

export default router;

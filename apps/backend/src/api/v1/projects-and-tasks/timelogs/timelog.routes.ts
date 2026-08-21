import { Router } from 'express';
import * as ctrl from './timelog.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';

const router = Router();

// GET /api/timelogs - list timelogs
router.get('/', protect, ctrl.getTimeLogs);

// POST /api/timelogs/start - start timer
router.post('/start', protect, ctrl.startTimer);

// POST /api/timelogs/stop - stop running timer
router.post('/stop', protect, ctrl.stopTimer);

// POST /api/timelogs - manual log entry
router.post('/', protect, ctrl.createEntry);

// DELETE /api/timelogs/:id
router.delete('/:id', protect, ctrl.deleteTimeLog);

export default router;

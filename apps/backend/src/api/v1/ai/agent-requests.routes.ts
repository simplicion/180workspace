import { Router } from 'express';
import { AgentRequestsController } from './agent-requests.controller';
import { protect } from '../../../system-configs/middleware/auth/auth';

const router = Router();

// List all agent requests
router.get('/', protect, AgentRequestsController.getRequests);

// Create an agent request
router.post('/', protect, AgentRequestsController.createRequest);

// Single request detail
router.get('/:id', protect, AgentRequestsController.getRequestById);

// 1-Click approval & calendar sync
router.post('/:id/approve', protect, AgentRequestsController.approveRequest);

// Reschedule slot & calendar update
router.post('/:id/reschedule', protect, AgentRequestsController.rescheduleRequest);

// Reject / Dismiss request
router.post('/:id/reject', protect, AgentRequestsController.rejectRequest);

export default router;

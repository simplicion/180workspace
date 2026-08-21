import { Router } from 'express';
import * as ctrl from './job.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requireHR } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

// Jobs
router.get('/', protect, ctrl.getJobs);
router.get('/public/:id', ctrl.getPublicJob);
router.post('/', protect, requireHR, ctrl.createJob);
router.put('/:id', protect, requireHR, ctrl.updateJob);
router.delete('/:id', protect, requireHR, ctrl.deleteJob);

// Applications
router.get('/:jobId/applications', protect, requireHR, ctrl.getApplications);
router.post('/:jobId/applications', ctrl.createApplication);
router.put('/applications/:appId', protect, requireHR, ctrl.updateApplication);

export default router;

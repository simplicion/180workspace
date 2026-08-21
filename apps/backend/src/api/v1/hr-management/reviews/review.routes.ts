import { Router } from 'express';
import * as ctrl from './review.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requireAdminOrHR } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

router.get('/', protect, ctrl.getReviews);
router.get('/performance-insights', protect, ctrl.getPerformanceInsights);
router.get('/:id', protect, ctrl.getReviewById);
router.post('/', protect, ctrl.createReview);
router.put('/:id/self', protect, ctrl.submitSelfEvaluation);
router.put('/:id/manager', protect, ctrl.submitManagerEvaluation);
router.delete('/:id', protect, requireAdminOrHR, ctrl.deleteReview);

export default router;

import { Router } from 'express';
import { rebuildMarketingSite } from './marketing.controller';

const router = Router();

// Endpoint triggered by admin-web when marketing content is updated
router.post('/rebuild', rebuildMarketingSite);

export const marketingRoutes = router;

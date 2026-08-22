import { Router } from 'express';
import billingRoutes from './billing.routes';

const router = Router();
router.use('/', billingRoutes);

export default router;

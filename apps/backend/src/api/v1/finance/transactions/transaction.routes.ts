import { Router } from 'express';
import * as ctrl from './transaction.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';

const router = Router();

// Mount routes under /api/transactions
router.get('/', protect, ctrl.getTransactions);
router.get('/kpis', protect, ctrl.getLedgerKPIs);
router.post('/', protect, ctrl.addTransaction);

export default router;

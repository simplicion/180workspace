import { Router } from 'express';
import * as ctrl from './transaction.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';

const router = Router();

// Mount routes under /api/transactions
router.get('/', protect, ctrl.getTransactions);
router.get('/kpis', protect, ctrl.getLedgerKPIs);
router.post('/bulk-delete', protect, ctrl.bulkDeleteTransactions);
router.delete('/bulk', protect, ctrl.bulkDeleteTransactions);
router.post('/', protect, ctrl.addTransaction);
router.delete('/:id', protect, ctrl.deleteTransaction);

export default router;

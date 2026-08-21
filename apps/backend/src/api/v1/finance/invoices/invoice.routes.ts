import { Router } from 'express';
import * as ctrl from './invoice.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requireAdmin } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

router.get('/', protect, ctrl.getInvoices);
router.get('/:id', protect, ctrl.getInvoiceById);
router.post('/', protect, ctrl.createInvoice);
router.put('/:id', protect, ctrl.updateInvoice);
router.delete('/:id', protect, requireAdmin, ctrl.deleteInvoice);

export default router;

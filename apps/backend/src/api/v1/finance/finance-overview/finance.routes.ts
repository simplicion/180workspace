import { Router } from 'express';
import * as ctrl from './finance.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requirePermission } from '../../../../system-configs/middleware/auth/rbac';

const router = Router();

router.get('/config', protect, requirePermission('can_manage_finance', 'admin'), ctrl.getConfig);
router.post('/config', protect, requirePermission('can_manage_finance', 'admin'), ctrl.updateConfig);

router.post('/invoices/:id/payment-link', protect, requirePermission('can_manage_finance', 'admin'), ctrl.generateInvoicePaymentLink);
router.get('/invoices/:id/pdf', protect, ctrl.downloadInvoicePDF);

router.post('/payouts/salary/:id', protect, requirePermission('can_manage_finance', 'admin'), ctrl.initiateSalaryPayout);
router.post('/payouts', protect, requirePermission('can_manage_finance', 'admin'), ctrl.createPayout);
router.post('/verify-bank', protect, requirePermission('can_manage_finance', 'admin'), ctrl.verifyBankAccount);
router.post('/trigger-reminders', protect, requirePermission('can_manage_finance', 'admin'), ctrl.triggerReminders);

router.get('/transactions', protect, requirePermission('can_manage_finance', 'admin'), ctrl.getTransactions);
router.get('/dashboard-stats', protect, requirePermission('can_manage_finance', 'admin'), ctrl.getDashboardStats);

export default router;

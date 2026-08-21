import { Router } from 'express';
import { expenseRoutes } from './expense-transactions';
import { financeRoutes } from './finance-overview';
import { invoiceRoutes } from './invoices';
import { salaryRoutes } from './salary';
import { transactionRoutes } from './transactions';
import { vendorRoutes } from './vendors';

const router = Router();

// Mount finance sub-routes
router.use('/expenses', expenseRoutes);
router.use('/finance-overview', financeRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/salary', salaryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/vendors', vendorRoutes);

export default router;

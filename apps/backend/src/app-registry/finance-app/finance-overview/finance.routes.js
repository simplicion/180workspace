'use strict';

const express = require('express');
const router = express.Router();
const financeCtrl = require('./finance.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireAccess } = require('../../../system-configs/middleware/auth/rbac.js');

// Configuration Endpoints (Admin/Finance Read/Write)
router.get('/config', protect, requireAccess('finance', 'read'), financeCtrl.getConfig);
router.post('/config', protect, requireAccess('finance', 'write'), financeCtrl.updateConfig);

// Invoicing endpoints
router.post('/invoices/:id/payment-link', protect, requireAccess('finance', 'write'), financeCtrl.generateInvoicePaymentLink);
router.get('/invoices/:id/pdf', protect, financeCtrl.downloadInvoicePDF);

// Payout endpoints
router.post('/payouts/salary/:id', protect, requireAccess('finance', 'write'), financeCtrl.initiateSalaryPayout);

// Bank Verification endpoints
router.post('/verify-bank', protect, requireAccess('finance', 'write'), financeCtrl.verifyBankAccount);

// Reminder endpoints
router.post('/trigger-reminders', protect, requireAccess('finance', 'write'), financeCtrl.triggerReminders);

// Dashboard & Ledger (Finance Read)
router.get('/transactions', protect, requireAccess('finance', 'read'), financeCtrl.getTransactions);
router.get('/dashboard-stats', protect, requireAccess('finance', 'read'), financeCtrl.getDashboardStats);

module.exports = router;

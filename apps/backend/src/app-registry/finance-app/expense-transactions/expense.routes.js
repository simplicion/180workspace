'use strict';
const express = require('express');
const router = express.Router();
const expenseController = require('./expense.controller');
const { protect, authorize } = require('../../../system-configs/middleware/auth/auth.js');

// All expense routes require authentication
router.use(protect);

// Get all expenses (employees can see their own, admins see all)
router.get('/', expenseController.getExpenses);

// Create expense
router.post('/', expenseController.createExpense);

// Get specific expense
router.get('/:id', expenseController.getExpenseById);

// Approve employee claim (requires manager/admin role)
router.patch('/:id/approve', authorize('admin', 'manager', 'finance'), expenseController.approveClaim);

// Update status (e.g. mark as paid) (requires finance/admin role)
router.patch('/:id/status', authorize('admin', 'finance'), expenseController.updateStatus);

module.exports = router;

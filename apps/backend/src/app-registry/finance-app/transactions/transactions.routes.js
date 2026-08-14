'use strict';
const express = require('express');
const router = express.Router();
const transactionsController = require('./transactions.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');

// Mount routes under /api/transactions
router.get('/', protect, transactionsController.getTransactions);
router.get('/kpis', protect, transactionsController.getLedgerKPIs);
router.post('/', protect, transactionsController.addTransaction);

module.exports = router;

'use strict';
const express = require('express');
const router = express.Router();
const expenseController = require('./expense.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireHR } = require('../../../system-configs/middleware/auth/rbac.js');

const { upload, handleUpload } = require('../../../system-configs/middleware/system/upload.js');

router.get('/', protect, expenseController.getExpenses);
router.post('/', protect, expenseController.createExpense);
router.post('/upload-receipt', protect, upload.single('file'), handleUpload('expenses'), expenseController.uploadReceipt);
router.put('/:id/review', protect, requireHR, expenseController.reviewExpense);
router.delete('/:id', protect, expenseController.deleteExpense);

module.exports = router;

'use strict';
const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireAdmin } = require('../../../system-configs/middleware/auth/rbac.js');
const invoiceController = require('./invoices.controller.js');

// GET /api/invoices
router.get('/', protect, invoiceController.getInvoices);

// GET /api/invoices/:id
router.get('/:id', protect, invoiceController.getInvoiceById);

// POST /api/invoices
router.post('/', protect, invoiceController.createInvoice);

// PUT /api/invoices/:id
router.put('/:id', protect, invoiceController.updateInvoice);

// DELETE /api/invoices/:id
router.delete('/:id', protect, requireAdmin, invoiceController.deleteInvoice);

module.exports = router;

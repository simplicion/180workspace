'use strict';

const express = require('express');
const router = express.Router();
const docController = require('./doc.controller');
const { protect, authorize } = require('../../../system-configs/middleware/auth/auth.js');

// Publicly readable docs for authenticated users:
router.get('/', protect, docController.getDocuments);
router.get('/:slug', protect, docController.getDocumentBySlug);

// Admin / HR only write operations
router.use(protect);
router.use(authorize('admin', 'manager', 'hr'));

router.post('/', docController.createDocument);
router.put('/:id', docController.updateDocument);
router.delete('/:id', docController.deleteDocument);

module.exports = router;

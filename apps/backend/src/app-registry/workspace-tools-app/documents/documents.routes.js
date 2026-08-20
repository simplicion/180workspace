const express = require('express');
const router = express.Router();
const documentsController = require('./documents.controller');

// Import contract routes
const contractRoutes = require('../../crm-and-sales-app/contracts/contract.routes');

// Documents list/getAll
router.get('/', documentsController.getAllDocuments);

// Files (was knowledge routes)
const filesRouter = express.Router();
filesRouter.get('/', documentsController.getDocumentsList);
filesRouter.post('/', documentsController.createDocument);
filesRouter.get('/links/entity', documentsController.getLinksForEntity); // Specific routes before param routes
filesRouter.get('/:id', documentsController.getDocumentById);
filesRouter.put('/:id', documentsController.updateDocument);
filesRouter.delete('/:id', documentsController.deleteDocument);

// Lock mechanism
filesRouter.post('/:id/lock', documentsController.lockDocument);
filesRouter.post('/:id/unlock', documentsController.unlockDocument);

// Linking
filesRouter.post('/:id/links', documentsController.createLink);

router.use('/files', filesRouter);
router.use('/contracts', contractRoutes);

module.exports = router;

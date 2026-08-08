const express = require('express');
const router = express.Router();
const documentsController = require('./documents.controller');

// Import sub-routes to be nested under /180documents
const knowledgeRoutes = require('../knowledge/knowledge.routes');
const contractRoutes = require('../../crm-and-sales-app/contracts/contract.routes');

router.get('/', documentsController.getAllDocuments);

router.use('/files', knowledgeRoutes);
router.use('/contracts', contractRoutes);

module.exports = router;

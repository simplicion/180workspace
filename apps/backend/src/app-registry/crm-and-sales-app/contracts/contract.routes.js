const express = require('express');
const router = express.Router();
const contractController = require('./contract.controller');

// Private authenticated endpoints (requires protect + moduleGuard from index.routes)
router.post('/', contractController.createContract);
router.get('/', contractController.getContracts);
router.get('/:id', contractController.getContract);
router.put('/:id', contractController.updateContract);
router.delete('/:id', contractController.deleteContract);
router.post('/:id/share', contractController.generateShareLink);

module.exports = router;

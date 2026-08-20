const express = require('express');
const router = express.Router();
const contractController = require('./contract.controller');

// Public unauthenticated endpoints for the Client Portal
router.get('/:token', contractController.getContractByToken);
router.post('/:token/sign', contractController.signContract);

module.exports = router;


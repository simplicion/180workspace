const express = require('express');
const { SavedBanksController } = require('./saved-banks.controller');

const router = express.Router();

// Saved Banks
router.get('/saved-banks', SavedBanksController.getBanks);
router.post('/saved-banks', SavedBanksController.createBank);
router.delete('/saved-banks/:id', SavedBanksController.deleteBank);


module.exports = router;

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');

router.get('/', protect, searchController.globalSearch);

module.exports = router;

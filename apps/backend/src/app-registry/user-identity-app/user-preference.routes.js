'use strict';

const express = require('express');
const router = express.Router();
const userPreferenceController = require('./user-preference.controller');
const { protect } = require('../../system-configs/middleware/auth/auth.js');

router.get('/', protect, userPreferenceController.getPreferences);
router.post('/favorites/toggle', protect, userPreferenceController.updateFavorites);
router.post('/recent', protect, userPreferenceController.addRecentItem);
router.post('/toggle-sidebar', protect, userPreferenceController.toggleSidebar);

module.exports = router;

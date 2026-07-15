'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('./events.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const moduleGuard = require('../../../system-configs/middleware/auth/module-guard.js');
const { upload, handleUpload } = require('../../../system-configs/middleware/system/upload.js');

router.use(protect);
// Optional: If there's a specific module permission for events, use moduleGuard here.
// router.use(moduleGuard('events_module_id'));

router.post('/upload-banner', upload.single('file'), handleUpload('events', { isLogo: true, forceR2: true }), ctrl.uploadBanner);

router.get('/', ctrl.getCompanyEvents);
router.post('/', ctrl.createEvent);
router.get('/:id', ctrl.getCompanyEvent);
router.put('/:id', ctrl.updateEvent);
router.delete('/:id', ctrl.deleteEvent);

module.exports = router;

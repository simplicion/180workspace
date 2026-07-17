'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireHR } = require('../../../system-configs/middleware/auth/rbac.js');
const { upload, handleUpload } = require('../../../system-configs/middleware/system/upload.js');
const ctrl = require('../controllers/file.controller');

router.post('/upload', protect, upload.single('file'), handleUpload('general'), ctrl.uploadFile);
router.post('/upload-voice', protect, upload.single('file'), handleUpload('voice_notes', { forceR2: true }), ctrl.uploadFile);
router.get('/presigned-url', protect, ctrl.getPresignedUrl);
router.post('/link', protect, ctrl.addFileLink);
router.post('/attach-existing', protect, ctrl.attachExistingFile);
router.get('/', protect, ctrl.getFiles);
router.post('/sign/:id', protect, ctrl.signFile);
router.delete('/:id', protect, requireHR, ctrl.deleteFile);

module.exports = router;

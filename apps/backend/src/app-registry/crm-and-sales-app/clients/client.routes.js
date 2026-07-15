'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireHR, requireManager, requireEmployee } = require('../../../system-configs/middleware/auth/rbac.js');
const { upload, handleUpload } = require('../../../system-configs/middleware/system/upload.js');
const ctrl = require('./client.controller');

router.get('/', protect, requireEmployee, ctrl.getClients);
router.post('/', protect, requireHR, ctrl.createClient);
router.get('/:id', protect, ctrl.getClientById);
router.put('/:id', protect, requireHR, upload.single('logo'), handleUpload('logos', { isLogo: true }), ctrl.updateClient);
router.delete('/:id', protect, requireHR, ctrl.deleteClient);

// Communications
router.get('/:id/communications', protect, ctrl.getCommunications);
router.post('/:id/communications', protect, ctrl.createCommunication);
router.delete('/:id/communications/:commId', protect, ctrl.deleteCommunication);

// Activity feed
router.get('/:id/activity', protect, ctrl.getActivity);

module.exports = router;

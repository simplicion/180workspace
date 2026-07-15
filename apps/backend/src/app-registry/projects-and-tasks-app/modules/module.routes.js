'use strict';

const express = require('express');
const router = express.Router();
const moduleController = require('./module.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');

router.use(protect);

router.post('/', moduleController.createModule);
router.get('/project/:projectId', moduleController.getModulesByProject);
router.put('/:id', moduleController.updateModule);
router.delete('/:id', moduleController.deleteModule);

module.exports = router;

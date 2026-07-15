'use strict';
const express = require('express');
const router = express.Router();
const releaseNoteCtrl = require('../../../app-registry/superadmin/system-operations/releasenote.controller');

// Only list published ones for users
router.get('/', releaseNoteCtrl.listPublished);

module.exports = router;

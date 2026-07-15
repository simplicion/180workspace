const express = require('express');
const router = express.Router();
const { protect, requirePermission } = require('../../../system-configs/middleware/auth/auth.js');
const { getDesignations, createDesignation } = require('./designation.controller');

// All designation routes require authentication
router.use(protect);

// GET /api/designations - list available designations for a company
router.get('/', getDesignations);

// POST /api/designations - create a new custom designation
// We allow users with team management permission to add new designations
router.post('/', requirePermission('can_manage_team', 'admin'), createDesignation);

module.exports = router;

'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireHR } = require('../../../system-configs/middleware/auth/rbac.js');
const ctrl = require('./salary.controller');

router.get('/', protect, requireHR, ctrl.getSalaries);
router.get('/preview', protect, requireHR, ctrl.getSalaryPreview);
router.post('/generate', protect, requireHR, ctrl.generateSalary);
router.put('/:id/approve', protect, requireHR, ctrl.approveSalary);
router.put('/:id/hr-approve', protect, requireHR, ctrl.hrApproveSalary);
router.put('/:id/mark-paid', protect, requireHR, ctrl.markPaid);
router.post('/:id/initiate-payout', protect, requireHR, ctrl.initiateSalaryPayout);
router.get('/my', protect, ctrl.getMySalaries);

module.exports = router;

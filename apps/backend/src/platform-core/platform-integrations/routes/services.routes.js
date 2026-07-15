'use strict';

const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');

// Public routes
router.post('/request', servicesController.submitServiceRequest);
router.get('/company/:companyId', servicesController.getServices);

// Protected routes (Requires authentication)
router.use(protect);
router.post('/', servicesController.addService);
router.put('/:id', servicesController.updateService);
router.delete('/:id', servicesController.deleteService);
router.get('/requests', servicesController.getServiceRequests);
router.put('/requests/:id', servicesController.updateServiceRequestStatus);

module.exports = router;

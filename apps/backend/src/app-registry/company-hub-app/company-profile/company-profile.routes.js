'use strict';

const express = require('express');
const router = express.Router();
const companyProfileController = require('./company-profile.controller');
const companyServicesController = require('./company-services.controller');
const companyProductsController = require('./company-products.controller');
const companyMediaController = require('./company-media.controller');
const companyCoreValuesController = require('./company-core-values.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');

// Public route for viewing profile
router.get('/public/:id', companyProfileController.getPublicProfile);
router.post('/public/:id/view', companyProfileController.incrementProfileViews);
router.get('/public/:id/follow-status', protect, companyProfileController.getFollowStatus);
router.post('/public/:id/follow', protect, companyProfileController.incrementFollowers);
router.delete('/public/:id/follow', protect, companyProfileController.unfollowCompany);
router.get('/public/:id/services/:serviceId', companyServicesController.getPublicServiceDetails);
router.post('/public/:id/services/:serviceId/request', companyServicesController.createServiceRequest);
router.get('/public/:id/reviews', companyProfileController.getReviews);
router.post('/public/:id/reviews', protect, companyProfileController.addReview);

// Protected routes for managing profile
router.use(protect);
router.get('/private', companyProfileController.getPrivateProfile);
router.get('/private/milestones', companyProfileController.getCompanyMilestones);
router.put('/', companyProfileController.updateProfile);
router.put('/private/finance', companyProfileController.updateFinanceTab);
// Service Routes
router.post('/private/services', companyServicesController.createService);
router.put('/private/services/:id', companyServicesController.updateService);
router.delete('/private/services/:id', companyServicesController.deleteService);
router.get('/private/service-requests', companyServicesController.getServiceRequests);

// Product Routes
router.post('/private/products', companyProductsController.createProduct);
router.put('/private/products/:id', companyProductsController.updateProduct);
router.delete('/private/products/:id', companyProductsController.deleteProduct);

// Media Routes
router.post('/private/media', companyMediaController.addMedia);
router.delete('/private/media/:id', companyMediaController.deleteMedia);

// Core Values Routes
router.post('/private/core-values', companyCoreValuesController.addCoreValue);
router.delete('/private/core-values/:id', companyCoreValuesController.deleteCoreValue);

module.exports = router;

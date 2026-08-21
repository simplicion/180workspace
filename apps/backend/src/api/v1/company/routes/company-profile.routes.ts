import express from 'express';
import * as companyProfileController from '../controllers/company-profile.controller';
import * as companyServicesController from '../controllers/company-services.controller';
import * as companyProductsController from '../controllers/company-products.controller';
import * as companyMediaController from '../controllers/company-media.controller';
import * as companyCoreValuesController from '../controllers/company-core-values.controller';
import { protect } from '../../../../system-configs/middleware/auth/auth';

const router = express.Router();

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
router.put('/', companyProfileController.updatePrivateProfile);
router.post('/private/verify-domain', companyProfileController.verifyDomain);
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

export default router;

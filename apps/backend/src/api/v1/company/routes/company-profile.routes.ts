import express from 'express';
import * as companyProfileController from '../controllers/company-profile.controller';
import * as companyOfferingsController from '../controllers/company-offerings.controller';
import * as companyMediaController from '../controllers/company-media.controller';
import * as companyCoreValuesController from '../controllers/company-core-values.controller';
import { protect, optionalProtect } from '../../../../system-configs/middleware/auth/auth';

const router = express.Router();

// Public route for viewing profile
router.get('/public/:id', companyProfileController.getPublicProfile);
router.post('/public/:id/view', companyProfileController.incrementProfileViews);
router.get('/public/:id/follow-status', protect, companyProfileController.getFollowStatus);
router.post('/public/:id/follow', protect, companyProfileController.incrementFollowers);
router.delete('/public/:id/follow', protect, companyProfileController.unfollowCompany);
router.get('/public/:id/services/:offeringId', companyOfferingsController.getPublicOfferingDetails);
router.post('/public/:id/services/:offeringId/request', companyOfferingsController.createOfferingRequest);
router.get('/public/:id/reviews', companyProfileController.getReviews);
router.post('/public/:id/reviews', optionalProtect, companyProfileController.addReview);

// Protected routes for managing profile
router.use(protect);
router.get('/private', companyProfileController.getPrivateProfile);
router.get('/private/milestones', companyProfileController.getCompanyMilestones);
router.put('/', companyProfileController.updatePrivateProfile);
router.post('/private/verify-domain', companyProfileController.verifyDomain);
router.put('/private/finance', companyProfileController.updateFinanceTab);

// Service/Offering Routes
router.post('/private/services', companyOfferingsController.createOffering);
router.put('/private/services/:id', companyOfferingsController.updateOffering);
router.delete('/private/services/:id', companyOfferingsController.deleteOffering);
router.get('/private/service-requests', companyOfferingsController.getOfferingRequests);

// Media Routes
router.post('/private/media', companyMediaController.addMedia);
router.delete('/private/media/:id', companyMediaController.deleteMedia);

// Core Values Routes
router.post('/private/core-values', companyCoreValuesController.addCoreValue);
router.delete('/private/core-values/:id', companyCoreValuesController.deleteCoreValue);

export default router;

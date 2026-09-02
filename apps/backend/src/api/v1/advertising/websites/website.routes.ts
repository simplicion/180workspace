import { Router } from 'express';
import * as websiteController from './website.controller';

const router = Router();

router.get('/', websiteController.getWebsites);
router.post('/', websiteController.createWebsite);
router.get('/check-slug', websiteController.checkAvailability);
router.get('/:id', websiteController.getWebsite);
router.patch('/:id', websiteController.updateWebsite);
router.delete('/:id', websiteController.deleteWebsite);

router.get('/:id/stats', websiteController.getWebsiteStats);

router.get('/:id/pixels', websiteController.getWebsitePixels);
router.post('/:id/pixels', websiteController.createWebsitePixel);

export default router;

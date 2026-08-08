'use strict';

const express = require('express');
const router = express.Router();
const websiteController = require('./website.controller');

router.get('/', websiteController.getWebsites);
router.post('/', websiteController.createWebsite);
router.get('/:id', websiteController.getWebsite);
router.patch('/:id', websiteController.updateWebsite);
router.put('/:id/primary', websiteController.setPrimaryWebsite);
router.delete('/:id', websiteController.deleteWebsite);

router.get('/:id/stats', websiteController.getWebsiteStats);
router.get('/:id/leads', websiteController.getWebsiteLeads);
router.get('/:id/pixels', websiteController.getWebsitePixels);
router.post('/:id/pixels', websiteController.createWebsitePixel);

module.exports = router;

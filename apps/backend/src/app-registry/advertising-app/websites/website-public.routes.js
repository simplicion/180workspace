'use strict';

const express = require('express');
const router = express.Router();
const websiteController = require('./website.controller');

/**
 * @route   GET /api/public/websites/:slug
 * @desc    Fetch website config and tracking pixels
 */
router.get('/:slug', websiteController.publicGetWebsite);

/**
 * @route   POST /api/public/websites/:slug/lead
 * @desc    Submit a lead from a public website
 */
router.post('/:slug/lead', websiteController.publicSubmitLead);

module.exports = router;

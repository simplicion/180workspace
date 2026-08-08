'use strict';

const express = require('express');
const router = express.Router();
const websiteController = require('./website.controller');
const { rateLimit } = require('express-rate-limit');

const leadSubmitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 submissions per 15 minutes
    message: { error: 'Too many submissions, please try again later.' },
});

/**
 * @route   GET /api/public/websites/resolve
 * @desc    Fetch website config and tracking pixels by domain and optional slug
 */
router.get('/resolve', websiteController.publicGetWebsite);

/**
 * @route   POST /api/public/websites/resolve/lead
 * @desc    Submit a lead from a public website
 */
router.post('/resolve/lead', leadSubmitLimiter, websiteController.publicSubmitLead);

module.exports = router;

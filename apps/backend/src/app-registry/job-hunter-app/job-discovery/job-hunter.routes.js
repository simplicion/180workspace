'use strict';

const express = require('express');
const router = express.Router();
const jobHunterController = require('./job-hunter.controller');
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const multer = require('multer');

// Configure multer for memory storage (for resume parsing)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.use(protect);

// Profile & Resume
router.post('/profile/extract', upload.single('resume'), jobHunterController.extractResume);
router.get('/profile', jobHunterController.getProfile);
router.put('/profile', jobHunterController.updateProfile);

// Jobs Discovery
router.get('/jobs', jobHunterController.getJobs);
router.post('/jobs/match', jobHunterController.triggerJobMatching);

// Applications
router.post('/apply', jobHunterController.applyForJob);
router.get('/applications', jobHunterController.getApplications);

module.exports = router;

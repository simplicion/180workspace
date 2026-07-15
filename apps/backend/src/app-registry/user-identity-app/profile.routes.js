const express = require('express');
const router = express.Router();
const profileController = require('./profile.controller');

// PUT update basic profile info (own profile)
router.put('/', profileController.updateProfile);

// POST generate presigned URL for image/resume upload
router.post('/upload-url', profileController.getUploadUrl);

// Experience
router.post('/experiences', profileController.addExperience);
router.put('/experiences/:id', profileController.updateExperience);
router.delete('/experiences/:id', profileController.deleteExperience);

// Education
router.post('/educations', profileController.addEducation);
router.put('/educations/:id', profileController.updateEducation);
router.delete('/educations/:id', profileController.deleteEducation);

// Skills
router.get('/skills/search', profileController.searchSkills);
router.post('/skills', profileController.addSkill);
router.delete('/skills/:id', profileController.deleteSkill);

// Projects
router.post('/projects', profileController.addProject);
router.put('/projects/:id', profileController.updateProject);
router.delete('/projects/:id', profileController.deleteProject);

// Resumes
router.post('/resumes', profileController.addResume);
router.delete('/resumes/:id', profileController.deleteResume);

// Network Feed (All Profiles)
router.get('/network/all', profileController.getAllNetworkProfiles);

// GET full profile â€” MUST be last (catch-all param route)
router.get('/:userId', profileController.getProfile);

// Network
router.post('/:userId/follow', profileController.followProfile);
router.get('/:userId/network', profileController.getNetwork);

module.exports = router;

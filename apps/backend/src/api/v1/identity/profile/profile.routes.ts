import express from 'express';
import { ProfileController } from './profile.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { ProfileValidation } from './profile.validation';

import { protect } from '../../../../system-configs/middleware/auth/auth';

const router = express.Router();


router.put('/', protect, validateRequest(ProfileValidation.updateProfile), ProfileController.updateProfile);
router.post('/verify-password', protect, ProfileController.verifyPassword);
router.post('/upload-url', protect, validateRequest(ProfileValidation.getUploadUrl), ProfileController.getUploadUrl);

// Experience
router.post('/experiences', protect, validateRequest(ProfileValidation.addExperience), ProfileController.addExperience);
router.put('/experiences/:id', protect, validateRequest(ProfileValidation.addExperience), ProfileController.updateExperience);
router.delete('/experiences/:id', protect, ProfileController.deleteExperience);

// Education
router.post('/educations', protect, validateRequest(ProfileValidation.addEducation), ProfileController.addEducation);
router.put('/educations/:id', protect, validateRequest(ProfileValidation.addEducation), ProfileController.updateEducation);
router.delete('/educations/:id', protect, ProfileController.deleteEducation);

// Skills
router.get('/skills/search', protect, ProfileController.searchSkills);
router.post('/skills', protect, validateRequest(ProfileValidation.addSkill), ProfileController.addSkill);
router.delete('/skills/:id', protect, ProfileController.deleteSkill);

// Projects
router.post('/projects', protect, validateRequest(ProfileValidation.addProject), ProfileController.addProject);
router.put('/projects/:id', protect, validateRequest(ProfileValidation.addProject), ProfileController.updateProject);
router.delete('/projects/:id', protect, ProfileController.deleteProject);

// Resumes
router.post('/resumes', protect, validateRequest(ProfileValidation.addResume), ProfileController.addResume);
router.delete('/resumes/:id', protect, ProfileController.deleteResume);

// Network Feed (All Profiles)
router.get('/network/all', protect, ProfileController.getAllNetworkProfiles);

// GET full profile - MUST be last
router.get('/:userId', protect, ProfileController.getProfile);

// Network
router.post('/:userId/follow', protect, ProfileController.followProfile);
router.get('/:userId/network', protect, ProfileController.getNetwork);

export const profileRoutes = router;

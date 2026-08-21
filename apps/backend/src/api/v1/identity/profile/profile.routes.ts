import express from 'express';
import { ProfileController } from './profile.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { ProfileValidation } from './profile.validation';

const router = express.Router();

router.put('/', validateRequest(ProfileValidation.updateProfile), ProfileController.updateProfile);
router.post('/upload-url', validateRequest(ProfileValidation.getUploadUrl), ProfileController.getUploadUrl);

// Experience
router.post('/experiences', validateRequest(ProfileValidation.addExperience), ProfileController.addExperience);
router.put('/experiences/:id', validateRequest(ProfileValidation.addExperience), ProfileController.updateExperience);
router.delete('/experiences/:id', ProfileController.deleteExperience);

// Education
router.post('/educations', validateRequest(ProfileValidation.addEducation), ProfileController.addEducation);
router.put('/educations/:id', validateRequest(ProfileValidation.addEducation), ProfileController.updateEducation);
router.delete('/educations/:id', ProfileController.deleteEducation);

// Skills
router.get('/skills/search', ProfileController.searchSkills);
router.post('/skills', validateRequest(ProfileValidation.addSkill), ProfileController.addSkill);
router.delete('/skills/:id', ProfileController.deleteSkill);

// Projects
router.post('/projects', validateRequest(ProfileValidation.addProject), ProfileController.addProject);
router.put('/projects/:id', validateRequest(ProfileValidation.addProject), ProfileController.updateProject);
router.delete('/projects/:id', ProfileController.deleteProject);

// Resumes
router.post('/resumes', validateRequest(ProfileValidation.addResume), ProfileController.addResume);
router.delete('/resumes/:id', ProfileController.deleteResume);

// Network Feed (All Profiles)
router.get('/network/all', ProfileController.getAllNetworkProfiles);

// GET full profile - MUST be last
router.get('/:userId', ProfileController.getProfile);

// Network
router.post('/:userId/follow', ProfileController.followProfile);
router.get('/:userId/network', ProfileController.getNetwork);

export const profileRoutes = router;

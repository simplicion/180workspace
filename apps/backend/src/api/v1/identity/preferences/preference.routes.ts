import express from 'express';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { PreferenceController } from './preference.controller';
import { PreferenceValidation } from './preference.validation';

const router = express.Router();

router.get('/', protect, PreferenceController.getPreferences);
router.post('/favorites/toggle', protect, validateRequest(PreferenceValidation.updateFavorites), PreferenceController.updateFavorites);
router.post('/recent', protect, validateRequest(PreferenceValidation.addRecentItem), PreferenceController.addRecentItem);
router.post('/toggle-sidebar', protect, validateRequest(PreferenceValidation.toggleSidebar), PreferenceController.toggleSidebar);

export const preferenceRoutes = router;

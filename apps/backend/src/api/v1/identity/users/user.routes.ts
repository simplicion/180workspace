import express from 'express';
import { protect } from '../../../../system-configs/middleware/auth/auth';
import { requireAdmin, requireAccess } from '../../../../system-configs/middleware/auth/rbac';
import { upload, handleUpload } from '../../../../system-configs/middleware/system/upload';
import { UserController } from './user.controller';
import { validateRequest } from '../../../../system-configs/middleware/system/validateRequest';
import { UserValidation } from './user.validation';

const router = express.Router();

router.get('/', protect, requireAccess('hr', 'read'), UserController.getUsers);
router.get('/search/mentions', protect, UserController.searchMentions);
router.get('/:id', protect, UserController.getUserById); 
router.post('/:id/follow', protect, UserController.toggleFollow);
router.get('/:id/followers', protect, UserController.getFollowers);
router.get('/:id/following', protect, UserController.getFollowing);
router.put('/:id', protect, validateRequest(UserValidation.updateUser), UserController.updateUser); 
router.delete('/:id', protect, requireAdmin, UserController.deleteUser);
router.put('/:id/photo', protect, upload.single('photo'), handleUpload('employees', { isLogo: true }), UserController.updatePhoto);
router.get('/:id/stats', protect, UserController.getProfileStats);

export const userRoutes = router;

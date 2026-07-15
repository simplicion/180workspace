'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../system-configs/middleware/auth/auth.js');
const { requireAdmin, requireAccess } = require('../../system-configs/middleware/auth/rbac.js');
const { upload, handleUpload } = require('../../system-configs/middleware/system/upload.js');
const {
    getUsers, getUserById, updateUser, deleteUser, updatePhoto, getProfileStats,
} = require('./user.controller');

router.get('/', protect, requireAccess('hr', 'read'), getUsers);
router.get('/search/mentions', protect, require('./user.controller').searchMentions);
router.get('/:id', protect, getUserById); // any user can read a user profile (or themselves)
router.post('/:id/follow', protect, require('./user.controller').toggleFollow);
router.get('/:id/followers', protect, require('./user.controller').getFollowers);
router.get('/:id/following', protect, require('./user.controller').getFollowing);
router.put('/:id', protect, updateUser); // any user can update themselves
router.delete('/:id', protect, requireAdmin, deleteUser);
router.put('/:id/photo', protect, upload.single('photo'), handleUpload('employees', { isLogo: true }), updatePhoto);
router.get('/:id/stats', protect, getProfileStats);

module.exports = router;

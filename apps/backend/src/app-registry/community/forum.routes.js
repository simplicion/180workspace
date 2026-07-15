'use strict';
const express = require('express');
const router = express.Router();
const forumCtrl = require('./forum.controller');
const auth = require('../../system-configs/middleware/auth/auth.js');

// Public/Read-only
router.get('/posts', forumCtrl.listPosts);
router.get('/posts/:id', forumCtrl.getPost);
router.get('/hashtags', forumCtrl.getHashtags);
router.get('/link-preview', forumCtrl.getLinkPreview);

// Protected actions
router.use(auth.protect);
router.post('/posts', forumCtrl.createPost);
router.post('/posts/:postId/replies', forumCtrl.createReply);
router.post('/posts/:postId/like', forumCtrl.toggleLike);
router.get('/posts/:postId/likes', forumCtrl.getPostLikes);
router.post('/posts/:postId/save', forumCtrl.toggleSave);
router.post('/posts/:postId/poll/:optionId/vote', forumCtrl.votePoll);
router.get('/saved', forumCtrl.getSavedPosts);
router.get('/posts/:postId/replies', forumCtrl.getPostReplies);
router.delete('/posts/:postId', forumCtrl.deletePost);
router.post('/posts/:postId/report', forumCtrl.reportPost);

module.exports = router;

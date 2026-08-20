'use strict';
const { ForumService } = require('@workspace/community');

// User actions
exports.listPosts = async (req, res) => {
    try {
        const posts = await ForumService.listPosts(req.query);
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPost = async (req, res) => {
    try {
        const result = await ForumService.getPostAndReplies(req.params.id);
        res.json(result);
    } catch (error) {
        if (error.message === 'Post not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.createPost = async (req, res) => {
    try {
        const enqueueMediaJob = async (mediaId) => {
            try {
                const { mediaQueue } = require('../workspace-tools-app/queues/media.queue');
                await mediaQueue.add('process_community_video', {
                    mediaId: mediaId,
                    mediaType: 'community'
                });
            } catch (err) {
                console.error("Failed to enqueue media job:", err);
            }
        };

        const post = await ForumService.createPost(req.body, req.user, enqueueMediaJob);
        res.status(201).json(post);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.createReply = async (req, res) => {
    try {
        const reply = await ForumService.createReply(req.params.postId, req.body, req.user);
        res.status(201).json(reply);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const post = await ForumService.toggleLike(req.params.postId, req.user.id);
        res.json(post);
    } catch (error) {
        if (error.message === 'Post not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

// Superadmin actions
exports.deletePost = async (req, res) => {
    try {
        const postId = req.params.id || req.params.postId;
        const result = await ForumService.deletePost(postId, req.user);
        res.json(result);
    } catch (error) {
        if (error.message === 'Post not found') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Forbidden') {
            return res.status(403).json({ error: 'You do not have permission to delete this post' });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.reportPost = async (req, res) => {
    try {
        const report = await ForumService.reportPost(req.params.postId, req.body.reason, req.user.id);
        res.status(201).json(report);
    } catch (error) {
        if (error.message === 'Reason is required') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.deleteReply = async (req, res) => {
    try {
        const result = await ForumService.deleteReply(req.params.id);
        res.json(result);
    } catch (error) {
        if (error.message === 'Reply not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.getPostLikes = async (req, res) => {
    try {
        const users = await ForumService.getPostLikes(req.params.postId);
        res.json({ users });
    } catch (error) {
        if (error.message === 'Post not found') {
            return res.status(404).json({ error: error.message });
        }
        console.error('Error fetching likes:', error);
        res.status(500).json({ error: 'Failed to fetch likes' });
    }
};

exports.toggleSave = async (req, res) => {
    try {
        const result = await ForumService.toggleSave(req.params.postId, req.user.id);
        res.json({ saved: result });
    } catch (error) {
        console.error('Error toggling save:', error);
        res.status(500).json({ error: 'Failed to toggle save' });
    }
};

exports.getSavedPosts = async (req, res) => {
    try {
        const posts = await ForumService.getSavedPosts(req.user.id);
        res.json({ posts });
    } catch (error) {
        console.error('Error fetching saved posts:', error);
        res.status(500).json({ error: 'Failed to fetch saved posts' });
    }
};

exports.getPostReplies = async (req, res) => {
    try {
        const replies = await ForumService.getPostReplies(req.params.postId);
        res.json({ replies });
    } catch (error) {
        console.error('Error fetching replies:', error);
        res.status(500).json({ error: 'Failed to fetch replies' });
    }
};

exports.getHashtags = async (req, res) => {
    try {
        const hashtags = await ForumService.getHashtags(req.query.q);
        res.json(hashtags);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.votePoll = async (req, res) => {
    try {
        const emitPollUpdated = (postId, optionId, votes) => {
            const io = require('../../system-configs/sockets/index.js').getIo();
            if (io) {
                io.emit('poll-updated', { postId, optionId, votes });
            }
        };

        const result = await ForumService.votePoll(req.params.optionId, req.user.id, emitPollUpdated);
        res.json(result);
    } catch (error) {
        if (error.message === 'Poll option not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.getLinkPreview = async (req, res) => {
    try {
        const preview = await ForumService.getLinkPreview(req.query.url);
        res.json(preview);
    } catch (error) {
        if (error.message === 'URL is required') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error fetching link preview:', error);
        res.status(500).json({ error: 'Failed to fetch link preview' });
    }
};

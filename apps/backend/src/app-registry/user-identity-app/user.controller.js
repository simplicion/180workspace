'use strict';

const { UserService } = require('@workspace/identity');

exports.getUsers = async (req, res, next) => {
    try {
        const result = await UserService.getUsers(req.query);
        res.json(result);
    } catch (err) { next(err); }
};

exports.getUserById = async (req, res, next) => {
    try {
        const result = await UserService.getUserById(req.params.id, req.user.role);
        res.json(result);
    } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
    try {
        const result = await UserService.updateUser(req.params.id, req.body, req.user, req.company, req);
        res.json(result);
    } catch (err) { 
        if (err.message === 'User not found' || (err.code && err.code === 'P2025')) return res.status(404).json({ error: 'User not found' });
        next(err); 
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        const result = await UserService.deleteUser(req.params.id, req.user, req);
        res.json(result);
    } catch (err) { 
        if (err.message === 'Cannot delete your own account') return res.status(400).json({ error: err.message });
        if (err.message === 'User not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};

exports.updatePhoto = async (req, res, next) => {
    try {
        const result = await UserService.updatePhoto(req.params.id, req.storageResult);
        res.json(result);
    } catch (err) { 
        if (err.message === 'Photo upload failed') return res.status(400).json({ error: err.message });
        if (err.message === 'User not found' || (err.code && err.code === 'P2025')) return res.status(404).json({ error: 'User not found' });
        next(err); 
    }
};

exports.getProfileStats = async (req, res, next) => {
    try {
        const result = await UserService.getProfileStats(req.params.id);
        res.json(result);
    } catch (err) { 
        if (err.message === 'Invalid User ID format') return res.status(400).json({ error: err.message });
        next(err); 
    }
};

exports.toggleFollow = async (req, res, next) => {
    try {
        const sockets = require('../../system-configs/sockets/index.js');
        const io = sockets.getIo();
        const result = await UserService.toggleFollow(req.params.id, req.user.id, io);
        res.json(result);
    } catch (err) { 
        if (err.message === 'Cannot follow yourself') return res.status(400).json({ error: err.message });
        if (err.message === 'User not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};

exports.getFollowers = async (req, res, next) => {
    try {
        const result = await UserService.getFollowers(req.params.id);
        res.json(result);
    } catch (err) { 
        if (err.message === 'User not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};

exports.getFollowing = async (req, res, next) => {
    try {
        const result = await UserService.getFollowing(req.params.id);
        res.json(result);
    } catch (err) { 
        if (err.message === 'User not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};

exports.searchMentions = async (req, res, next) => {
    try {
        const result = await UserService.searchMentions(req.query.q);
        res.json(result);
    } catch (err) { next(err); }
};

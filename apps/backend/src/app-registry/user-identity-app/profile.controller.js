const { prisma } = require('@workspace/db');
'use strict';

const { ProfileService } = require('@workspace/identity');

// Helper to get prisma from req (company-aware)
exports.getProfile = async (req, res, next) => {
    try {
        const result = await ProfileService.getProfile(req.params.userId, req.user.id);
        res.json(result);
    } catch (err) {
        if (err.message === 'User not found') return res.status(404).json({ message: err.message });
        next(err);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const result = await ProfileService.updateProfile(req.user.id, req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.getUploadUrl = async (req, res, next) => {
    try {
        const { fileType, contentType, extension } = req.body; 
        const result = await ProfileService.getUploadUrl(req.user.id, fileType, contentType, extension, process.env.REELS_CDN_URL);
        res.json(result);
    } catch (err) {
        if (err.message === 'Invalid file type') return res.status(400).json({ message: err.message });
        next(err);
    }
};

// --- Experiences ---
exports.addExperience = async (req, res, next) => {
    try {
        const result = await ProfileService.addExperience(req.user.id, req.body);
        res.json(result);
    } catch (err) { next(err); }
};

exports.updateExperience = async (req, res, next) => {
    try {
        const result = await ProfileService.updateExperience(req.params.id, req.user.id, req.body);
        res.json(result);
    } catch (err) { next(err); }
};

exports.deleteExperience = async (req, res, next) => {
    try {
        const result = await ProfileService.deleteExperience(req.params.id, req.user.id);
        res.json(result);
    } catch (err) { next(err); }
};

// --- Education ---
exports.addEducation = async (req, res, next) => {
    try {
        const result = await ProfileService.addEducation(req.user.id, req.body);
        res.json(result);
    } catch (err) { next(err); }
};

exports.updateEducation = async (req, res, next) => {
    try {
        const result = await ProfileService.updateEducation(req.params.id, req.user.id, req.body);
        res.json(result);
    } catch (err) { next(err); }
};

exports.deleteEducation = async (req, res, next) => {
    try {
        const result = await ProfileService.deleteEducation(req.params.id, req.user.id);
        res.json(result);
    } catch (err) { next(err); }
};

// --- Skills ---
exports.searchSkills = async (req, res, next) => {
    try {
        const result = await ProfileService.searchSkills(req.query.q);
        res.json(result);
    } catch (err) { next(err); }
};

exports.addSkill = async (req, res, next) => {
    try {
        const { skillName, isCustom } = req.body;
        const result = await ProfileService.addSkill(req.user.id, skillName, isCustom);
        res.json(result);
    } catch (err) {
        if (err.message === 'Skill already added') return res.status(400).json({ message: err.message });
        next(err);
    }
};

exports.deleteSkill = async (req, res, next) => {
    try {
        const result = await ProfileService.deleteSkill(req.params.id, req.user.id);
        res.json(result);
    } catch (err) { next(err); }
};

// --- Resumes ---
exports.addResume = async (req, res, next) => {
    try {
        const { fileUrl, fileName } = req.body;
        const result = await ProfileService.addResume(req.user.id, fileUrl, fileName);
        res.json(result);
    } catch (err) {
        if (err.message === 'Maximum of 3 resumes allowed.') return res.status(400).json({ message: err.message });
        next(err);
    }
};

exports.deleteResume = async (req, res, next) => {
    try {
        const result = await ProfileService.deleteResume(req.params.id, req.user.id, process.env.REELS_CDN_URL);
        res.json(result);
    } catch (err) { next(err); }
};

exports.followProfile = async (req, res, next) => {
    try {
        const result = await ProfileService.followProfile(req.params.userId, req.user.id);
        res.json(result);
    } catch (err) {
        if (err.message === 'User not found') return res.status(404).json({ message: err.message });
        if (err.message === 'Cannot follow yourself') return res.status(400).json({ message: err.message });
        next(err);
    }
};

exports.getNetwork = async (req, res, next) => {
    try {
        const result = await ProfileService.getNetwork(req.params.userId, req.user.id);
        res.json(result);
    } catch(err) { 
        if (err.message === 'User not found') return res.status(404).json({ message: err.message });
        next(err); 
    }
};

// Projects
exports.addProject = async (req, res, next) => {
    try {
        const result = await ProfileService.addProject(req.user.id, req.body);
        res.json(result);
    } catch (err) { next(err); }
};

exports.updateProject = async (req, res, next) => {
    try {
        const result = await ProfileService.updateProject(req.params.id, req.user.id, req.body);
        res.json(result);
    } catch (err) { next(err); }
};

exports.deleteProject = async (req, res, next) => {
    try {
        const result = await ProfileService.deleteProject(req.params.id, req.user.id);
        res.json(result);
    } catch (err) { next(err); }
};

exports.getAllNetworkProfiles = async (req, res, next) => {
    try {
        const result = await ProfileService.getAllNetworkProfiles(req.user.id);
        res.json(result);
    } catch (err) { next(err); }
};

'use strict';

const { UserPreferenceService } = require('@workspace/identity');

exports.getPreferences = async (req, res, next) => {
    try {
        const result = await UserPreferenceService.getPreferences(req.user.id);
        res.json(result);
    } catch (err) {
        if (err.message === 'Database connection not available.') return res.status(500).json({ error: err.message });
        console.error('[UserPreference Controller] error:', err);
        next(err);
    }
};

exports.updateFavorites = async (req, res, next) => {
    try {
        const item = req.body.item || req.body;
        const action = req.body.action;
        const result = await UserPreferenceService.updateFavorites(req.user.id, req.user.companyId, item, action);
        res.json(result);
    } catch (err) { next(err); }
};

exports.addRecentItem = async (req, res, next) => {
    try {
        const item = req.body.item || req.body;
        const result = await UserPreferenceService.addRecentItem(req.user.id, req.user.companyId, item);
        res.json(result);
    } catch (err) { next(err); }
};

exports.toggleSidebar = async (req, res, next) => {
    try {
        const { collapsed } = req.body;
        const result = await UserPreferenceService.toggleSidebar(req.user.id, collapsed);
        res.json(result);
    } catch (err) { next(err); }
};

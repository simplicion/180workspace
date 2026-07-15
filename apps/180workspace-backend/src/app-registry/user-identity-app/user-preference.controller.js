'use strict';

const { getCache, setCache, delCache } = require('../../system-configs/utils/redis');

exports.getPreferences = async (req, res, next) => {
    try {
        if (!req.prisma) {
            return res.status(500).json({ error: 'Database connection not available.' });
        }

        const cacheKey = `user_preferences:${req.user.id}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        const UserPreference = req.prisma.userPreference;

        let prefs = await UserPreference.findFirst({ where: { userId: req.user.id } });
        if (!prefs) {
            prefs = await UserPreference.create({ data: { userId: req.user.id, favorites: [], recentItems: [] } });
        }

        const responseData = {
            favorites: prefs.favorites || [],
            recentItems: prefs.recentItems || [],
            sidebarCollapsed: prefs.sidebarCollapsed || false
        };

        await setCache(cacheKey, responseData, 600); // cache for 10 minutes

        res.json(responseData);
    } catch (err) {
        console.error('[UserPreference Controller] error:', err);
        next(err);
    }
};

exports.updateFavorites = async (req, res, next) => {
    try {
        const item = req.body.item || req.body;
        const action = req.body.action;

        const UserPreference = req.prisma.userPreference;
        let prefs = await UserPreference.findFirst({ where: { userId: req.user.id } });
        if (!prefs) prefs = await UserPreference.create({ data: { userId: req.user.id, favorites: [], recentItems: [] } });

        let favorites = Array.isArray(prefs.favorites) ? [...prefs.favorites] : [];
        const existsIndex = favorites.findIndex(f => f.recordId === item.recordId && f.type === item.type);

        if (action === 'add' || (!action && existsIndex === -1)) {
            if (existsIndex === -1) favorites.push(item);
        } else if (action === 'remove' || (!action && existsIndex !== -1)) {
            if (existsIndex !== -1) favorites.splice(existsIndex, 1);
        }

        prefs = await UserPreference.update({ 
            where: { id: prefs.id },
            data: { favorites }
        });

        await delCache(`user_preferences:${req.user.id}`);
        await delCache(`init:user:${req.user.id}:company:${req.user.companyId || 'none'}`);

        res.json({ favorites: prefs.favorites });
    } catch (err) { next(err); }
};

exports.addRecentItem = async (req, res, next) => {
    try {
        const item = req.body.item || req.body;
        
        if (!item || !item.recordId) {
            return res.json({ recentItems: [] });
        }

        const UserPreference = req.prisma.userPreference;
        let prefs = await UserPreference.findFirst({ where: { userId: req.user.id } });
        if (!prefs) prefs = await UserPreference.create({ data: { userId: req.user.id, favorites: [], recentItems: [] } });

        let recentItems = Array.isArray(prefs.recentItems) ? [...prefs.recentItems] : [];

        // Remove if already exists (to move to top)
        recentItems = recentItems.filter(f => !(f.recordId === item.recordId && f.type === item.type));

        // Add to front
        recentItems.unshift({ ...item, viewedAt: new Date() });

        // Limit to 20
        if (recentItems.length > 20) {
            recentItems = recentItems.slice(0, 20);
        }

        prefs = await UserPreference.update({
            where: { id: prefs.id },
            data: { recentItems }
        });

        await delCache(`user_preferences:${req.user.id}`);
        await delCache(`init:user:${req.user.id}:company:${req.user.companyId || 'none'}`);

        res.json({ recentItems: prefs.recentItems });
    } catch (err) { next(err); }
};

exports.toggleSidebar = async (req, res, next) => {
    try {
        const { collapsed } = req.body;
        const UserPreference = req.prisma.userPreference;
        let prefs = await UserPreference.findFirst({ where: { userId: req.user.id } });
        if (!prefs) prefs = await UserPreference.create({ data: { userId: req.user.id, favorites: [], recentItems: [] } });
        
        prefs = await UserPreference.update({
            where: { id: prefs.id },
            data: { sidebarCollapsed: collapsed }
        });

        await delCache(`user_preferences:${req.user.id}`);
        
        res.json({ sidebarCollapsed: prefs.sidebarCollapsed });
    } catch (err) { next(err); }
};

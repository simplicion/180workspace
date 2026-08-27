// @ts-nocheck
import { prisma } from '@workspace/db';
import { getCache, setCache, delCache, logAction } from '@workspace/backend-infra';


export class UserPreferenceService {
    static async getPreferences(userId: string) {

        const cacheKey = `user_preferences:${userId}`;
        const cached = await getCache(cacheKey);
        if (cached) return cached;
        
        const UserPreference = prisma.userPreference;

        let prefs = await UserPreference.findFirst({ where: { userId } });
        if (!prefs) {
            prefs = await UserPreference.create({ data: { userId, favorites: [], recentItems: [] } });
        }

        const responseData = {
            favorites: prefs.favorites || [],
            recentItems: prefs.recentItems || [],
            sidebarCollapsed: prefs.sidebarCollapsed || false
        };

        await setCache(cacheKey, responseData, 600); // cache for 10 minutes
        return responseData;
    }

    static async updateFavorites(userId: string, item: any, action: string) {
        const UserPreference = prisma.userPreference;
        let prefs = await UserPreference.findFirst({ where: { userId } });
        if (!prefs) prefs = await UserPreference.create({ data: { userId, favorites: [], recentItems: [] } });

        let favorites = Array.isArray(prefs.favorites) ? [...prefs.favorites] : [];
        const existsIndex = favorites.findIndex((f: any) => f.recordId === item.recordId && f.type === item.type);

        if (action === 'add' || (!action && existsIndex === -1)) {
            if (existsIndex === -1) favorites.push(item);
        } else if (action === 'remove' || (!action && existsIndex !== -1)) {
            if (existsIndex !== -1) favorites.splice(existsIndex, 1);
        }

        prefs = await UserPreference.update({ 
            where: { id: prefs.id },
            data: { favorites }
        });

        await delCache(`user_preferences:${userId}`);
        const companyId = require('@workspace/db').requestContext.getStore()?.companyId;
        await delCache(`init:user:${userId}:company:${companyId || 'none'}`);

        return { favorites: prefs.favorites };
    }

    static async addRecentItem(userId: string, item: any) {
        if (!item || !item.recordId) {
            return { recentItems: [] };
        }

        const UserPreference = prisma.userPreference;
        let prefs = await UserPreference.findFirst({ where: { userId } });
        if (!prefs) prefs = await UserPreference.create({ data: { userId, favorites: [], recentItems: [] } });

        let recentItems = Array.isArray(prefs.recentItems) ? [...prefs.recentItems] : [];

        // Remove if already exists (to move to top)
        recentItems = recentItems.filter((f: any) => !(f.recordId === item.recordId && f.type === item.type));

        // Add to front
        recentItems.unshift({ ...item, viewedAt: new Date().toISOString() });

        // Limit to 20
        if (recentItems.length > 20) {
            recentItems = recentItems.slice(0, 20);
        }

        prefs = await UserPreference.update({
            where: { id: prefs.id },
            data: { recentItems }
        });

        await delCache(`user_preferences:${userId}`);
        const companyId = require('@workspace/db').requestContext.getStore()?.companyId;
        await delCache(`init:user:${userId}:company:${companyId || 'none'}`);

        return { recentItems: prefs.recentItems };
    }

    static async toggleSidebar(userId: string, collapsed: boolean) {
        const UserPreference = prisma.userPreference;
        let prefs = await UserPreference.findFirst({ where: { userId } });
        if (!prefs) prefs = await UserPreference.create({ data: { userId, favorites: [], recentItems: [] } });
        
        prefs = await UserPreference.update({
            where: { id: prefs.id },
            data: { sidebarCollapsed: collapsed }
        });

        await delCache(`user_preferences:${userId}`);
        
        return { sidebarCollapsed: prefs.sidebarCollapsed };
    }
}


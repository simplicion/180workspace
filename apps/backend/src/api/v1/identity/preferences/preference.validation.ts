import { z } from 'zod';

export const PreferenceValidation = {
    updateFavorites: z.object({
        action: z.enum(['add', 'remove']),
        item: z.object({
            id: z.string(),
            name: z.string(),
            type: z.string(),
            url: z.string()
        }).passthrough().optional()
    }).passthrough(),
    addRecentItem: z.object({
        item: z.object({
            id: z.string(),
            name: z.string(),
            type: z.string(),
            url: z.string()
        }).passthrough().optional()
    }).passthrough(),
    toggleSidebar: z.object({
        collapsed: z.boolean()
    })
};

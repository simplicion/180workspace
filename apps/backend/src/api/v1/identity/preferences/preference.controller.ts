import { Request, Response, NextFunction } from 'express';
import { UserPreferenceService } from '@workspace/identity';

export class PreferenceController {
    static async getPreferences(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await UserPreferenceService.getPreferences((req as any).user.id);
            res.json(result);
        } catch (err: any) {
            if (err.message === 'Database connection not available.') return res.status(500).json({ error: err.message });
            console.error('[UserPreference Controller] error:', err);
            next(err);
        }
    }

    static async updateFavorites(req: Request, res: Response, next: NextFunction) {
        try {
            const item = req.body.item || req.body;
            const action = req.body.action;
            const reqUser = (req as any).user;
            const result = await UserPreferenceService.updateFavorites(reqUser.id, reqUser.companyId, item, action);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async addRecentItem(req: Request, res: Response, next: NextFunction) {
        try {
            const item = req.body.item || req.body;
            const reqUser = (req as any).user;
            const result = await UserPreferenceService.addRecentItem(reqUser.id, reqUser.companyId, item);
            res.json(result);
        } catch (err) { next(err); }
    }

    static async toggleSidebar(req: Request, res: Response, next: NextFunction) {
        try {
            const { collapsed } = req.body;
            const result = await UserPreferenceService.toggleSidebar((req as any).user.id, collapsed);
            res.json(result);
        } catch (err) { next(err); }
    }
}

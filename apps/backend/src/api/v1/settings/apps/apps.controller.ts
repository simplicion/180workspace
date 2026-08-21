import { Request, Response, NextFunction } from 'express';
import { AppConfigService } from '@workspace/settings';

export class AppsController {
    static async getConfig(req: Request, res: Response, next: NextFunction) {
        try {
            const config = await AppConfigService.getAppConfig();
            res.json({ config });
        } catch (err) {
            next(err);
        }
    }

    static async updateConfig(req: Request, res: Response, next: NextFunction) {
        try {
            const config = await AppConfigService.updateAppConfig(req.body);
            res.json({ config, message: 'Application config updated successfully' });
        } catch (err) {
            next(err);
        }
    }
}

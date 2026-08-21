import { Request, Response, NextFunction } from 'express';
import { PlatformSettingsService } from '@workspace/platform-admin';

export const get = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await PlatformSettingsService.getSettings();
        res.json({ settings });
    } catch (err: any) {
  next(err);
}
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const updatedSettings = await PlatformSettingsService.updateSettings(req.body);
        res.json({ settings: updatedSettings, message: 'Settings updated' });
    } catch (err: any) {
  next(err);
}
};

export const toggleMaintenance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const updatedSettings = await PlatformSettingsService.toggleMaintenance();
        res.json({ maintenanceMode: updatedSettings.maintenanceMode, message: `Maintenance mode ${updatedSettings.maintenanceMode ? 'enabled' : 'disabled'}` });
    } catch (err: any) {
  next(err);
}
};

export const testDbConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await PlatformSettingsService.testDbConnection();
        res.json({ message: 'Connection established successfully' });
    } catch (err: any) {
  next(err);
}
};

export const testEmailConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await PlatformSettingsService.testEmailConnection(req.body);
        res.json({ message: 'Test email sent successfully! Please check your inbox.' });
    } catch (error: any) {
  next(error);
}
};

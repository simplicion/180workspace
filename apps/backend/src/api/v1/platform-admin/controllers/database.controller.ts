import { Request, Response, NextFunction } from 'express';
import { PlatformDatabaseService } from '@workspace/platform-admin';

export const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const databases = await PlatformDatabaseService.listDatabases();
        res.json({ databases });
    } catch (err: any) {
  next(err);
}
};

export const testConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await PlatformDatabaseService.testConnection();
        res.json({ status: 'healthy', message: 'Connection successful' });
    } catch (err: any) {
  res.json({ status: 'error', message: err.message || 'Failed to connect' });
  next(err);
}
};

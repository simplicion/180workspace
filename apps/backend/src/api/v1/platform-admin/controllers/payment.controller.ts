import { Request, Response, NextFunction } from 'express';
import { PlatformPaymentService } from '@workspace/platform-admin';

export const getConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await PlatformPaymentService.getConfig();
        res.json(result);
    } catch (err: any) {
  next(err);
}
};

export const updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await PlatformPaymentService.updateConfig(req.body);
        res.json({ message: 'Payment config updated' });
    } catch (err: any) {
  next(err);
}
};

export const testConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await PlatformPaymentService.testConnection();
        res.json(result);
    } catch (err: any) {
  res.json({ connected: false, message: err.message });
  next(err);
}
};

import { Request, Response, NextFunction } from 'express';
import { PlatformSubscriptionService } from '@workspace/platform-admin';

export const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = '1', limit = '20', status } = req.query;
        const result = await PlatformSubscriptionService.list(Number(page), Number(limit), status as string);
        res.json(result);
    } catch (err: any) {
  next(err);
}
};

export const cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sub = await PlatformSubscriptionService.cancel(req.params.id, req.body.reason);
        res.json({ message: 'Subscription cancelled', subscription: sub });
    } catch (err: any) {
  next(err);
}
};

export const forceRenew = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sub = await PlatformSubscriptionService.forceRenew(req.params.id);
        res.json({ message: 'Subscription renewed', subscription: sub });
    } catch (err: any) {
  next(err);
}
};

export const refund = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sub = await PlatformSubscriptionService.refund(req.params.id);
        res.json({ message: 'Subscription marked as refunded', subscription: sub });
    } catch (err: any) {
  next(err);
}
};

export const getHistoryByCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const subscriptions = await PlatformSubscriptionService.getHistoryByCompany(req.params.id);
        res.json({ subscriptions });
    } catch (err: any) {
  next(err);
}
};

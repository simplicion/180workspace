import { Request, Response, NextFunction } from 'express';
import { PlatformCouponService } from '@workspace/platform-admin';

export const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const coupons = await PlatformCouponService.list();
        res.json({ coupons });
    } catch (err: any) {
  next(err);
}
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const coupon = await PlatformCouponService.create(req.body, (req as any).superAdmin.id);
        res.status(201).json({ coupon });
    } catch (err: any) {
  next(err);
}
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const coupon = await PlatformCouponService.update(req.params.id, req.body);
        res.json({ coupon });
    } catch (err: any) {
  next(err);
}
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await PlatformCouponService.remove(req.params.id);
        res.json({ message: 'Coupon deleted' });
    } catch (err: any) {
  next(err);
}
};

export const toggle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const coupon = await PlatformCouponService.toggle(req.params.id);
        res.json({ coupon });
    } catch (err: any) {
  next(err);
}
};

export const validate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await PlatformCouponService.validate(req.params.code);
        res.json(result);
    } catch (err: any) {
  next(err);
}
};

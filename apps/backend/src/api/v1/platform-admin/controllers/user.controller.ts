import { Request, Response, NextFunction } from 'express';
import { PlatformUserService } from '@workspace/platform-admin';

export const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = '1', limit = '50', search = '', role } = req.query;
        const result = await PlatformUserService.list(Number(page), Number(limit), search as string, role as string);
        res.json(result);
    } catch (err: any) {
  next(err);
}
};

export const suspend = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await PlatformUserService.suspend(req.params.id);
        res.json({ message: 'User suspended' });
    } catch (err: any) {
  next(err);
}
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await PlatformUserService.deleteUser(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err: any) {
  next(err);
}
};

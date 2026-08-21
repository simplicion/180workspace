import { Request, Response, NextFunction } from 'express';
import { PlatformAnnouncementService } from '@workspace/platform-admin';

export const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const announcements = await PlatformAnnouncementService.list();
        res.json({ announcements });
    } catch (err: any) {
  next(err);
}
};

export const listActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const announcements = await PlatformAnnouncementService.listActive();
        res.json({ announcements });
    } catch (err: any) {
  next(err);
}
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const announcement = await PlatformAnnouncementService.create(req.body, (req as any).superAdmin.id);
        res.status(201).json({ announcement });
    } catch (err: any) {
  next(err);
}
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const announcement = await PlatformAnnouncementService.update(req.params.id, req.body);
        res.json({ announcement });
    } catch (err: any) {
  next(err);
}
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await PlatformAnnouncementService.remove(req.params.id);
        res.json({ message: 'Announcement deleted' });
    } catch (err: any) {
  next(err);
}
};

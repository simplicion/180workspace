import { Request, Response, NextFunction } from 'express';
import { ReleaseNoteService } from '@workspace/platform-admin';

export const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const notes = await ReleaseNoteService.list();
        res.json(notes);
    } catch (error: any) {
  next(error);
}
};

export const listPublished = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const notes = await ReleaseNoteService.listPublished();
        res.json(notes);
    } catch (error: any) {
  next(error);
}
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const note = await ReleaseNoteService.create(req.body, (req as any).superAdmin.id);
        res.status(201).json(note);
    } catch (error: any) {
  next(error);
}
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const note = await ReleaseNoteService.update(req.params.id, req.body);
        res.json(note);
    } catch (error: any) {
  next(error);
}
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await ReleaseNoteService.remove(req.params.id);
        res.json({ message: 'Release note deleted' });
    } catch (error: any) {
  next(error);
}
};

import { Request, Response, NextFunction } from 'express';
import { PlatformPlanService } from '@workspace/platform-admin';

export const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const plans = await PlatformPlanService.list();
        res.json({ plans });
    } catch (err: any) {
  next(err);
}
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {

    return res.status(403).json({ error: 'Plan modification is disabled. Pricing is managed via codebase for stability.' });

  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {

    return res.status(403).json({ error: 'Plan modification is disabled. Pricing is managed via codebase for stability.' });

  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {

    return res.status(403).json({ error: 'Plan deletion is disabled. Pricing is managed via codebase for stability.' });

  } catch (error) {
    next(error);
  }
};

export const toggleActive = async (req: Request, res: Response, next: NextFunction) => {
  try {

    return res.status(403).json({ error: 'Toggling plan status is disabled. Pricing is managed via codebase for stability.' });

  } catch (error) {
    next(error);
  }
};

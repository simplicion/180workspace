import { Request, Response, NextFunction } from 'express';
import { FormsService } from '@workspace/advertising';

export const createForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = (req as any).user.companyId;
    const form = await FormsService.createForm(companyId, req.body);

    res.status(201).json({
      status: 'success',
      data: { form }
    });
  } catch (error) { next(error); }
};

export const getForms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = (req as any).user.companyId;
    const forms = await FormsService.getForms(companyId);

    res.status(200).json({
      status: 'success',
      results: forms.length,
      data: { forms }
    });
  } catch (error) { next(error); }
};

export const getForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = (req as any).user.companyId;
    const form = await FormsService.getFormById(companyId, req.params.id);

    res.status(200).json({
      status: 'success',
      data: { form }
    });
  } catch (error: any) {
    if (error.message === 'No form found with that ID') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

export const updateForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = (req as any).user.companyId;
    const form = await FormsService.updateForm(companyId, req.params.id, req.body);

    res.status(200).json({
      status: 'success',
      data: { form }
    });
  } catch (error: any) {
    if (error.message === 'No form found with that ID') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

export const deleteForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = (req as any).user.companyId;
    await FormsService.deleteForm(companyId, req.params.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error: any) {
    if (error.message === 'No form found with that ID') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

export const getFormSubmissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = (req as any).user.companyId;
    const submissions = await FormsService.getFormSubmissions(companyId, req.params.id);

    res.status(200).json({
      status: 'success',
      results: submissions.length,
      data: { submissions }
    });
  } catch (error: any) {
    if (error.message === 'No form found with that ID') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

import { Request, Response, NextFunction } from 'express';
import { FormsService } from '@workspace/advertising';

export const createForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await FormsService.createForm(req.body);

    res.status(201).json({
      status: 'success',
      data: { form }
    });
  } catch (error) { next(error); }
};

export const getForms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forms = await FormsService.getForms();

    res.status(200).json({
      status: 'success',
      results: forms.length,
      data: { forms }
    });
  } catch (error) { next(error); }
};

export const getForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await FormsService.getFormById(req.params.id);

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
    const form = await FormsService.updateForm(req.params.id, req.body);

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
    await FormsService.deleteForm(req.params.id);

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
    const submissions = await FormsService.getFormSubmissions(req.params.id);

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

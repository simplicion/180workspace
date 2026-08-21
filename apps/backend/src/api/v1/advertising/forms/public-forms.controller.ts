import { Request, Response, NextFunction } from 'express';
import { FormsService } from '@workspace/advertising';

export const getFormBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await FormsService.getFormBySlug(req.params.slug);
    res.status(200).json({
      success: true,
      data: { form }
    });
  } catch (error: any) {
    if (error.message === 'Form not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'This form is currently inactive') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

export const submitForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const submission = await FormsService.submitForm(req.params.slug, req.body.values);
    res.status(201).json({
      success: true,
      data: {
        message: 'Form submitted successfully',
        submissionId: submission.id
      }
    });
  } catch (error: any) {
    if (error.message === 'Invalid submission format' || error.message.startsWith('Missing required fields')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Form not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'This form is currently inactive') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

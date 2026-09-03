import { Request, Response, NextFunction } from 'express';
import { FormsService } from '@workspace/advertising';

export const createForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = (req as any).user?.companyId || req.body.companyId;
    const form = await FormsService.createForm({
      ...req.body,
      companyId
    });

    res.status(201).json({
      status: 'success',
      data: { form }
    });
  } catch (error) { next(error); }
};

export const getForms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = (req as any).user?.companyId;
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

export const regenerateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = await FormsService.regenerateApiKey(req.params.id);

    res.status(200).json({
      status: 'success',
      data: { apiKey }
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

export const exportSubmissionsCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename, csv } = await FormsService.exportSubmissionsCsv(req.params.id);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error: any) {
    if (error.message === 'No form found with that ID') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

export const deleteSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await FormsService.deleteSubmission(req.params.submissionId);

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    if (error.message === 'Submission not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

export const bulkDeleteSubmissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { submissionIds } = req.body;
    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of submissionIds to delete' });
    }

    const result = await FormsService.deleteSubmissions(submissionIds);

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    next(error);
  }
};

export const deleteAllSubmissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await FormsService.deleteAllSubmissions(req.params.id);

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    if (error.message === 'No form found with that ID') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

export const updateSubmissionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Please provide a valid status string' });
    }

    const result = await FormsService.updateSubmissionStatus(req.params.submissionId, status);

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    if (error.message === 'Submission not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

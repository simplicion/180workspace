import { Request, Response, NextFunction } from 'express';
import { FormsService } from '@workspace/advertising';

export const getFormBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isViewEvent = req.query.view !== 'false';
    const form = await FormsService.getFormBySlug(req.params.slug, isViewEvent);
    res.status(200).json({
      success: true,
      data: { 
        form: {
          ...form,
          settings: form?.settings || {}
        }
      }
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
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || (req.body.referrer as string) || '';

    const result = await FormsService.submitForm(req.params.slug, req.body.values, {
      ipAddress,
      userAgent,
      referrer
    });

    res.status(201).json({
      success: true,
      data: {
        message: result.successMessage || 'Form submitted successfully',
        submissionId: result.submissionId,
        redirectUrl: result.redirectUrl,
        pixelEventName: result.pixelEventName
      }
    });
  } catch (error: any) {
    if (error.message === 'Form not found') {
      return res.status(404).json({ error: error.message });
    }
    // Return 400 for duplicate submissions, missing required fields, or validation failures
    return res.status(400).json({ 
      success: false,
      error: error.message || 'Failed to process submission' 
    });
  }
};

/**
 * External REST API Endpoint for Custom CRMs and Websites
 * Example: GET /api/public/forms/:idOrSlug/api/submissions?apiKey=fkey_...
 */
export const getFormSubmissionsApi = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = (req.headers['x-api-key'] as string) || (req.query.apiKey as string);
    const { page, limit, since } = req.query;

    const data = await FormsService.getFormSubmissionsByApiKey(
      req.params.idOrSlug,
      apiKey,
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        since: since as string
      }
    );

    res.status(200).json({
      success: true,
      ...data
    });
  } catch (error: any) {
    if (error.message === 'Invalid or missing API key' || error.message.includes('Unauthorized')) {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Headless Data Ingestion & Auto-Discovery Capture Endpoint
 * Accepts: JSON or URL-encoded form POST (from HTML forms, Webflow, React, Framer, mobile apps)
 * Example: POST /api/public/capture/:slug
 */
export const captureHeadlessSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug || req.params.idOrSlug;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || (req.body._referrer as string) || '';
    const origin = req.headers['origin'] || '';

    // Extract payload: support both raw req.body and nested values (if client wrapped in { values: ... })
    const payload = req.body.values && typeof req.body.values === 'object' ? { ...req.body.values, ...req.body } : req.body;

    const result = await FormsService.ingestHeadlessSubmission(slug, payload, {
      ipAddress,
      userAgent,
      referrer,
      origin: typeof origin === 'string' ? origin : undefined
    });

    const acceptsJson = req.xhr || 
      (req.headers['accept'] && req.headers['accept'].includes('application/json')) ||
      (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));

    // If client requested JSON response or AJAX fetch
    if (acceptsJson || !result.redirectUrl) {
      return res.status(201).json({
        success: true,
        data: {
          message: result.successMessage,
          submissionId: result.submissionId,
          formCode: result.formCode,
          dealId: result.dealId,
          redirectUrl: result.redirectUrl,
          pixelEventName: result.pixelEventName
        }
      });
    }

    // Standard HTML form submission with redirect
    return res.redirect(303, result.redirectUrl);
  } catch (error: any) {
    if (error.message.includes('not authorized') || error.message.includes('Domain origin')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message === 'Endpoint not found' || error.message === 'Form not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'This endpoint is currently inactive') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};


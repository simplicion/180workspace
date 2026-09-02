import { Router } from 'express';
import * as publicFormsController from './public-forms.controller';

const router = Router();

router.route('/:slug')
  .get(publicFormsController.getFormBySlug);

router.route('/:slug/submit')
  .post(publicFormsController.submitForm);

// Headless Data Ingestion & Form Capture Endpoints
router.route('/capture/:slug')
  .post(publicFormsController.captureHeadlessSubmission);

router.route('/:slug/capture')
  .post(publicFormsController.captureHeadlessSubmission);

// External REST API for Custom CRMs and External Webhooks
router.route('/:idOrSlug/submissions')
  .get(publicFormsController.getFormSubmissionsApi);

router.route('/:idOrSlug/api/submissions')
  .get(publicFormsController.getFormSubmissionsApi);

export default router;

import { Router } from 'express';
import * as formBuilderController from './form-builder.controller';

const router = Router();

router.route('/')
  .get(formBuilderController.getForms)
  .post(formBuilderController.createForm);

router.route('/:id')
  .get(formBuilderController.getForm)
  .patch(formBuilderController.updateForm)
  .delete(formBuilderController.deleteForm);

router.route('/:id/api-key/regenerate')
  .post(formBuilderController.regenerateApiKey);

router.route('/:id/submissions')
  .get(formBuilderController.getFormSubmissions);

router.route('/:id/export/csv')
  .get(formBuilderController.exportSubmissionsCsv);

export default router;

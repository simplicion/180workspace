import { Router } from 'express';
import * as publicFormsController from './public-forms.controller';

const router = Router();

router.route('/:slug')
  .get(publicFormsController.getFormBySlug);

router.route('/:slug/submit')
  .post(publicFormsController.submitForm);

export default router;

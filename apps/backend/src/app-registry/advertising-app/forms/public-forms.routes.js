const express = require('express');
const publicFormsController = require('./public-forms.controller');
const router = express.Router();

router.route('/:slug')
  .get(publicFormsController.getFormBySlug);

router.route('/:slug/submit')
  .post(publicFormsController.submitForm);

module.exports = router;

const express = require('express');
const formBuilderController = require('./form-builder.controller');
const router = express.Router();

router.route('/')
  .get(formBuilderController.getForms)
  .post(formBuilderController.createForm);

router.route('/:id')
  .get(formBuilderController.getForm)
  .patch(formBuilderController.updateForm)
  .delete(formBuilderController.deleteForm);

router.route('/:id/submissions')
  .get(formBuilderController.getFormSubmissions);

module.exports = router;

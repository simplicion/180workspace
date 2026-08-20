'use strict';

const { FormsService } = require('@workspace/advertising');
const catchAsync = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const ApiError = require('../../../system-configs/utils/ApiError');
class AppError extends ApiError { constructor(message, statusCode) { super(statusCode, message); } }

exports.createForm = catchAsync(async (req, res, next) => {
  const companyId = req.user.companyId;
  const form = await FormsService.createForm(companyId, req.body);

  res.status(201).json({
    status: 'success',
    data: { form }
  });
});

exports.getForms = catchAsync(async (req, res, next) => {
  const companyId = req.user.companyId;
  const forms = await FormsService.getForms(companyId);

  res.status(200).json({
    status: 'success',
    results: forms.length,
    data: { forms }
  });
});

exports.getForm = catchAsync(async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const form = await FormsService.getFormById(companyId, req.params.id);

    res.status(200).json({
      status: 'success',
      data: { form }
    });
  } catch (error) {
    if (error.message === 'No form found with that ID') {
      return next(new AppError(error.message, 404));
    }
    next(error);
  }
});

exports.updateForm = catchAsync(async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const form = await FormsService.updateForm(companyId, req.params.id, req.body);

    res.status(200).json({
      status: 'success',
      data: { form }
    });
  } catch (error) {
    if (error.message === 'No form found with that ID') {
      return next(new AppError(error.message, 404));
    }
    next(error);
  }
});

exports.deleteForm = catchAsync(async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    await FormsService.deleteForm(companyId, req.params.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    if (error.message === 'No form found with that ID') {
      return next(new AppError(error.message, 404));
    }
    next(error);
  }
});

exports.getFormSubmissions = catchAsync(async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const submissions = await FormsService.getFormSubmissions(companyId, req.params.id);

    res.status(200).json({
      status: 'success',
      results: submissions.length,
      data: { submissions }
    });
  } catch (error) {
    if (error.message === 'No form found with that ID') {
      return next(new AppError(error.message, 404));
    }
    next(error);
  }
});

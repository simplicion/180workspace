const { FormsService } = require('@workspace/advertising');
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const ApiError = require('../../../system-configs/utils/ApiError');
class ErrorResponse extends ApiError { constructor(message, statusCode) { super(statusCode, message); } }

// @desc    Get form by slug for public display
// @route   GET /api/v1/public/forms/:slug
// @access  Public
exports.getFormBySlug = asyncHandler(async (req, res, next) => {
  try {
    const form = await FormsService.getFormBySlug(req.params.slug);
    res.status(200).json({
      success: true,
      data: { form }
    });
  } catch (error) {
    if (error.message === 'Form not found') {
      return next(new ErrorResponse(error.message, 404));
    }
    if (error.message === 'This form is currently inactive') {
      return next(new ErrorResponse(error.message, 400));
    }
    next(error);
  }
});

// @desc    Submit a form
// @route   POST /api/v1/public/forms/:slug/submit
// @access  Public
exports.submitForm = asyncHandler(async (req, res, next) => {
  try {
    const submission = await FormsService.submitForm(req.params.slug, req.body.values);
    res.status(201).json({
      success: true,
      data: {
        message: 'Form submitted successfully',
        submissionId: submission.id
      }
    });
  } catch (error) {
    if (error.message === 'Invalid submission format' || error.message.startsWith('Missing required fields')) {
      return next(new ErrorResponse(error.message, 400));
    }
    if (error.message === 'Form not found') {
      return next(new ErrorResponse(error.message, 404));
    }
    if (error.message === 'This form is currently inactive') {
      return next(new ErrorResponse(error.message, 400));
    }
    next(error);
  }
});

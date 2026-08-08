'use strict';

const { prisma: globalPrisma } = require('@workspace/db');
const catchAsync = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const ApiError = require('../../../system-configs/utils/ApiError');
class AppError extends ApiError { constructor(message, statusCode) { super(statusCode, message); } }

exports.createForm = catchAsync(async (req, res, next) => {
  const prisma = req.prisma || globalPrisma;
  const { title, description, fields } = req.body;
  const companyId = req.user.companyId;

  // Generate a unique slug based on title + short random string
  const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const slug = `${baseSlug}-${randomSuffix}`;

  const form = await prisma.form.create({
    data: {
      title,
      description,
      slug,
      companyId,
      fields: {
        create: (fields || []).map((field, index) => ({
          label: field.label,
          type: field.type,
          required: field.required || false,
          options: field.options || null,
          order: index,
          mapping: field.mapping || null
        }))
      }
    },
    include: {
      fields: true
    }
  });

  res.status(201).json({
    status: 'success',
    data: { form }
  });
});

exports.getForms = catchAsync(async (req, res, next) => {
  const prisma = req.prisma || globalPrisma;
  const companyId = req.user.companyId;

  const forms = await prisma.form.findMany({
    where: { companyId },
    include: {
      _count: {
        select: { submissions: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  require('fs').writeFileSync(require('path').join(__dirname, '../../../../debug-getforms.txt'), `companyId: ${companyId}, forms: ${forms.length}\n`, {flag: 'a'});


  res.status(200).json({
    status: 'success',
    results: forms.length,
    data: { forms }
  });
});

exports.getForm = catchAsync(async (req, res, next) => {
  const prisma = req.prisma || globalPrisma;
  const form = await prisma.form.findFirst({
    where: { 
      id: req.params.id,
      companyId: req.user.companyId
    },
    include: {
      fields: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!form) {
    return next(new AppError('No form found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { form }
  });
});

exports.updateForm = catchAsync(async (req, res, next) => {
  const prisma = req.prisma || globalPrisma;
  const { title, description, isActive, fields } = req.body;
  const companyId = req.user.companyId;

  const existingForm = await prisma.form.findFirst({
    where: { id: req.params.id, companyId }
  });

  if (!existingForm) {
    return next(new AppError('No form found with that ID', 404));
  }

  // To update fields, delete all existing and recreate them
  const updatedForm = await prisma.$transaction(async (tx) => {
    if (fields) {
      await tx.formField.deleteMany({
        where: { formId: req.params.id }
      });
    }

    return await tx.form.update({
      where: { id: req.params.id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        ...(fields && {
          fields: {
            create: fields.map((field, index) => ({
              label: field.label,
              type: field.type,
              required: field.required || false,
              options: field.options || null,
              order: index,
              mapping: field.mapping || null
            }))
          }
        })
      },
      include: {
        fields: {
          orderBy: { order: 'asc' }
        }
      }
    });
  });

  res.status(200).json({
    status: 'success',
    data: { form: updatedForm }
  });
});

exports.deleteForm = catchAsync(async (req, res, next) => {
  const prisma = req.prisma || globalPrisma;
  const companyId = req.user.companyId;

  const form = await prisma.form.findFirst({
    where: { id: req.params.id, companyId }
  });

  if (!form) {
    return next(new AppError('No form found with that ID', 404));
  }

  await prisma.form.delete({
    where: { id: form.id }
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getFormSubmissions = catchAsync(async (req, res, next) => {
  const prisma = req.prisma || globalPrisma;
  const companyId = req.user.companyId;

  const form = await prisma.form.findFirst({
    where: { id: req.params.id, companyId }
  });

  if (!form) {
    return next(new AppError('No form found with that ID', 404));
  }

  const submissions = await prisma.formSubmission.findMany({
    where: { formId: form.id },
    include: {
      values: {
        include: {
          field: true
        }
      }
    },
    orderBy: { submittedAt: 'desc' }
  });

  res.status(200).json({
    status: 'success',
    results: submissions.length,
    data: { submissions }
  });
});

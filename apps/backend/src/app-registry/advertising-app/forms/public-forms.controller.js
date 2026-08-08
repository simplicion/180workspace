const { prisma } = require('@workspace/db');
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const ApiError = require('../../../system-configs/utils/ApiError');
class ErrorResponse extends ApiError { constructor(message, statusCode) { super(statusCode, message); } }
// You might want to import sendEmail utility here depending on the existing email infrastructure
// const { sendEmail } = require('../../../utils/email');

// @desc    Get form by slug for public display
// @route   GET /api/v1/public/forms/:slug
// @access  Public
exports.getFormBySlug = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;

  const form = await prisma.form.findUnique({
    where: { slug },
    include: {
      fields: {
        orderBy: { order: 'asc' }
      },
      company: {
        select: {
          id: true,
          name: true,
          logo: true,
          primaryColor: true
        }
      }
    }
  });

  if (!form) {
    return next(new ErrorResponse('Form not found', 404));
  }

  if (!form.isActive) {
    return next(new ErrorResponse('This form is currently inactive', 400));
  }

  res.status(200).json({
    success: true,
    data: { form }
  });
});

// @desc    Submit a form
// @route   POST /api/v1/public/forms/:slug/submit
// @access  Public
exports.submitForm = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;
  const { values } = req.body; // e.g., { fieldId_or_name: value }

  if (!values || typeof values !== 'object') {
    return next(new ErrorResponse('Invalid submission format', 400));
  }

  const form = await prisma.form.findUnique({
    where: { slug },
    include: { fields: true }
  });

  if (!form) {
    return next(new ErrorResponse('Form not found', 404));
  }

  if (!form.isActive) {
    return next(new ErrorResponse('This form is currently inactive', 400));
  }

  // Validate required fields
  const missingFields = [];
  form.fields.forEach(field => {
    if (field.required) {
      const val = values[field.id] || values[field.name];
      if (val === undefined || val === null || val === '') {
        missingFields.push(field.label);
      }
    }
  });

  if (missingFields.length > 0) {
    return next(new ErrorResponse(`Missing required fields: ${missingFields.join(', ')}`, 400));
  }

  // Save submission
  const submissionValues = form.fields.map(field => {
    const val = values[field.id] || values[field.name] || '';
    return {
      fieldId: field.id,
      value: String(val)
    };
  });

  // Transaction to ensure submission and values are saved together
  const submission = await prisma.formSubmission.create({
    data: {
      formId: form.id,
      companyId: form.companyId,
      values: {
        create: submissionValues
      }
    },
    include: {
      values: true
    }
  });

  // Extract email/name/phone if present for CRM Lead creation (Phase 9 integration)
  const leadData = {
    email: '',
    name: '',
    phone: '',
    source: `Form: ${form.title}`
  };

  form.fields.forEach(field => {
    const val = values[field.id] || values[field.name];
    if (!val) return;
    
    // Simple heuristics to map fields to lead data
    if (field.type === 'EMAIL' || field.name.toLowerCase().includes('email') || field.label.toLowerCase().includes('email')) {
      leadData.email = leadData.email || val;
    } else if (field.type === 'PHONE' || field.name.toLowerCase().includes('phone') || field.label.toLowerCase().includes('phone')) {
      leadData.phone = leadData.phone || val;
    } else if (field.name.toLowerCase().includes('name') || field.label.toLowerCase().includes('name')) {
      leadData.name = leadData.name ? `${leadData.name} ${val}` : val;
    }
  });

  // Phase 9: CRM Integration (If we have basic info, create a lead/client if needed)
  if (leadData.name || leadData.email || leadData.phone) {
    try {
      // Very basic lead/client creation logic here. 
      // Ideally, check if client already exists by email/phone.
      let client = leadData.email ? await prisma.client.findFirst({
        where: { 
          companyId: form.companyId,
          email: leadData.email
        }
      }) : null;

      if (!client) {
        client = await prisma.client.create({
          data: {
            companyId: form.companyId,
            name: leadData.name || 'Unknown Contact',
            email: leadData.email || null,
            phone: leadData.phone || null,
            clientType: 'PROSPECT',
            status: 'NEW',
            source: leadData.source
          }
        });
      }

      // Create a Lead for this submission
      const lead = await prisma.lead.create({
        data: {
          title: `New Inquiry from ${form.title}`,
          contactName: leadData.name || null,
          contactEmail: leadData.email || null,
          contactPhone: leadData.phone || null,
          source: leadData.source,
          stage: 'Lead',
          pipelineType: 'DEAL',
          clientId: client.id
        }
      });

      // Update the submission with the linked CRM entities
      await prisma.formSubmission.update({
        where: { id: submission.id },
        data: {
          clientId: client.id,
          leadId: lead.id
        }
      });
    } catch (crmError) {
      console.error('Failed to create CRM lead from form submission:', crmError);
      // We don't fail the submission if CRM integration fails
    }
  }

  // Automated Email Notifications
  try {
    // 1. Notify company admins/hr/sales about the new submission
    const usersToNotify = await prisma.user.findMany({
      where: {
        companyId: form.companyId,
        role: { in: ['admin', 'manager', 'sales', 'hr'] } // adjust according to actual roles
      },
      select: { email: true }
    });

    const emails = usersToNotify.map(u => u.email).filter(e => e);
    
    if (emails.length > 0) {
      console.log(`Sending email notification to ${emails.join(', ')} about new submission for ${form.title}`);
      // if (sendEmail) {
      //   await sendEmail({
      //     email: emails.join(','),
      //     subject: `New Form Submission: ${form.title}`,
      //     message: `You have received a new submission for the form "${form.title}".\n\nPlease log in to view the details.`
      //   });
      // }
    }

    // 2. Notify the submitter if they provided an email (Auto-responder)
    if (leadData.email) {
      console.log(`Sending auto-responder email to ${leadData.email}`);
      // if (sendEmail) {
      //   await sendEmail({
      //     email: leadData.email,
      //     subject: `Thank you for contacting us`,
      //     message: `Hello ${leadData.name || ''},\n\nWe have received your submission for "${form.title}" and will get back to you shortly.\n\nThank you!`
      //   });
      // }
    }
  } catch (emailError) {
    console.error('Failed to send email notifications:', emailError);
  }

  res.status(201).json({
    success: true,
    data: {
      message: 'Form submitted successfully',
      submissionId: submission.id
    }
  });
});

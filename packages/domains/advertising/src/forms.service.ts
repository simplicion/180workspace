import { prisma } from '@workspace/db';

export class FormsService {
  static async createForm(companyId: string, data: { title: string; description: string; fields: any[] }) {
    const { title, description, fields } = data;

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

    return form;
  }

  static async getForms(companyId: string) {
    const forms = await prisma.form.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return forms;
  }

  static async getFormById(companyId: string, id: string) {
    const form = await prisma.form.findFirst({
      where: { 
        id,
        companyId
      },
      include: {
        fields: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!form) {
      throw new Error('No form found with that ID');
    }

    return form;
  }

  static async updateForm(companyId: string, id: string, data: { title?: string; description?: string; isActive?: boolean; fields?: any[] }) {
    const { title, description, isActive, fields } = data;

    const existingForm = await prisma.form.findFirst({
      where: { id, companyId }
    });

    if (!existingForm) {
      throw new Error('No form found with that ID');
    }

    // To update fields, delete all existing and recreate them
    const updatedForm = await prisma.$transaction(async (tx) => {
      if (fields) {
        await tx.formField.deleteMany({
          where: { formId: id }
        });
      }

      return await tx.form.update({
        where: { id },
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

    return updatedForm;
  }

  static async deleteForm(companyId: string, id: string) {
    const form = await prisma.form.findFirst({
      where: { id, companyId }
    });

    if (!form) {
      throw new Error('No form found with that ID');
    }

    await prisma.form.delete({
      where: { id: form.id }
    });

    return true;
  }

  static async getFormSubmissions(companyId: string, id: string) {
    const form = await prisma.form.findFirst({
      where: { id, companyId }
    });

    if (!form) {
      throw new Error('No form found with that ID');
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

    return submissions;
  }

  // --- Public Methods ---

  static async getFormBySlug(slug: string) {
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
            logoUrl: true
          }
        }
      }
    });

    if (!form) {
      throw new Error('Form not found');
    }

    if (!form.isActive) {
      throw new Error('This form is currently inactive');
    }

    return form;
  }

  static async submitForm(slug: string, values: Record<string, any>) {
    if (!values || typeof values !== 'object') {
      throw new Error('Invalid submission format');
    }

    const form = await prisma.form.findUnique({
      where: { slug },
      include: { fields: true }
    });

    if (!form) {
      throw new Error('Form not found');
    }

    if (!form.isActive) {
      throw new Error('This form is currently inactive');
    }

    // Validate required fields
    const missingFields: string[] = [];
    form.fields.forEach(field => {
      if (field.required) {
        const val = values[field.id] || (field.mapping && values[field.mapping]);
        if (val === undefined || val === null || val === '') {
          missingFields.push(field.label);
        }
      }
    });

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Save submission
    const submissionValues = form.fields.map(field => {
      const val = values[field.id] || (field.mapping && values[field.mapping]) || '';
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
      const val = values[field.id] || (field.mapping && values[field.mapping]);
      if (!val) return;
      
      // Simple heuristics to map fields to lead data
      if (field.type === 'EMAIL' || (field.mapping && field.mapping.toLowerCase().includes('email')) || (field.label && field.label.toLowerCase().includes('email'))) {
        leadData.email = leadData.email || val;
      } else if (field.type === 'PHONE' || (field.mapping && field.mapping.toLowerCase().includes('phone')) || (field.label && field.label.toLowerCase().includes('phone'))) {
        leadData.phone = leadData.phone || val;
      } else if ((field.mapping && field.mapping.toLowerCase().includes('name')) || (field.label && field.label.toLowerCase().includes('name'))) {
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
              leadSource: leadData.source
            }
          });
        }

        // Create a Lead for this submission
        const lead = await prisma.lead.create({
          data: {
            title: `New Inquiry from ${form.title}`,
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

    return submission;
  }
}

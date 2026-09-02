import { prisma } from '@workspace/db';
import crypto from 'crypto';
import axios from 'axios';

export interface SalesSettings {
  isSalesActivity?: boolean;
  targetStage?: string; // 'Lead' | 'Contacted' | 'Qualified' | 'Demo' | 'Proposal'
  defaultDealValue?: number;
  assignedSalesRepId?: string;
  autoCreateActivity?: boolean;
  tagLabel?: string;
}

export interface FormPage {
  id: string; // e.g., "page_1", "page_2"
  title: string; // e.g., "Step 1: Basic Information"
  description?: string; // e.g., "Tell us about yourself"
  order: number; // 0, 1, 2...
}

export interface FormSettings {
  buttonColor?: string;
  buttonTextColor?: string;
  submitButtonText?: string;
  backgroundColor?: string;
  backgroundType?: 'color' | 'image' | 'default';
  backgroundImage?: string;
  redirectUrl?: string;
  pixelEventName?: string; // e.g. "Lead", "CompleteRegistration", "CustomEvent"
  webhookUrl?: string;
  notificationEmails?: string[]; // e.g. ["sales@company.com", "alerts@agency.com"]
  customCss?: string;
  successMessage?: string;
  showCompanyLogo?: boolean;
  salesSettings?: SalesSettings;
  isSalesActivity?: boolean;
  allowedDomains?: string[]; // Origin whitelist for Headless Endpoints
  honeypotField?: string; // Custom honeypot field name (e.g. "_gotcha")
  isHeadless?: boolean; // Headless data capture endpoint mode
  pages?: FormPage[]; // Multi-step / Multi-page form sections
}

export class FormsService {
  private static formCache: Map<string, { form: any; cachedAt: number }> = new Map();

  /**
   * Invalidate cached form instances on updates or deletions
   */
  public static invalidateFormCache(identifier?: string) {
    if (identifier) {
      this.formCache.delete(identifier);
      for (const [key, val] of this.formCache.entries()) {
        if (val.form?.id === identifier || val.form?.slug === identifier || val.form?.formCode === identifier) {
          this.formCache.delete(key);
        }
      }
    } else {
      this.formCache.clear();
    }
  }

  /**
   * Fast in-memory cache retrieval for public ingestion endpoints
   */
  public static async getCachedOrFetchForm(identifier: string) {
    const cached = this.formCache.get(identifier);
    if (cached && (Date.now() - cached.cachedAt) < 60000) {
      return cached.form;
    }

    const form = await prisma.form.findFirst({
      where: {
        OR: [
          { slug: identifier },
          { formCode: identifier },
          { id: identifier }
        ]
      },
      include: { fields: true }
    });

    if (form) {
      const entry = { form, cachedAt: Date.now() };
      this.formCache.set(identifier, entry);
      if (form.formCode) this.formCache.set(form.formCode, entry);
      if (form.slug) this.formCache.set(form.slug, entry);
      if (form.id) this.formCache.set(form.id, entry);
    }

    return form;
  }

  /**
   * Helper to generate a cryptographically secure Form API Key
   */
  private static generateApiKey(): string {
    return `fkey_${crypto.randomBytes(20).toString('hex')}`;
  }

  /**
   * Helper to generate a clean, modern, collision-resistant 10-character alphanumeric Form ID.
   * Uses URL-safe, human-friendly characters (lowercase alphanumeric, unambiguous).
   */
  public static generate10CharId(): string {
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    let result = '';
    const bytes = crypto.randomBytes(10);
    for (let i = 0; i < 10; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  }

  public static normalizeKey(key: string): string {
    return String(key || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  public static readonly FIELD_ALIASES: Record<string, string[]> = {
    name: ['name', 'fullname', 'full_name', 'yourname', 'your_name', 'clientname', 'client_name', 'customername', 'customer_name', 'contactname', 'contact_name', 'first_name', 'last_name', 'fname', 'lname'],
    phone: ['phone', 'phonenumber', 'phone_number', 'mobile', 'mobilenumber', 'mobile_number', 'tel', 'whatsapp', 'yourphone', 'your_phone', 'cell', 'contactnumber', 'contact_number'],
    email: ['email', 'useremail', 'user_email', 'workemail', 'work_email', 'youremail', 'your_email', 'emailaddress', 'email_address'],
    company: ['company', 'companyname', 'company_name', 'organization', 'organizationname', 'organization_name', 'businessname', 'business_name'],
    message: ['message', 'comments', 'comment', 'notes', 'note', 'inquiry', 'details', 'description', 'requirement', 'requirements'],
    budget: ['budget', 'dealvalue', 'deal_value', 'amount', 'price', 'cost', 'quantity']
  };

  /**
   * Universal resolution helper: given a field and a values object, attempts:
   * 1. Exact match on field.id, field.mapping, field.name, field.label
   * 2. Normalized string match on field.mapping, field.name, field.label
   * 3. Semantic alias match based on field type or field mapping/label
   */
  public static resolveFieldValueFromObject(field: any, values: Record<string, any>): any {
    if (!values || typeof values !== 'object') return '';

    // 1. Direct / Exact key matches
    if (values[field.id] !== undefined && values[field.id] !== null && values[field.id] !== '') return values[field.id];
    if (field.mapping && values[field.mapping] !== undefined && values[field.mapping] !== null && values[field.mapping] !== '') return values[field.mapping];
    if (field.name && values[field.name] !== undefined && values[field.name] !== null && values[field.name] !== '') return values[field.name];
    if (values[field.label] !== undefined && values[field.label] !== null && values[field.label] !== '') return values[field.label];

    const keys = Object.keys(values);
    if (keys.length === 0) return '';

    // 2. Normalized key matches (ignoring spaces, underscores, dashes, case)
    const fieldMappingNorm = field.mapping ? FormsService.normalizeKey(field.mapping) : '';
    const fieldNameNorm = field.name ? FormsService.normalizeKey(field.name) : '';
    const fieldLabelNorm = field.label ? FormsService.normalizeKey(field.label) : '';

    for (const key of keys) {
      const val = values[key];
      if (val === undefined || val === null || val === '') continue;

      const normKey = FormsService.normalizeKey(key);
      if (
        (fieldMappingNorm && normKey === fieldMappingNorm) ||
        (fieldNameNorm && normKey === fieldNameNorm) ||
        (fieldLabelNorm && normKey === fieldLabelNorm)
      ) {
        return val;
      }
    }

    // 3. Semantic alias matching based on field type and field mapping/label
    const fieldType = (field.type || '').toUpperCase();
    const fieldTag = `${field.mapping || ''} ${field.label || ''} ${field.name || ''}`.toLowerCase();

    let targetCategory: string | null = null;
    if (fieldType === 'EMAIL' || fieldTag.includes('email')) targetCategory = 'email';
    else if (fieldType === 'PHONE' || fieldTag.includes('phone') || fieldTag.includes('mobile') || fieldTag.includes('tel')) targetCategory = 'phone';
    else if (fieldTag.includes('company') || fieldTag.includes('org')) targetCategory = 'company';
    else if (fieldTag.includes('name')) targetCategory = 'name';
    else if (fieldTag.includes('message') || fieldTag.includes('note') || fieldTag.includes('comment') || fieldTag.includes('inquiry')) targetCategory = 'message';
    else if (fieldType === 'NUMBER' || fieldTag.includes('budget') || fieldTag.includes('amount') || fieldTag.includes('price')) targetCategory = 'budget';

    if (targetCategory && FormsService.FIELD_ALIASES[targetCategory]) {
      const aliases = FormsService.FIELD_ALIASES[targetCategory].map(a => FormsService.normalizeKey(a));
      for (const key of keys) {
        const val = values[key];
        if (val === undefined || val === null || val === '') continue;
        const normKey = FormsService.normalizeKey(key);
        if (aliases.includes(normKey)) {
          return val;
        }
      }
    }

    return '';
  }

  static async createForm(data: { 
    title: string; 
    description?: string; 
    fields?: any[]; 
    companyId?: string;
    formType?: 'GENERAL_SURVEY' | 'SALES_ACTIVITY' | 'HEADLESS_ENDPOINT';
    formCode?: string;
    slug?: string;
    settings?: FormSettings;
  }) {
    const { title, description, fields, companyId, formType, formCode, settings } = data;

    // Generate a unique 10-character Form ID
    let resolvedFormCode = formCode && formCode.length === 10 ? formCode : this.generate10CharId();
    let slug = data.slug || resolvedFormCode;

    // Collision protection
    const existing = await prisma.form.findUnique({ where: { slug } });
    if (existing) {
      resolvedFormCode = this.generate10CharId();
      slug = resolvedFormCode;
    }

    const apiKey = this.generateApiKey();
    const resolvedFormType = formType || (settings?.isHeadless ? 'HEADLESS_ENDPOINT' : (settings?.isSalesActivity || settings?.salesSettings?.isSalesActivity ? 'SALES_ACTIVITY' : 'GENERAL_SURVEY'));

    const form = await prisma.form.create({
      data: {
        title,
        description: description || null,
        slug,
        apiKey,
        formType: resolvedFormType,
        formCode: resolvedFormCode,
        settings: (settings || {}) as any,
        companyId: companyId || undefined,
        fields: {
          create: (fields || []).map((field, index) => ({
            label: field.label || 'Untitled Field',
            type: field.type || 'TEXT',
            required: field.required || false,
            placeholder: field.placeholder || null,
            description: field.description || null,
            options: field.options || null,
            validation: {
              ...(typeof field.validation === 'object' && field.validation !== null ? field.validation : {}),
              pageId: field.pageId || field.validation?.pageId || 'page_1'
            },
            order: index,
            mapping: field.mapping || null
          }))
        }
      } as any,
      include: {
        fields: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return form;
  }

  static async getForms(companyId?: string) {
    const forms = await prisma.form.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compute conversion rate for each form
    return forms.map(f => {
      const submissions = f._count?.submissions || 0;
      const views = f.viewsCount || 0;
      const conversionRate = views > 0 ? Number(((submissions / views) * 100).toFixed(1)) : 0;
      return {
        ...f,
        conversionRate,
        apiKey: f.apiKey || null
      };
    });
  }

  static async getFormById(id: string) {
    const form = await prisma.form.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
          { formCode: id }
        ]
      },
      include: {
        fields: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { submissions: true }
        }
      }
    });

    if (!form) {
      throw new Error('No form found with that ID');
    }

    // Ensure form has an apiKey and 10-char formCode
    let needsUpdate = false;
    const updateData: any = {};

    if (!form.apiKey) {
      updateData.apiKey = this.generateApiKey();
      form.apiKey = updateData.apiKey;
      needsUpdate = true;
    }

    if (!form.formCode || form.formCode.length !== 10) {
      updateData.formCode = this.generate10CharId();
      form.formCode = updateData.formCode;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.form.update({
        where: { id: form.id },
        data: updateData
      });
    }

    const submissions = form._count?.submissions || 0;
    const views = form.viewsCount || 0;
    const conversionRate = views > 0 ? Number(((submissions / views) * 100).toFixed(1)) : 0;

    const mappedFields = form.fields.map((f: any) => ({
      ...f,
      pageId: (f.validation as any)?.pageId || (f.options as any)?.pageId || 'page_1'
    }));

    return {
      ...form,
      fields: mappedFields,
      conversionRate
    };
  }

  static async updateForm(id: string, data: { 
    title?: string; 
    description?: string; 
    isActive?: boolean; 
    formType?: 'GENERAL_SURVEY' | 'SALES_ACTIVITY';
    formCode?: string;
    fields?: any[];
    settings?: FormSettings;
  }) {
    const { title, description, isActive, formType, formCode, fields, settings } = data;

    const existingForm = await prisma.form.findFirst({
      where: { id }
    });

    if (!existingForm) {
      throw new Error('No form found with that ID');
    }

    const updatedForm = await prisma.$transaction(async (tx) => {
      if (fields) {
        const existingFields = await tx.formField.findMany({
          where: { formId: id }
        });
        const existingFieldMap = new Map(existingFields.map(f => [f.id, f]));
        const incomingFieldIds = new Set(fields.map(f => f.id).filter(Boolean));

        // Delete only fields that were explicitly removed by the user
        const fieldsToDelete = existingFields.filter(f => !incomingFieldIds.has(f.id));
        if (fieldsToDelete.length > 0) {
          await tx.formField.deleteMany({
            where: { id: { in: fieldsToDelete.map(f => f.id) } }
          });
        }

        // Upsert / update incoming fields to preserve existing IDs and all linked submission values
        for (let index = 0; index < fields.length; index++) {
          const field = fields[index];
          const fieldData = {
            label: field.label || 'Untitled Field',
            type: field.type || 'TEXT',
            required: field.required || false,
            placeholder: field.placeholder || null,
            description: field.description || null,
            options: field.options || null,
            validation: {
              ...(typeof field.validation === 'object' && field.validation !== null ? field.validation : {}),
              pageId: field.pageId || field.validation?.pageId || 'page_1'
            },
            order: index,
            mapping: field.mapping || null
          };

          if (field.id && existingFieldMap.has(field.id)) {
            await tx.formField.update({
              where: { id: field.id },
              data: fieldData
            });
          } else {
            await tx.formField.create({
              data: {
                ...(field.id && field.id.length > 10 ? { id: field.id } : {}),
                formId: id,
                ...fieldData
              }
            });
          }
        }
      }

      return await tx.form.update({
        where: { id },
        data: {
          title: title !== undefined ? title : undefined,
          description: description !== undefined ? description : undefined,
          isActive: isActive !== undefined ? isActive : undefined,
          formType: formType !== undefined ? formType : undefined,
          formCode: formCode !== undefined ? formCode : undefined,
          settings: settings !== undefined ? (settings as any) : undefined
        },
        include: {
          fields: {
            orderBy: { order: 'asc' }
          }
        }
      });
    });

    // Invalidate cache
    this.invalidateFormCache(id);
    if (updatedForm.slug) this.invalidateFormCache(updatedForm.slug);
    if (updatedForm.formCode) this.invalidateFormCache(updatedForm.formCode);

    return {
      ...updatedForm,
      fields: updatedForm.fields.map((f: any) => ({
        ...f,
        pageId: (f.validation as any)?.pageId || (f.options as any)?.pageId || 'page_1'
      }))
    };
  }

  static async regenerateApiKey(id: string) {
    const newApiKey = this.generateApiKey();
    const updated = await prisma.form.update({
      where: { id },
      data: { apiKey: newApiKey },
      select: { id: true, apiKey: true }
    });
    return updated.apiKey;
  }

  static async deleteForm(id: string) {
    const form = await prisma.form.findFirst({
      where: { id }
    });

    if (!form) {
      throw new Error('No form found with that ID');
    }

    await prisma.form.delete({
      where: { id: form.id }
    });

    return true;
  }

  /**
   * Delete specific submissions by ID (or single submission), cascading deletion to linked CRM Leads, SalesActivity, and Client prospects.
   */
  static async deleteSubmissions(submissionIds: string[]) {
    if (!submissionIds || submissionIds.length === 0) return { deletedCount: 0, deletedLeadsCount: 0 };

    // 1. Fetch target submissions to find linked leadId and clientId
    const submissions = await prisma.formSubmission.findMany({
      where: { id: { in: submissionIds } },
      select: { id: true, leadId: true, clientId: true, formId: true }
    });

    if (submissions.length === 0) return { deletedCount: 0, deletedLeadsCount: 0 };

    const leadIds = submissions.map(s => s.leadId).filter((id): id is string => Boolean(id));
    const clientIds = submissions.map(s => s.clientId).filter((id): id is string => Boolean(id));
    const subIds = submissions.map(s => s.id);

    let deletedLeadsCount = 0;

    // 2. Delete linked CRM Leads & Sales Activities
    if (leadIds.length > 0) {
      // Delete SalesActivity entries linked to these leads or prospects
      await prisma.salesActivity.deleteMany({
        where: {
          OR: [
            { leadId: { in: leadIds } },
            { relatedClientId: { in: clientIds } }
          ]
        }
      });

      // Delete Lead entries from Lead Pipeline / CRM
      const leadDeleteResult = await prisma.lead.deleteMany({
        where: { id: { in: leadIds } }
      });
      deletedLeadsCount = leadDeleteResult.count;
    }

    // 3. Delete orphaned Prospect Clients (if any were created solely for these leads/submissions)
    if (clientIds.length > 0) {
      for (const clientId of clientIds) {
        const remainingSubs = await prisma.formSubmission.count({ where: { clientId, id: { notIn: subIds } } });
        if (remainingSubs === 0) {
          await prisma.client.deleteMany({
            where: { id: clientId, clientType: 'PROSPECT' }
          }).catch(() => {});
        }
      }
    }

    // 4. Delete FormSubmissions and their values
    await prisma.formSubmissionValue.deleteMany({
      where: { submissionId: { in: subIds } }
    });

    const subDeleteResult = await prisma.formSubmission.deleteMany({
      where: { id: { in: subIds } }
    });

    return {
      deletedCount: subDeleteResult.count,
      deletedLeadsCount
    };
  }

  static async deleteSubmission(submissionId: string) {
    const res = await this.deleteSubmissions([submissionId]);
    if (res.deletedCount === 0) {
      throw new Error('Submission not found');
    }
    return res;
  }

  static async deleteAllSubmissions(formId: string) {
    const form = await prisma.form.findFirst({
      where: { id: formId }
    });

    if (!form) {
      throw new Error('No form found with that ID');
    }

    const allSubs = await prisma.formSubmission.findMany({
      where: { formId: form.id },
      select: { id: true }
    });

    if (allSubs.length === 0) return { deletedCount: 0, deletedLeadsCount: 0 };

    return await this.deleteSubmissions(allSubs.map(s => s.id));
  }

  static async getFormSubmissions(id: string) {
    const form = await prisma.form.findFirst({
      where: { id }
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

    // Fallback recovery for submissions that have no non-empty values
    const emptySubs = submissions.filter(s => !s.values || s.values.length === 0 || s.values.every((v: any) => !v.value || !String(v.value).trim()));
    const emptySubClientIds = emptySubs.map(s => s.clientId).filter(Boolean) as string[];
    const emptySubLeadIds = emptySubs.map(s => s.leadId).filter(Boolean) as string[];

    let clientsMap = new Map<string, any>();
    if (emptySubClientIds.length > 0) {
      const clients = await prisma.client.findMany({
        where: { id: { in: emptySubClientIds } }
      });
      clientsMap = new Map(clients.map(c => [c.id, c]));
    }

    let leadsMap = new Map<string, any>();
    let dealsMap = new Map<string, any>();
    if (emptySubLeadIds.length > 0) {
      const [leads, deals] = await Promise.all([
        prisma.lead.findMany({ where: { id: { in: emptySubLeadIds } } }),
        prisma.deal.findMany({ where: { id: { in: emptySubLeadIds } } })
      ]);
      leadsMap = new Map(leads.map(l => [l.id, l]));
      dealsMap = new Map(deals.map(d => [d.id, d]));
    }

    const enhanced = submissions.map(sub => {
      const hasRealValues = sub.values && sub.values.length > 0 && sub.values.some((v: any) => Boolean(v.value && String(v.value).trim()));
      if (!hasRealValues) {
        const virtualValues: any[] = [];
        const client = sub.clientId ? clientsMap.get(sub.clientId) : null;
        const lead = sub.leadId ? leadsMap.get(sub.leadId) : null;
        const deal = sub.leadId ? dealsMap.get(sub.leadId) : null;

        const name = (lead?.name && lead.name !== 'Inbound Lead' && lead.name !== 'Inbound Prospect')
          ? lead.name
          : (client?.name && client.name !== 'Inbound Prospect') ? client.name : (deal?.title?.replace(/\s*-\s*.*$/, '') || lead?.name || client?.name);
        const phone = lead?.phone || client?.phone;
        const email = lead?.email || client?.email;
        const company = lead?.company || client?.companyName;

        if (name) virtualValues.push({ label: 'Full Name', value: name });
        if (phone) virtualValues.push({ label: 'Phone Number', value: phone });
        if (email) virtualValues.push({ label: 'Email', value: email });
        if (company) virtualValues.push({ label: 'Company', value: company });

        if (virtualValues.length > 0) {
          return {
            ...sub,
            values: virtualValues
          };
        }
      }
      return sub;
    });

    return enhanced;
  }

  /**
   * Export form submissions as CSV
   */
  static async exportSubmissionsCsv(id: string): Promise<{ filename: string; csv: string }> {
    const form = await prisma.form.findFirst({
      where: { id },
      include: {
        fields: { orderBy: { order: 'asc' } }
      }
    });

    if (!form) throw new Error('No form found with that ID');

    const submissions = await prisma.formSubmission.findMany({
      where: { formId: form.id },
      include: {
        values: {
          include: { field: true }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    const fieldHeaders = form.fields.map(f => f.label.replace(/"/g, '""'));
    const headers = ['Submission ID', 'Date & Time', ...fieldHeaders, 'IP Address', 'Referrer'];

    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = submissions.map(sub => {
      const fieldValues = form.fields.map(f => {
        const match = sub.values.find(v => v.fieldId === f.id);
        if (!match) return '';
        if (match.fileUrl) return `${match.fileName || 'File'}: ${match.fileUrl}`;
        return match.value || '';
      });

      return [
        escapeCsv(sub.id),
        escapeCsv(new Date(sub.submittedAt).toISOString()),
        ...fieldValues.map(escapeCsv),
        escapeCsv(sub.ipAddress || ''),
        escapeCsv(sub.referrer || '')
      ].join(',');
    });

    const csvContent = [headers.map(escapeCsv).join(','), ...rows].join('\n');
    const cleanTitle = form.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `${cleanTitle}_submissions_${Date.now()}.csv`;

    return { filename, csv: csvContent };
  }

  // ─── External REST API for Custom CRMs ───────────────────────────────────

  /**
   * Secure external submission fetching for custom CRMs and external websites using API Key
   */
  static async getFormSubmissionsByApiKey(
    formIdOrSlug: string, 
    apiKey: string, 
    options?: { page?: number; limit?: number; since?: string }
  ) {
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('fkey_')) {
      throw new Error('Invalid or missing API key');
    }

    const form = await prisma.form.findFirst({
      where: {
        OR: [
          { id: formIdOrSlug },
          { slug: formIdOrSlug },
          { formCode: formIdOrSlug }
        ],
        apiKey
      },
      include: {
        fields: { orderBy: { order: 'asc' } }
      }
    });

    if (!form) {
      throw new Error('Unauthorized: Invalid API key for this form');
    }

    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options?.limit) || 20));
    const skip = (page - 1) * limit;

    const whereClause: any = { formId: form.id };
    if (options?.since) {
      whereClause.submittedAt = { gte: new Date(options.since) };
    }

    const [total, rawSubmissions] = await Promise.all([
      prisma.formSubmission.count({ where: whereClause }),
      prisma.formSubmission.findMany({
        where: whereClause,
        include: {
          values: {
            include: { field: true }
          }
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    // Format into clean JSON payload for external developers & CRMs
    const formattedSubmissions = rawSubmissions.map(sub => {
      const data: Record<string, any> = {};
      sub.values.forEach(v => {
        const key = v.field.mapping || v.field.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
        data[key] = v.fileUrl ? { url: v.fileUrl, name: v.fileName, text: v.value } : v.value;
      });

      return {
        id: sub.id,
        submittedAt: sub.submittedAt,
        ipAddress: sub.ipAddress,
        referrer: sub.referrer,
        leadId: sub.leadId,
        clientId: sub.clientId,
        data
      };
    });

    return {
      form: {
        id: form.id,
        title: form.title,
        slug: form.slug,
        formCode: form.formCode,
        formType: form.formType
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      submissions: formattedSubmissions
    };
  }

  // ─── Public Methods for Form Submissions & Views ──────────────────────────

  static async getFormBySlug(slug: string, isViewEvent: boolean = false) {
    const form = await prisma.form.findFirst({
      where: {
        OR: [
          { slug },
          { formCode: slug },
          { id: slug }
        ]
      },
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

    // Increment view count atomically if this is a live page view
    if (isViewEvent) {
      prisma.form.update({
        where: { id: form.id },
        data: { viewsCount: { increment: 1 } }
      }).catch(err => console.error('Failed to increment form views:', err));
    }

    const mappedFields = form.fields.map((f: any) => ({
      ...f,
      pageId: (f.validation as any)?.pageId || (f.options as any)?.pageId || 'page_1'
    }));

    return {
      ...form,
      fields: mappedFields
    };
  }

  static async submitForm(
    slug: string, 
    values: Record<string, any>, 
    meta?: { ipAddress?: string; userAgent?: string; referrer?: string }
  ) {
    if (!values || typeof values !== 'object') {
      throw new Error('Invalid submission format');
    }

    const form = await prisma.form.findFirst({
      where: {
        OR: [
          { slug },
          { formCode: slug },
          { id: slug }
        ]
      },
      include: { fields: true }
    });

    if (!form) throw new Error('Form not found');
    if (!form.isActive) throw new Error('This form is currently inactive');

    // Helper for robust value resolution (supports field.id, mapping, name, label, normalized match, or fuzzy alias)
    const resolveFieldValue = (field: any) => FormsService.resolveFieldValueFromObject(field, values);

    // 1. Validate required fields
    const missingFields: string[] = [];
    form.fields.forEach(field => {
      if (field.required && !['HEADING', 'PARAGRAPH', 'DIVIDER'].includes(field.type)) {
        const val = resolveFieldValue(field);
        if (val === undefined || val === null || val === '') {
          missingFields.push(field.label);
        }
      }
    });

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // 2. Prepare submission values (handling files and text)
    const submissionValues = form.fields
      .filter(f => !['HEADING', 'PARAGRAPH', 'DIVIDER'].includes(f.type))
      .map(field => {
        const val = resolveFieldValue(field);
        let fileUrl: string | null = null;
        let fileName: string | null = null;
        let textValue = '';

        if (typeof val === 'object' && val !== null && val.url) {
          fileUrl = val.url;
          fileName = val.name || 'attachment';
          textValue = val.url;
        } else if (Array.isArray(val)) {
          textValue = val.join(', ');
        } else {
          textValue = String(val ?? '');
        }

        return {
          fieldId: field.id,
          value: textValue,
          fileUrl,
          fileName
        };
      });

    // 3. Create submission in DB
    const submission = await prisma.formSubmission.create({
      data: {
        formId: form.id,
        companyId: form.companyId,
        ipAddress: meta?.ipAddress || null,
        userAgent: meta?.userAgent || null,
        referrer: meta?.referrer || null,
        values: {
          create: submissionValues
        }
      },
      include: {
        values: {
          include: { field: true }
        }
      }
    });

    // 4. Extract lead data for CRM / Sales Activity
    const leadData: Record<string, any> = {
      email: '',
      name: '',
      phone: '',
      company: '',
      budget: 0,
      source: `Web Form: ${form.title} (${form.formCode || form.id})`
    };

    const formattedSummaryLines: string[] = [];

    form.fields.forEach(field => {
      const val = resolveFieldValue(field);
      if (val === undefined || val === null || val === '') return;
      
      const strVal = typeof val === 'object' ? (val.name ? `${val.name} (${val.url})` : JSON.stringify(val)) : String(val);
      formattedSummaryLines.push(`• ${field.label}: ${strVal}`);

      if (field.type === 'EMAIL' || field.mapping?.toLowerCase().includes('email') || field.label.toLowerCase().includes('email')) {
        leadData.email = leadData.email || strVal;
      } else if (field.type === 'PHONE' || field.mapping?.toLowerCase().includes('phone') || field.label.toLowerCase().includes('phone')) {
        leadData.phone = leadData.phone || strVal;
      } else if (field.mapping?.toLowerCase().includes('company') || field.label.toLowerCase().includes('company')) {
        leadData.company = leadData.company || strVal;
      } else if (field.type === 'NUMBER' && (field.label.toLowerCase().includes('budget') || field.mapping?.toLowerCase().includes('budget') || field.label.toLowerCase().includes('amount'))) {
        leadData.budget = Number(strVal) || 0;
      } else if (field.mapping?.toLowerCase().includes('name') || field.label.toLowerCase().includes('name')) {
        leadData.name = leadData.name ? `${leadData.name} ${strVal}` : strVal;
      }
    });

    const settings = (form.settings as FormSettings) || {};
    const salesSettings = settings.salesSettings || {};
    const isSalesForm = form.formType === 'SALES_ACTIVITY' || settings.isSalesActivity === true || salesSettings.isSalesActivity === true;

    // 5. SALES ACTIVITY FORM: Automatic CRM Lead & Sales Pipeline Integration
    if (isSalesForm && (leadData.name || leadData.email || leadData.phone)) {
      try {
        // A. Find or create Client (Prospect)
        let client = leadData.email ? await prisma.client.findFirst({
          where: { companyId: form.companyId, email: leadData.email }
        }) : null;

        if (!client) {
          client = await prisma.client.create({
            data: {
              companyId: form.companyId,
              name: leadData.name || 'Inbound Prospect',
              email: leadData.email || null,
              phone: leadData.phone || null,
              companyName: leadData.company || null,
              clientType: 'PROSPECT',
              status: 'NEW',
              leadSource: leadData.source
            }
          });
        }

        const targetStage = salesSettings.targetStage || 'Lead';
        const dealValue = salesSettings.defaultDealValue || leadData.budget || 0;
        const ownerId = salesSettings.assignedSalesRepId || undefined;

        // B. Create Lead in Lead Pipeline with Form Attribution & Selected Stage
        const lead = await prisma.lead.create({
          data: {
            name: leadData.name || 'Inbound Lead',
            email: leadData.email || null,
            phone: leadData.phone || null,
            company: leadData.company || null,
            companyName: leadData.company || null,
            source: leadData.source || `Web Form: ${form.title}`,
            status: targetStage || 'Lead',
            value: Number(dealValue) || 0,
            assignedSalesRepId: ownerId || null,
            notes: `Auto-created from Form: ${form.title} (${form.formCode || form.id})\n\nSubmitted Data:\n${formattedSummaryLines.join('\n')}`,
            followUpDate: new Date()
          }
        });

        // C. Create Dedicated SalesActivity Log in Timeline
        if (salesSettings.autoCreateActivity !== false) {
          const activityNotes = `📋 Form Submission Received: "${form.title}" (ID: ${form.formCode || form.id})\n\nDetails:\n${formattedSummaryLines.join('\n')}`;
          
          await prisma.salesActivity.create({
            data: {
              type: 'form_submission',
              notes: activityNotes,
              leadId: lead.id,
              relatedClientId: client.id,
              ownerId: ownerId || null,
              status: 'completed',
              timestamp: new Date()
            }
          });
        }

        // D. Link Lead and Client to FormSubmission
        await prisma.formSubmission.update({
          where: { id: submission.id },
          data: {
            clientId: client.id,
            leadId: lead.id
          }
        });
      } catch (crmError) {
        console.error('CRM Lead & SalesActivity integration error:', crmError);
      }
    }

    // 6. Outbound Webhook dispatch (Zapier, Make, n8n, Custom CRM)
    if (settings.webhookUrl && typeof settings.webhookUrl === 'string' && settings.webhookUrl.startsWith('http')) {
      const webhookPayload = {
        event: 'form.submitted',
        formId: form.id,
        formCode: form.formCode || form.id,
        formType: form.formType,
        isSalesActivity: isSalesForm,
        formTitle: form.title,
        submissionId: submission.id,
        submittedAt: submission.submittedAt,
        lead: leadData,
        data: values
      };

      axios.post(settings.webhookUrl, webhookPayload, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': '180workspace-Webhook/1.0' }
      }).catch(err => {
        console.error(`Webhook delivery failed for form ${form.id} to ${settings.webhookUrl}:`, err.message);
      });
    }

    return {
      submissionId: submission.id,
      redirectUrl: settings.redirectUrl || null,
      pixelEventName: settings.pixelEventName || 'Lead',
      successMessage: settings.successMessage || 'Thank you! Your submission has been received.'
    };
  }

  /**
   * Recursively flattens complex / nested JSON payloads into dot-notated key-value pairs.
   * e.g., { user: { profile: { email: "a@b.com" } }, items: ["a", "b"] }
   * becomes { "user.profile.email": "a@b.com", "items": "a, b" }
   */
  public static flattenPayload(obj: any, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};
    if (!obj || typeof obj !== 'object') return result;

    for (const [key, value] of Object.entries(obj)) {
      // Ignore internal/meta fields starting with underscore (e.g. _next, _gotcha, _subject, _redirect)
      if (key.startsWith('_')) continue;

      const newKey = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(result, this.flattenPayload(value, newKey));
      } else if (Array.isArray(value)) {
        result[newKey] = value.map(v => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ');
      } else {
        result[newKey] = value;
      }
    }
    return result;
  }

  /**
   * Intelligently infers field types based on key names and value heuristics
   */
  public static inferFieldType(key: string, value: any): string {
    const lowerKey = key.toLowerCase();
    const strVal = String(value || '').trim();

    // 1. Email Heuristic
    if (lowerKey.includes('email') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
      return 'EMAIL';
    }

    // 2. Phone Heuristic
    if (lowerKey.includes('phone') || lowerKey.includes('mobile') || lowerKey.includes('tel') || lowerKey.includes('whatsapp') || /^(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}$/.test(strVal)) {
      return 'PHONE';
    }

    // 3. Number / Currency / Budget Heuristic
    if (
      typeof value === 'number' || 
      lowerKey.includes('budget') || 
      lowerKey.includes('price') || 
      lowerKey.includes('amount') || 
      lowerKey.includes('cost') || 
      lowerKey.includes('quantity') || 
      lowerKey.includes('deal_value') ||
      lowerKey.includes('dealvalue')
    ) {
      return 'NUMBER';
    }

    // 4. Date Heuristic
    if (lowerKey.includes('date') || lowerKey.includes('dob') || lowerKey.includes('birthday') || (/^\d{4}-\d{2}-\d{2}/.test(strVal) && !isNaN(Date.parse(strVal)))) {
      return 'DATE';
    }

    // 5. Long Text / Textarea Heuristic
    if (
      strVal.length > 120 || 
      lowerKey.includes('message') || 
      lowerKey.includes('description') || 
      lowerKey.includes('notes') || 
      lowerKey.includes('comment') || 
      lowerKey.includes('bio') || 
      lowerKey.includes('inquiry') ||
      lowerKey.includes('requirement')
    ) {
      return 'TEXTAREA';
    }

    // 6. Checkbox / Boolean Heuristic
    if (typeof value === 'boolean' || strVal === 'true' || strVal === 'false') {
      return 'CHECKBOX';
    }

    return 'TEXT';
  }

  /**
   * Helper to format a dot/snake/camel case key into a clean, human-readable label
   */
  public static humanizeKey(key: string): string {
    return key
      .replace(/[._\-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  }

  /**
   * Ingest submission from a Headless / External Form endpoint with dynamic schema auto-discovery,
   * spam shielding, origin whitelisting, CRM Deal creation, and webhook delivery.
   */
  static async ingestHeadlessSubmission(
    identifier: string,
    rawPayload: any,
    meta?: {
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
      origin?: string;
    }
  ) {
    if (!rawPayload || typeof rawPayload !== 'object') {
      throw new Error('Invalid submission payload format');
    }

    const form = await this.getCachedOrFetchForm(identifier);

    if (!form) throw new Error('Endpoint not found');
    if (!form.isActive) throw new Error('This endpoint is currently inactive');

    const settings = (form.settings as FormSettings) || {};

    // 1. SPAM SHIELD: Honeypot trap check
    const honeypotKeys = ['_gotcha', '_honey', '_bot_check', 'honey_pot', 'spam_check'];
    if (settings.honeypotField) {
      honeypotKeys.push(settings.honeypotField);
    }
    const honeypotTriggered = honeypotKeys.some(k => {
      const v = rawPayload[k];
      return v !== undefined && v !== null && String(v).trim() !== '';
    });

    if (honeypotTriggered) {
      console.warn(`[Spam Trap Triggered] Headless submission dropped for endpoint #${form.formCode || form.id}`);
      return {
        success: true,
        quarantined: true,
        submissionId: 'quarantined-bot-submission',
        message: 'Submission received successfully'
      };
    }

    // 2. DOMAIN ORIGIN WHITELIST CHECK
    const allowedDomains = settings.allowedDomains || [];
    if (allowedDomains.length > 0) {
      const incomingOrigin = meta?.origin || (meta?.referrer ? (() => {
        try { return new URL(meta.referrer).origin; } catch (e) { return ''; }
      })() : '');

      if (incomingOrigin) {
        const isAllowed = allowedDomains.some(domain => {
          const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
          const cleanIncoming = incomingOrigin.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
          return cleanIncoming === cleanDomain || cleanIncoming.endsWith('.' + cleanDomain);
        });

        if (!isAllowed) {
          throw new Error(`Domain origin '${incomingOrigin}' is not authorized to submit to this endpoint`);
        }
      }
    }

    // 3. FLATTEN AND NORMALIZE PAYLOAD
    const flattened = this.flattenPayload(rawPayload);
    const discoveredFieldKeys = Object.keys(flattened);

    // 4. SCHEMA AUTO-DISCOVERY: Parallel discovery and persistence of newly observed keys
    const currentFields = [...(form.fields || [])];
    let nextOrder = currentFields.length;

    const unmappedKeys = discoveredFieldKeys.filter(key => {
      const isAlreadyMapped = currentFields.some(f => {
        const val = FormsService.resolveFieldValueFromObject(f, { [key]: flattened[key] });
        return val !== undefined && val !== null && val !== '';
      });
      return !isAlreadyMapped;
    });

    if (unmappedKeys.length > 0) {
      const createdFields = await Promise.all(
        unmappedKeys.map((key, idx) => {
          const inferredType = this.inferFieldType(key, flattened[key]);
          const humanLabel = this.humanizeKey(key);
          return prisma.formField.create({
            data: {
              formId: form.id,
              label: humanLabel,
              type: inferredType as any,
              mapping: key,
              required: false,
              order: nextOrder + idx
            }
          }).catch(() => null);
        })
      );
      createdFields.filter(Boolean).forEach(f => {
        currentFields.push(f!);
        if (!form.fields.some((ef: any) => ef.id === f!.id)) {
          form.fields.push(f);
        }
      });
      this.invalidateFormCache(form.id);
      this.formCache.set(identifier, { form, cachedAt: Date.now() });
    }

    // 5. EXTRACT LEAD DATA FOR CRM / SALES PIPELINE (Prepared upfront for 1-pass DB persistence)
    const leadData: Record<string, any> = {
      email: '',
      name: '',
      phone: '',
      company: '',
      budget: 0,
      source: `Website Capture: ${form.title} (#${form.formCode || form.id})`
    };

    const formattedSummaryLines: string[] = [];

    currentFields.forEach(field => {
      const val = FormsService.resolveFieldValueFromObject(field, flattened);

      if (val === undefined || val === null || val === '') return;
      const strVal = String(val).trim();
      formattedSummaryLines.push(`• ${field.label}: ${strVal}`);

      const mappingLower = (field.mapping || '').toLowerCase();
      const labelLower = field.label.toLowerCase();

      if (field.type === 'EMAIL' || mappingLower.includes('email') || labelLower.includes('email')) {
        leadData.email = leadData.email || strVal;
      } else if (field.type === 'PHONE' || mappingLower.includes('phone') || mappingLower.includes('mobile') || labelLower.includes('phone') || labelLower.includes('mobile')) {
        leadData.phone = leadData.phone || strVal;
      } else if (mappingLower.includes('company') || mappingLower.includes('organization') || labelLower.includes('company')) {
        leadData.company = leadData.company || strVal;
      } else if (field.type === 'NUMBER' || mappingLower.includes('budget') || mappingLower.includes('price') || mappingLower.includes('amount') || mappingLower.includes('deal_value') || labelLower.includes('budget')) {
        const num = parseFloat(strVal.replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) leadData.budget = num;
      } else if (mappingLower.includes('name') || labelLower.includes('name') || mappingLower.includes('contact')) {
        leadData.name = leadData.name ? `${leadData.name} ${strVal}` : strVal;
      }
    });

    // Fallback: check raw payload directly for unmapped standard keys
    if (!leadData.email) {
      const emailKey = Object.keys(flattened).find(k => k.toLowerCase().includes('email'));
      if (emailKey) leadData.email = String(flattened[emailKey]);
    }
    if (!leadData.name) {
      const nameKey = Object.keys(flattened).find(k => k.toLowerCase().includes('name'));
      if (nameKey) leadData.name = String(flattened[nameKey]);
    }
    if (!leadData.phone) {
      const phoneKey = Object.keys(flattened).find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile'));
      if (phoneKey) leadData.phone = String(flattened[phoneKey]);
    }
    if (!leadData.company) {
      const compKey = Object.keys(flattened).find(k => k.toLowerCase().includes('company') || k.toLowerCase().includes('org'));
      if (compKey) leadData.company = String(flattened[compKey]);
    }
    if (!leadData.budget) {
      const budgetKey = Object.keys(flattened).find(k => k.toLowerCase().includes('budget') || k.toLowerCase().includes('amount') || k.toLowerCase().includes('price'));
      if (budgetKey) {
        const num = parseFloat(String(flattened[budgetKey]).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) leadData.budget = num;
      }
    }

    const salesSettings = settings.salesSettings || {};
    const isSalesForm = (form.formType === 'SALES_ACTIVITY' || (form.formType === 'HEADLESS_ENDPOINT' && settings.isSalesActivity !== false && salesSettings.isSalesActivity !== false)) && settings.isSalesActivity !== false && salesSettings.isSalesActivity !== false;

    let leadId: string | null = null;
    let clientId: string | null = null;

    // 6. AUTOMATIC CRM LEAD & PIPELINE INTEGRATION
    if (form.companyId && isSalesForm && (leadData.name || leadData.email || leadData.phone)) {
      try {
        let client = leadData.email ? await prisma.client.findFirst({
          where: { companyId: form.companyId, email: leadData.email }
        }) : null;

        if (!client) {
          client = await prisma.client.create({
            data: {
              companyId: form.companyId,
              name: leadData.name || 'Inbound Lead',
              email: leadData.email || null,
              phone: leadData.phone || null,
              companyName: leadData.company || null,
              clientType: 'PROSPECT',
              status: 'NEW',
              leadSource: leadData.source
            }
          });
        }
        clientId = client.id;

        const targetStage = salesSettings.targetStage || 'Lead';
        const dealValue = salesSettings.defaultDealValue || leadData.budget || 0;
        const ownerId = salesSettings.assignedSalesRepId || undefined;

        const lead = await prisma.lead.create({
          data: {
            name: leadData.name || 'Inbound Lead',
            email: leadData.email || null,
            phone: leadData.phone || null,
            company: leadData.company || null,
            companyName: leadData.company || null,
            source: leadData.source || `Headless Form: ${form.title}`,
            status: targetStage || 'Lead',
            value: Number(dealValue) || 0,
            assignedSalesRepId: ownerId || null,
            notes: `Auto-captured from Website Form: ${form.title} (#${form.formCode || form.id})\n\nDetails:\n${formattedSummaryLines.join('\n')}`,
            followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        });
        leadId = lead.id;

        if (salesSettings.autoCreateActivity !== false) {
          const activityNotes = `⚡ Form Data Captured: "${form.title}" (Endpoint: #${form.formCode || form.id})\n\nDetails:\n${formattedSummaryLines.join('\n')}`;
          
          prisma.salesActivity.create({
            data: {
              type: 'form_submission',
              notes: activityNotes,
              leadId: lead.id,
              relatedClientId: client.id,
              ownerId: ownerId || null,
              status: 'completed',
              timestamp: new Date()
            }
          }).catch(err => console.error('Background activity log error:', err.message));
        }
      } catch (crmErr) {
        console.error('CRM Lead auto-creation error during capture:', crmErr);
      }
    }

    // 7. PREPARE SUBMISSION VALUES
    const submissionValues = currentFields
      .filter(f => !['HEADING', 'PARAGRAPH', 'DIVIDER'].includes(f.type))
      .map(field => {
        const matchedVal = FormsService.resolveFieldValueFromObject(field, flattened);
        const strVal = matchedVal !== undefined && matchedVal !== null ? (typeof matchedVal === 'object' ? JSON.stringify(matchedVal) : String(matchedVal)) : '';
        return {
          fieldId: field.id,
          value: strVal,
          fileUrl: null,
          fileName: null
        };
      })
      .filter(sv => sv.value !== '');

    // 8. 1-PASS DB PERSISTENCE (Ultra-low latency insert)
    const submission = await prisma.formSubmission.create({
      data: {
        formId: form.id,
        companyId: form.companyId,
        clientId: clientId || null,
        leadId: leadId || null,
        ipAddress: meta?.ipAddress || null,
        userAgent: meta?.userAgent || null,
        referrer: meta?.referrer || meta?.origin || null,
        values: {
          create: submissionValues
        }
      }
    });

    // 9. NON-BLOCKING OUTBOUND WEBHOOK DISPATCH
    if (settings.webhookUrl && typeof settings.webhookUrl === 'string' && settings.webhookUrl.startsWith('http')) {
      const webhookPayload = {
        event: 'form.submitted',
        endpointType: 'HEADLESS_ENDPOINT',
        formId: form.id,
        formCode: form.formCode || form.id,
        formTitle: form.title,
        submissionId: submission.id,
        submittedAt: submission.submittedAt,
        lead: leadData,
        data: flattened
      };

      axios.post(settings.webhookUrl, webhookPayload, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': '180workspace-Webhook/1.0' }
      }).catch(err => {
        console.error(`Webhook delivery failed for form ${form.id} to ${settings.webhookUrl}:`, err.message);
      });
    }

    const redirectUrl = rawPayload._next || rawPayload._redirect || settings.redirectUrl || null;

    return {
      success: true,
      submissionId: submission.id,
      formCode: form.formCode || form.id,
      dealId: leadId || null,
      leadId,
      clientId,
      redirectUrl,
      pixelEventName: settings.pixelEventName || 'Lead',
      successMessage: settings.successMessage || 'Thank you! Your submission has been captured.',
      data: flattened
    };
  }
}

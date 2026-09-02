// @ts-nocheck
import { prisma } from '@workspace/db';
import crypto from 'crypto';
import { aiProviderService } from '../kernel/ai-provider.service';
import { AICompanyConfigService } from '../kernel/ai-company-config.service';
import { IUniversalBuilder, BuilderGenerationParams, BuilderResult } from './universal-builder.interface';

export interface FormASTField {
    id?: string;
    label: string;
    name?: string;
    type: 'TEXT' | 'TEXTAREA' | 'EMAIL' | 'PHONE' | 'NUMBER' | 'DATE' | 'SELECT' | 'RADIO' | 'CHECKBOX' | 'RATING' | 'FILE_UPLOAD' | 'HEADING' | 'DIVIDER' | 'PARAGRAPH';
    required: boolean;
    placeholder?: string;
    description?: string;
    options?: any;
    order: number;
    mapping?: string;
    pageId?: string;
    validation?: any;
}

export class FormAIBuilderService implements IUniversalBuilder {
    readonly builderType = 'form';

    private generate10CharId(): string {
        return Math.random().toString(36).substring(2, 12);
    }

    private generateApiKey(): string {
        return `fkey_${crypto.randomBytes(16).toString('hex')}`;
    }

    private isGreetingOrChitchat(text: string): boolean {
        const clean = text.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
        return /^(hi|hello|hey|hiya|hola|namaste|good\s*(morning|afternoon|evening)|sup|howdy|who\s*are\s*you|what\s*can\s*you\s*do|help|start|test)$/i.test(clean);
    }

    private extractJSON(rawText: string): any {
        try {
            // Remove markdown code fences if present
            let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleaned = cleaned.substring(firstBrace, lastBrace + 1);
            }
            return JSON.parse(cleaned);
        } catch {
            return null;
        }
    }

    async compileAST(params: BuilderGenerationParams): Promise<BuilderResult> {
        const { prompt, companyId, userId } = params;
        const textPrompt = (prompt || '').trim();

        let effectiveCompanyId = companyId;
        if (!effectiveCompanyId) {
            const firstCompany = await prisma.company.findFirst().catch(() => null);
            effectiveCompanyId = firstCompany?.id;
        }

        const { settings, companyName } = await AICompanyConfigService.getCompanyAISettings(effectiveCompanyId);
        const lowerPrompt = textPrompt.toLowerCase();

        let formTitle = '';
        let formDescription = '';
        let primaryColor = '#4f46e5';
        let submitButtonText = 'Submit Form';
        let fields: FormASTField[] = [];
        let pages = [
            { id: 'page_1', title: 'Page 1', description: '', order: 0 }
        ];

        // 1. Try Live LLM Generation if AI Provider is active
        let llmGenerated = false;
        try {
            const client = await aiProviderService.getClient(settings);
            if (client) {
                const systemPrompt = `You are the 180 Workspace AI Form Architect.
Create a comprehensive, production-ready form schema based on the user's prompt for company: "${companyName}".

User Prompt: "${textPrompt}"

Return ONLY a raw JSON object with this exact structure:
{
  "title": "Clean Form Title",
  "description": "Short explanation of the form purpose",
  "primaryColor": "#hexColor",
  "submitButtonText": "Button CTA Text",
  "fields": [
    {
      "label": "Question Label",
      "type": "TEXT" | "TEXTAREA" | "EMAIL" | "PHONE" | "NUMBER" | "DATE" | "SELECT" | "RADIO" | "CHECKBOX" | "RATING" | "FILE_UPLOAD" | "HEADING" | "DIVIDER",
      "required": boolean,
      "placeholder": "placeholder example",
      "description": "optional field description",
      "options": ["Option 1", "Option 2"] // only for SELECT, RADIO, CHECKBOX
    }
  ]
}`;
                const response = await client.generate(systemPrompt);
                const parsed = this.extractJSON(response);
                if (parsed && Array.isArray(parsed.fields) && parsed.fields.length > 0) {
                    formTitle = parsed.title || `${companyName} Intake Form`;
                    formDescription = parsed.description || 'Please complete the form below.';
                    primaryColor = parsed.primaryColor || '#4f46e5';
                    submitButtonText = parsed.submitButtonText || 'Submit Form';
                    fields = parsed.fields.map((f: any, idx: number) => ({
                        label: f.label || `Question ${idx + 1}`,
                        type: f.type || 'TEXT',
                        required: !!f.required,
                        placeholder: f.placeholder || undefined,
                        description: f.description || undefined,
                        options: Array.isArray(f.options) ? f.options : undefined,
                        order: idx,
                        pageId: 'page_1',
                        mapping: (f.label || `field_${idx + 1}`).toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)
                    }));
                    llmGenerated = true;
                }
            }
        } catch (err) {
            console.warn('[FormAIBuilder] Live LLM generation fallback triggered:', err);
        }

        // 2. Intelligent NLP Heuristic Fallback Engine
        if (!llmGenerated) {
            if (lowerPrompt.includes('job') || lowerPrompt.includes('career') || lowerPrompt.includes('hire') || lowerPrompt.includes('candidate') || lowerPrompt.includes('resume') || lowerPrompt.includes('applicant')) {
                formTitle = `${companyName || 'Apex'} Job Application & Candidate Intake`;
                formDescription = 'Submit your application, work experience, and portfolio for open positions.';
                primaryColor = '#059669';
                submitButtonText = 'Submit Application';
                fields = [
                    { label: 'Full Legal Name', type: 'TEXT', required: true, placeholder: 'e.g. Eleanor Vance', order: 0, pageId: 'page_1' },
                    { label: 'Email Address', type: 'EMAIL', required: true, placeholder: 'eleanor@example.com', order: 1, pageId: 'page_1' },
                    { label: 'Contact Phone Number', type: 'PHONE', required: true, placeholder: '+1 (555) 234-5678', order: 2, pageId: 'page_1' },
                    { label: 'Role Applying For', type: 'SELECT', required: true, options: ['Senior Frontend Engineer', 'Full Stack Developer', 'Product Designer', 'Technical Product Manager', 'DevOps Specialist'], order: 3, pageId: 'page_1' },
                    { label: 'Years of Relevant Experience', type: 'NUMBER', required: true, placeholder: 'e.g. 5', order: 4, pageId: 'page_1' },
                    { label: 'LinkedIn / GitHub / Portfolio Link', type: 'TEXT', required: false, placeholder: 'https://linkedin.com/in/username', order: 5, pageId: 'page_1' },
                    { label: 'Upload Resume & Cover Letter', type: 'FILE_UPLOAD', required: true, description: 'PDF or DOCX format (Max 10MB)', order: 6, pageId: 'page_1' },
                    { label: 'Why are you excited to join our team?', type: 'TEXTAREA', required: false, placeholder: 'Share what drives you and highlights of your past achievements...', order: 7, pageId: 'page_1' }
                ];
            } else if (lowerPrompt.includes('diwali') || lowerPrompt.includes('festival') || lowerPrompt.includes('contest') || lowerPrompt.includes('offer') || lowerPrompt.includes('holiday')) {
                formTitle = `${companyName || 'Apex'} Festive Diwali Special Contest & Lead Pass`;
                formDescription = 'Register for exclusive festival giveaways, 40% discount vouchers, and VIP campaign consultation.';
                primaryColor = '#ea580c';
                submitButtonText = 'Claim Festive Voucher';
                fields = [
                    { label: 'Full Name', type: 'TEXT', required: true, placeholder: 'Enter your name', order: 0, pageId: 'page_1' },
                    { label: 'WhatsApp / Mobile Number', type: 'PHONE', required: true, placeholder: '+91 98765 43210', order: 1, pageId: 'page_1' },
                    { label: 'Business Email', type: 'EMAIL', required: true, placeholder: 'name@business.com', order: 2, pageId: 'page_1' },
                    { label: 'Business / Company Name', type: 'TEXT', required: true, placeholder: 'e.g. Sharma Enterprises', order: 3, pageId: 'page_1' },
                    { label: 'Interested Campaign Tier', type: 'RADIO', required: true, options: ['Diwali Spark Starter (₹24,999)', 'Festive Booster (₹59,999)', 'Grand Dominance (₹1,29,999)'], order: 4, pageId: 'page_1' },
                    { label: 'Expected Monthly Ad Budget', type: 'SELECT', required: true, options: ['₹50k - ₹1.5 Lakhs', '₹1.5 Lakhs - ₹5 Lakhs', '₹5 Lakhs+'], order: 5, pageId: 'page_1' },
                    { label: 'How did you hear about our Diwali promotion?', type: 'SELECT', required: false, options: ['Instagram / Facebook Ads', 'Google Search', 'LinkedIn', 'Referral / Colleague'], order: 6, pageId: 'page_1' }
                ];
            } else if (lowerPrompt.includes('feedback') || lowerPrompt.includes('nps') || lowerPrompt.includes('satisfaction') || lowerPrompt.includes('survey')) {
                formTitle = `${companyName || 'Apex'} Customer Satisfaction & NPS Survey`;
                formDescription = 'Help us improve our platform and services. Your transparent feedback guides our roadmap.';
                primaryColor = '#7c3aed';
                submitButtonText = 'Send Feedback';
                fields = [
                    { label: 'Your Name (Optional)', type: 'TEXT', required: false, placeholder: 'Optional', order: 0, pageId: 'page_1' },
                    { label: 'Email Address', type: 'EMAIL', required: true, placeholder: 'your@email.com', order: 1, pageId: 'page_1' },
                    { label: 'How satisfied are you with our platform overall?', type: 'RATING', required: true, description: '1 = Very Dissatisfied, 5 = Extremely Satisfied', order: 2, pageId: 'page_1' },
                    { label: 'How likely are you to recommend us to a colleague or peer?', type: 'RATING', required: true, description: 'Net Promoter Score Scale', order: 3, pageId: 'page_1' },
                    { label: 'Which feature do you find most valuable?', type: 'SELECT', required: true, options: ['AI Autonomous Copilot', 'AST Document Synthesizer', 'CRM & Pipeline Engine', 'Real-time Financial Radar', 'Forms & Ingestion Hub'], order: 4, pageId: 'page_1' },
                    { label: 'What is one area or feature we can improve for you?', type: 'TEXTAREA', required: false, placeholder: 'Tell us how we can make your daily work easier...', order: 5, pageId: 'page_1' }
                ];
            } else if (lowerPrompt.includes('support') || lowerPrompt.includes('ticket') || lowerPrompt.includes('help') || lowerPrompt.includes('issue') || lowerPrompt.includes('bug')) {
                formTitle = `${companyName || 'Apex'} Customer Support & Ticket Portal`;
                formDescription = 'Submit a support ticket and our engineering team will respond within 2 hours.';
                primaryColor = '#2563eb';
                submitButtonText = 'Submit Support Ticket';
                fields = [
                    { label: 'Your Full Name', type: 'TEXT', required: true, placeholder: 'e.g. David Miller', order: 0, pageId: 'page_1' },
                    { label: 'Work Email Address', type: 'EMAIL', required: true, placeholder: 'david@company.com', order: 1, pageId: 'page_1' },
                    { label: 'Issue Category', type: 'SELECT', required: true, options: ['Billing & Invoicing', 'AI Copilot / Generation Issue', 'CRM Integration', 'Account Access & Security', 'Bug Report / Other'], order: 2, pageId: 'page_1' },
                    { label: 'Urgency / Severity Level', type: 'RADIO', required: true, options: ['Low - General Inquiry', 'Medium - Feature Impaired', 'High - Critical Blocker'], order: 3, pageId: 'page_1' },
                    { label: 'Detailed Issue Description', type: 'TEXTAREA', required: true, placeholder: 'Describe the steps to reproduce the issue...', order: 4, pageId: 'page_1' },
                    { label: 'Attach Screenshots or Logs', type: 'FILE_UPLOAD', required: false, description: 'Images or error log files', order: 5, pageId: 'page_1' }
                ];
            } else if (lowerPrompt.includes('onboard') || lowerPrompt.includes('client') || lowerPrompt.includes('intake')) {
                formTitle = `${companyName || 'Apex'} Client Onboarding & Project Intake`;
                formDescription = 'Welcome! Please share your project scope, brand assets, and team contacts to begin delivery.';
                primaryColor = '#4f46e5';
                submitButtonText = 'Start Onboarding';
                fields = [
                    { label: 'Primary Contact Name', type: 'TEXT', required: true, placeholder: 'e.g. Alex Morgan', order: 0, pageId: 'page_1' },
                    { label: 'Company Work Email', type: 'EMAIL', required: true, placeholder: 'alex@company.com', order: 1, pageId: 'page_1' },
                    { label: 'Company / Organization Name', type: 'TEXT', required: true, placeholder: 'Acme Global Inc.', order: 2, pageId: 'page_1' },
                    { label: 'Project Objective & Deliverables', type: 'TEXTAREA', required: true, placeholder: 'Describe key milestones and goals...', order: 3, pageId: 'page_1' },
                    { label: 'Target Launch Date', type: 'DATE', required: true, order: 4, pageId: 'page_1' },
                    { label: 'Upload Brand Guidelines & Assets', type: 'FILE_UPLOAD', required: false, description: 'Logos, Figma links, or brand book', order: 5, pageId: 'page_1' }
                ];
            } else {
                formTitle = `${companyName || 'Apex'} Lead Intake & Project Discovery`;
                formDescription = 'Collect client requirements, budget range, and timeline expectations for immediate sales follow-up.';
                primaryColor = '#4f46e5';
                submitButtonText = 'Submit Project Details';
                fields = [
                    { label: 'Full Name', type: 'TEXT', required: true, placeholder: 'e.g. Jordan Smith', order: 0, pageId: 'page_1' },
                    { label: 'Work Email Address', type: 'EMAIL', required: true, placeholder: 'jordan@enterprise.com', order: 1, pageId: 'page_1' },
                    { label: 'Phone Number', type: 'PHONE', required: true, placeholder: '+1 (555) 432-1098', order: 2, pageId: 'page_1' },
                    { label: 'Company / Organization Name', type: 'TEXT', required: true, placeholder: 'Acme Corp', order: 3, pageId: 'page_1' },
                    { label: 'Estimated Project Budget', type: 'SELECT', required: true, options: ['$5,000 - $15,000', '$15,000 - $50,000', '$50,000 - $100,000', '$100,000+'], order: 4, pageId: 'page_1' },
                    { label: 'Target Launch Timeline', type: 'SELECT', required: true, options: ['Immediately (< 2 weeks)', 'Within 1 Month', '1 - 3 Months', 'Exploring Options'], order: 5, pageId: 'page_1' },
                    { label: 'Project Scope & Requirements', type: 'TEXTAREA', required: true, placeholder: 'Briefly summarize your project goals, key features, and deliverables...', order: 6, pageId: 'page_1' }
                ];
            }
        }

        const formCode = this.generate10CharId();
        const slug = formCode;
        const apiKey = this.generateApiKey();

        const formSettings = {
            buttonColor: primaryColor,
            buttonTextColor: '#ffffff',
            submitButtonText,
            backgroundType: 'default',
            backgroundColor: '#f8fafc',
            pixelEventName: 'Lead',
            successMessage: 'Thank you! Your submission has been received.',
            headerImage: '',
            footerImage: '',
            footerText: `© ${new Date().getFullYear()} ${companyName || '180 Workspace'}. All rights reserved.`,
            pages,
            salesSettings: {
                isSalesActivity: true,
                targetStage: 'Lead',
                defaultDealValue: 0,
                autoCreateActivity: true
            }
        };

        // Create in PostgreSQL database
        const form = await prisma.form.create({
            data: {
                title: formTitle,
                description: formDescription,
                slug,
                apiKey,
                formType: 'SALES_ACTIVITY',
                formCode,
                settings: formSettings as any,
                companyId: effectiveCompanyId,
                fields: {
                    create: fields.map((f, index) => ({
                        label: f.label,
                        type: f.type,
                        required: !!f.required,
                        placeholder: f.placeholder || null,
                        description: f.description || null,
                        options: f.options ? f.options : null,
                        order: index,
                        mapping: f.mapping || (f.label.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)),
                        validation: { pageId: 'page_1' }
                    }))
                }
            },
            include: {
                fields: { orderBy: { order: 'asc' } }
            }
        });

        const editUrl = `/forms/${form.id}`;
        const shareUrl = `/f/${form.formCode}`;

        const reply = `✨ **${formTitle}** has been synthesized by 180 AI Architect!\n\n` +
            `• **Questions**: ${fields.length} tailored intake questions\n` +
            `• **Sales Pipeline**: Automatically synced to CRM Leads\n` +
            `• **Theme**: ${primaryColor} accent styling\n\n` +
            `You can review and customize your live form in the **Form Builder** below.`;

        return {
            success: true,
            builderType: this.builderType,
            entityId: form.id,
            title: formTitle,
            editUrl,
            shareUrl,
            reply,
            ast: {
                form,
                fields: form.fields,
                settings: formSettings,
                pages
            },
            actionCards: [
                { type: 'edit', label: 'Open in Form Builder →', url: editUrl },
                { type: 'preview', label: 'View Public Form', url: shareUrl }
            ]
        };
    }

    async patchAST(entityId: string, instruction: string, params: BuilderGenerationParams): Promise<BuilderResult> {
        const textInstruction = (instruction || params.prompt || '').trim();
        const lower = textInstruction.toLowerCase();

        const form = await prisma.form.findUnique({
            where: { id: entityId },
            include: { fields: { orderBy: { order: 'asc' } } }
        });

        if (!form) {
            return {
                success: false,
                builderType: this.builderType,
                entityId,
                title: 'Form Not Found',
                editUrl: `/forms`,
                reply: `❌ Form with ID ${entityId} could not be found.`,
                ast: null
            };
        }

        let updatedSettings = typeof form.settings === 'object' && form.settings !== null ? { ...form.settings } : {};
        let currentFields = [...(form.fields || [])];
        const editUrl = `/forms/${entityId}`;

        // 1. Conversational Greeting & Inquiry Interception (Do not blindly overwrite form)
        if (this.isGreetingOrChitchat(textInstruction)) {
            return {
                success: true,
                builderType: this.builderType,
                entityId,
                title: form.title,
                editUrl,
                reply: `👋 Hello! I am your **180 Workspace AI Form Architect**.\n\nI have full live awareness of your form: **"${form.title}"** with ${currentFields.length} questions.\n\n**Here are things you can ask me to do:**\n• *"Add a 5-star experience rating question"*\n• *"Add a resume file upload question"*\n• *"Change the theme color to emerald green and button text to Submit Application"*\n• *"Add a dropdown question for Department with Engineering, Product, Sales"*\n• *"Split this into a 2-step multi-page form"*`,
                ast: {
                    form,
                    fields: currentFields,
                    settings: updatedSettings,
                    pages: updatedSettings.pages || [{ id: 'page_1', title: 'Page 1', order: 0 }]
                },
                actionCards: [
                    { type: 'edit', label: 'View in Form Builder →', url: editUrl }
                ]
            };
        }

        let effectiveCompanyId = form.companyId || params.companyId;
        const { settings, companyName } = await AICompanyConfigService.getCompanyAISettings(effectiveCompanyId);

        let aiHandled = false;
        let aiReply = '';

        // 2. Try Live LLM Patching via Gemini / OpenAI
        try {
            const client = await aiProviderService.getClient(settings);
            if (client) {
                const patchPrompt = `You are the 180 Workspace AI Form Architect.
You modify or extend online forms live based on user instructions.

Current Form:
Title: "${form.title}"
Description: "${form.description || ''}"
Submit Button: "${updatedSettings.submitButtonText || 'Submit Form'}"
Color: "${updatedSettings.buttonColor || '#4f46e5'}"
Existing Questions (${currentFields.length}):
${currentFields.map((f, i) => `${i + 1}. [${f.type}] "${f.label}" (Required: ${f.required}${f.options ? `, Options: ${JSON.stringify(f.options)}` : ''})`).join('\n')}

User Instruction: "${textInstruction}"

Analyze the user's instruction and return ONLY a valid JSON object:
{
  "reply": "Clear, friendly explanation of the exact changes applied to the form",
  "title": "Updated or current title",
  "description": "Updated or current description",
  "submitButtonText": "Updated button CTA",
  "buttonColor": "Updated hex color or current hex",
  "fields": [
    {
      "label": "Question label",
      "type": "TEXT" | "TEXTAREA" | "EMAIL" | "PHONE" | "NUMBER" | "DATE" | "SELECT" | "RADIO" | "CHECKBOX" | "RATING" | "FILE_UPLOAD" | "HEADING" | "DIVIDER",
      "required": boolean,
      "placeholder": "placeholder",
      "description": "description",
      "options": ["Option 1", "Option 2"],
      "pageId": "page_1"
    }
  ]
}`;
                const rawResponse = await client.generate(patchPrompt);
                const parsed = this.extractJSON(rawResponse);

                if (parsed && Array.isArray(parsed.fields) && parsed.fields.length > 0) {
                    if (parsed.buttonColor) updatedSettings.buttonColor = parsed.buttonColor;
                    if (parsed.submitButtonText) updatedSettings.submitButtonText = parsed.submitButtonText;
                    if (parsed.title) form.title = parsed.title;
                    if (parsed.description !== undefined) form.description = parsed.description;

                    currentFields = parsed.fields.map((f: any, idx: number) => ({
                        label: f.label || `Question ${idx + 1}`,
                        type: f.type || 'TEXT',
                        required: !!f.required,
                        placeholder: f.placeholder || null,
                        description: f.description || null,
                        options: Array.isArray(f.options) ? f.options : null,
                        order: idx,
                        mapping: f.mapping || (f.label || `field_${idx + 1}`).toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30),
                        validation: { pageId: f.pageId || 'page_1' }
                    }));

                    aiReply = parsed.reply || `✅ Form updated with instruction: "${textInstruction}"! Your questions and styling have been updated live.`;
                    aiHandled = true;
                }
            }
        } catch (err) {
            console.warn('[FormAIBuilder] Live LLM patch error, falling back to NLP engine:', err);
        }

        // 3. Robust NLP Heuristic Fallback Engine
        if (!aiHandled) {
            const addedDetails: string[] = [];

            // A. Color Palette / Theme updates
            if (lower.includes('emerald') || lower.includes('green')) {
                updatedSettings.buttonColor = '#059669';
                addedDetails.push('Switched theme color to Emerald Green (#059669)');
            } else if (lower.includes('purple') || lower.includes('violet')) {
                updatedSettings.buttonColor = '#7c3aed';
                addedDetails.push('Switched theme color to Royal Purple (#7c3aed)');
            } else if (lower.includes('blue') || lower.includes('indigo')) {
                updatedSettings.buttonColor = '#2563eb';
                addedDetails.push('Switched theme color to Indigo Blue (#2563eb)');
            } else if (lower.includes('orange') || lower.includes('amber')) {
                updatedSettings.buttonColor = '#ea580c';
                addedDetails.push('Switched theme color to Warm Amber (#ea580c)');
            } else if (lower.includes('pink') || lower.includes('rose')) {
                updatedSettings.buttonColor = '#db2777';
                addedDetails.push('Switched theme color to Rose Pink (#db2777)');
            } else if (lower.includes('dark') || lower.includes('black') || lower.includes('zinc')) {
                updatedSettings.buttonColor = '#18181b';
                addedDetails.push('Switched theme color to Dark Slate (#18181b)');
            }

            // B. Add Rating / NPS field
            if (lower.includes('rating') || lower.includes('nps') || lower.includes('satisfaction') || lower.includes('star')) {
                const hasRating = currentFields.some(f => f.type === 'RATING');
                if (!hasRating) {
                    currentFields.push({
                        label: 'How would you rate your overall experience?',
                        type: 'RATING',
                        required: true,
                        description: '1 = Poor, 5 = Exceptional',
                        order: currentFields.length,
                        mapping: 'experience_rating',
                        validation: { pageId: 'page_1' }
                    } as any);
                    addedDetails.push('Added 5-star experience rating question');
                }
            }

            // C. Add File Upload field
            if (lower.includes('file') || lower.includes('upload') || lower.includes('resume') || lower.includes('attachment') || lower.includes('document')) {
                const hasFile = currentFields.some(f => f.type === 'FILE_UPLOAD');
                if (!hasFile) {
                    currentFields.push({
                        label: 'Upload Supporting Document / Resume',
                        type: 'FILE_UPLOAD',
                        required: false,
                        description: 'PDF, PNG, JPG, or DOCX (Max 10MB)',
                        order: currentFields.length,
                        mapping: 'supporting_document',
                        validation: { pageId: 'page_1' }
                    } as any);
                    addedDetails.push('Added document / resume file upload field');
                }
            }

            // D. Add Phone Number field
            if (lower.includes('phone') || lower.includes('whatsapp') || lower.includes('mobile')) {
                const hasPhone = currentFields.some(f => f.type === 'PHONE');
                if (!hasPhone) {
                    currentFields.push({
                        label: 'Phone / WhatsApp Number',
                        type: 'PHONE',
                        required: true,
                        placeholder: '+1 (555) 000-0000',
                        order: currentFields.length,
                        mapping: 'phone_number',
                        validation: { pageId: 'page_1' }
                    } as any);
                    addedDetails.push('Added contact phone number field');
                }
            }

            // E. Add Dropdown / Selection Question
            if (lower.includes('dropdown') || lower.includes('select') || lower.includes('options')) {
                currentFields.push({
                    label: 'Please select an option',
                    type: 'SELECT',
                    required: true,
                    options: ['Option A', 'Option B', 'Option C', 'Other'],
                    order: currentFields.length,
                    mapping: 'custom_selection',
                    validation: { pageId: 'page_1' }
                } as any);
                addedDetails.push('Added custom dropdown selection question');
            }

            // F. Update Submit Button Text
            if (lower.includes('submit button') || lower.includes('button text')) {
                const match = textInstruction.match(/(?:submit button|button text)(?:\s+to\s+|\s*:\s*|\s+is\s+)(["']?[^"'\n]+["']?)/i);
                if (match) {
                    updatedSettings.submitButtonText = match[1].replace(/["']/g, '').trim();
                    addedDetails.push(`Updated button text to "${updatedSettings.submitButtonText}"`);
                }
            }

            // G. Title change
            if (lower.includes('change title') || lower.includes('rename form')) {
                const titleMatch = textInstruction.match(/(?:change title|rename form)(?:\s+to\s+|\s*:\s*)(["']?[^"'\n]+["']?)/i);
                if (titleMatch) {
                    form.title = titleMatch[1].replace(/["']/g, '').trim();
                    addedDetails.push(`Renamed form to "${form.title}"`);
                }
            }

            aiReply = addedDetails.length > 0
                ? `✅ Form updated with instruction: "${textInstruction}"! Your questions and styling have been updated live.`
                : `✅ Form synchronized: Your questions and layout are active in the live builder.`;
        }

        // Delete existing fields and re-create updated list in database transaction
        await prisma.$transaction(async (tx) => {
            await tx.formField.deleteMany({ where: { formId: entityId } });
            if (currentFields.length > 0) {
                await tx.formField.createMany({
                    data: currentFields.map((f, i) => ({
                        formId: entityId,
                        label: f.label || `Question ${i + 1}`,
                        type: f.type || 'TEXT',
                        required: !!f.required,
                        placeholder: f.placeholder || null,
                        description: f.description || null,
                        options: f.options || null,
                        order: i,
                        mapping: f.mapping || `field_${i + 1}`,
                        validation: f.validation || { pageId: 'page_1' }
                    }))
                });
            }

            await tx.form.update({
                where: { id: entityId },
                data: {
                    title: form.title,
                    description: form.description,
                    settings: updatedSettings as any
                }
            });
        }, { timeout: 25000 });

        const updatedForm = await prisma.form.findUnique({
            where: { id: entityId },
            include: { fields: { orderBy: { order: 'asc' } } }
        });

        return {
            success: true,
            builderType: this.builderType,
            entityId,
            title: updatedForm?.title || form.title,
            editUrl,
            reply: aiReply,
            ast: {
                form: updatedForm,
                fields: updatedForm?.fields || [],
                settings: updatedSettings,
                pages: updatedSettings.pages || [{ id: 'page_1', title: 'Page 1', order: 0 }]
            },
            actionCards: [
                { type: 'edit', label: 'View in Form Builder →', url: editUrl }
            ]
        };
    }

    async deleteEntity(entityId: string, companyId: string) {
        await prisma.form.deleteMany({ where: { id: entityId, companyId } });
        return { success: true, message: `Form ${entityId} deleted.` };
    }
}

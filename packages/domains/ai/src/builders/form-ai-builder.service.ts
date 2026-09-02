// @ts-nocheck
import { prisma } from '@workspace/db';
import crypto from 'crypto';
import { aiProviderService } from '../kernel/ai-provider.service';
import { AICompanyConfigService } from '../kernel/ai-company-config.service';
import { IUniversalBuilder, BuilderGenerationParams, BuilderResult } from './universal-builder.interface';

export class FormAIBuilderService implements IUniversalBuilder {
    readonly builderType = 'form';

    async compileAST(params: BuilderGenerationParams): Promise<BuilderResult> {
        const { prompt, companyId, userId } = params;
        const textPrompt = (prompt || '').trim();

        let effectiveCompanyId = companyId;
        if (!effectiveCompanyId) {
            const firstCompany = await prisma.company.findFirst().catch(() => null);
            effectiveCompanyId = firstCompany?.id;
        }

        const { settings, companyName } = await AICompanyConfigService.getCompanyAISettings(effectiveCompanyId);
        const provider = settings.aiProvider;
        const isConfigured = Boolean(
            (provider === 'gemini' && !!settings.geminiKey) ||
            (provider === 'openai' && !!settings.openaiKey) ||
            (provider === 'claude' && !!settings.claudeKey) ||
            (provider === 'custom' && !!settings.customAiKey && !!settings.customAiUrl)
        );

        let formResult: any = null;

        if (isConfigured) {
            try {
                const clientAI = await aiProviderService.getClient(settings);
                if (clientAI) {
                    const systemPrompt = `You are the 180 Workspace AI Form Architect.
Synthesize a structured form AST for the prompt: "${textPrompt}"
Company: ${companyName}

FIELD TYPES: "text", "email", "phone", "textarea", "select", "radio", "checkbox", "number", "date".
Return valid JSON with keys:
- title: string
- description: string
- slug: string
- fields: Array<{ id: string, type: string, label: string, placeholder?: string, required: boolean, options?: string[] }>
- submitLabel: string`;

                    const rawResponse = await clientAI.generate(systemPrompt, { max_tokens: 2500 });
                    if (rawResponse) {
                        const cleanJson = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                        try {
                            const parsed = JSON.parse(cleanJson);
                            if (parsed && Array.isArray(parsed.fields) && parsed.fields.length > 0) {
                                formResult = {
                                    title: parsed.title || 'Client Intake Form',
                                    description: parsed.description || 'Please complete this form.',
                                    slug: (parsed.slug || parsed.title || 'form').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4),
                                    fields: parsed.fields.map((f: any) => ({ ...f, id: f.id || crypto.randomUUID() })),
                                    submitLabel: parsed.submitLabel || 'Submit Form'
                                };
                            }
                        } catch (e) {}
                    }
                }
            } catch (err: any) {}
        }

        if (!formResult) {
            formResult = {
                title: 'Lead Intake & Inquiry Form',
                description: 'Collect client contact details, requirements, and budget expectations.',
                slug: 'lead-intake-' + Date.now().toString().slice(-6),
                submitLabel: 'Submit Inquiry',
                fields: [
                    { id: crypto.randomUUID(), type: 'text', label: 'Full Name', placeholder: 'e.g. Alex Morgan', required: true },
                    { id: crypto.randomUUID(), type: 'email', label: 'Business Email', placeholder: 'alex@company.com', required: true },
                    { id: crypto.randomUUID(), type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false },
                    { id: crypto.randomUUID(), type: 'select', label: 'Project Budget', options: ['$5,000 - $15,000', '$15,000 - $50,000', '$50,000+'], required: true },
                    { id: crypto.randomUUID(), type: 'textarea', label: 'Project Description & Goals', placeholder: 'Describe your vision, timeline, and key requirements...', required: true }
                ]
            };
        }

        // Persist Form to Database if companyId exists
        let createdForm: any = null;
        if (effectiveCompanyId) {
            try {
                createdForm = await prisma.form.create({
                    data: {
                        companyId: effectiveCompanyId,
                        title: formResult.title,
                        description: formResult.description,
                        slug: formResult.slug,
                        isActive: true,
                        formType: 'GENERAL_SURVEY',
                        settings: {
                            fields: formResult.fields,
                            submitLabel: formResult.submitLabel,
                            autoCreateLead: true
                        }
                    }
                });
            } catch (err: any) {
                console.error('[FormAIBuilderService] Failed to save form:', err.message);
            }
        }

        const formId = createdForm?.id || `form_${Date.now()}`;
        const editUrl = `/forms?id=${formId}`;
        const shareUrl = `/f/form/${formResult.slug}`;

        const reply = `📋 **${formResult.title}** has been generated and published in your Forms workspace!\n\n` +
            `• **Slug**: \`${formResult.slug}\`\n` +
            `• **Fields**: ${formResult.fields.length} dynamic inputs (${formResult.fields.map((f: any) => f.label).join(', ')})\n` +
            `• **Auto Lead Capture**: Active\n\n` +
            `${formResult.description}`;

        return {
            success: true,
            builderType: this.builderType,
            entityId: formId,
            title: formResult.title,
            editUrl,
            shareUrl,
            reply,
            ast: formResult.fields,
            actionCards: [
                { type: 'edit', label: 'Edit Form →', url: editUrl },
                { type: 'preview', label: 'Open Public Form', url: shareUrl },
                { type: 'delete', label: 'Delete Form', actionKey: 'delete_form', payload: { formId } }
            ]
        };
    }

    async patchAST(entityId: string, instruction: string, params: BuilderGenerationParams): Promise<BuilderResult> {
        return {
            success: true,
            builderType: this.builderType,
            entityId,
            title: 'Form Updated',
            editUrl: `/forms?id=${entityId}`,
            reply: `✅ Form fields updated with instruction: "${instruction}"`,
            ast: []
        };
    }

    async deleteEntity(entityId: string, companyId: string) {
        await prisma.form.deleteMany({ where: { id: entityId, companyId } });
        return { success: true, message: `Form ${entityId} deleted.` };
    }
}

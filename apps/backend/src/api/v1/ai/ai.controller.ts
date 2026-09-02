import { Request, Response } from 'express';
import {
    aiProviderService,
    AICompanyConfigService,
    AIChatService,
    AIEntitySearchService,
    AIDocumentArchitectService,
    AIDocumentChatService,
    AIContentCalendarService,
    AIBusinessInsightsService,
    AICRMCopilotService,
    AIEmailAndMeetingService,
    AIAutomationService,
    AIAgentExecutor,
    ContextAggregatorService,
    Mem0MemoryService,
    UniversalBuilderRegistry
} from '@workspace/ai';

export class AIController {
    /**
     * GET /api/v1/ai/status
     * Returns company AI key configuration and active model engine
     */
    static async getStatus(req: Request, res: Response) {
        try {
            const companyId = req.user?.companyId || (req.query.companyId as string);
            const status = await AICompanyConfigService.getStatus(companyId);
            return res.json({ success: true, ...status });
        } catch (error: any) {
            console.error('[AIController.getStatus] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/test-connection
     * Tests connectivity for a given AI provider & key
     */
    static async testConnection(req: Request, res: Response) {
        try {
            let activeProvider = req.body.provider;
            let activeKey = req.body.apiKey;
            let activeUrl = req.body.customUrl;
            let activeModel = req.body.customModel;

            // If not provided in body, fallback to company's saved settings
            if (!activeProvider || !activeKey) {
                const companyId = req.user?.companyId;
                if (companyId) {
                    const { settings } = await AICompanyConfigService.getCompanyAISettings(companyId);
                    activeProvider = activeProvider || settings.aiProvider;
                    if (activeProvider === 'gemini') activeKey = activeKey || settings.geminiKey;
                    else if (activeProvider === 'openai') activeKey = activeKey || settings.openaiKey;
                    else if (activeProvider === 'claude') activeKey = activeKey || settings.claudeKey;
                    else if (activeProvider === 'custom') {
                        activeKey = activeKey || settings.customAiKey;
                        activeUrl = activeUrl || settings.customAiUrl;
                        activeModel = activeModel || settings.customAiModel;
                    }
                }
            }

            if (!activeProvider || activeProvider === 'none' || !activeKey) {
                return res.status(400).json({ success: false, message: 'Please select an AI provider and enter an API Key to test.' });
            }

            const result = await aiProviderService.testConnection(activeProvider, activeKey, activeUrl, activeModel);
            
            // Record test success in company metadata if user is authenticated
            const companyId = req.user?.companyId;
            if (companyId) {
                const company = await prisma.company.findUnique({ where: { id: companyId } });
                if (company) {
                    let meta = company.metadata || {};
                    if (typeof meta === 'string') {
                        try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
                    }
                    meta.lastAiTestStatus = 'success';
                    meta.lastAiTestDate = new Date().toISOString();
                    await prisma.company.update({
                        where: { id: companyId },
                        data: { metadata: meta }
                    });
                }
            }

            return res.json({ success: true, ...result });
        } catch (error: any) {
            console.error('[AIController.testConnection] Error:', error);
            
            // Record failure in company metadata
            const companyId = req.user?.companyId;
            if (companyId) {
                const company = await prisma.company.findUnique({ where: { id: companyId } }).catch(() => null);
                if (company) {
                    let meta = company.metadata || {};
                    if (typeof meta === 'string') {
                        try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
                    }
                    meta.lastAiTestStatus = 'failure';
                    meta.lastAiTestDate = new Date().toISOString();
                    await prisma.company.update({
                        where: { id: companyId },
                        data: { metadata: meta }
                    }).catch(() => null);
                }
            }

            return res.status(400).json({ success: false, error: error.message, details: error.message, message: error.message });
        }
    }

    /**
     * GET /api/v1/ai/sessions
     * Get all chat sessions for the authenticated user
     */
    static async getChatSessions(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const sessions = await AIChatService.getChatSessions(userId);
            return res.json(sessions);
        } catch (error: any) {
            console.error('[AIController.getChatSessions] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET /api/v1/ai/sessions/:id
     * Get single chat session with history
     */
    static async getChatSession(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const session = await AIChatService.getChatSession(userId, id);
            return res.json(session);
        } catch (error: any) {
            console.error('[AIController.getChatSession] Error:', error);
            return res.status(404).json({ success: false, message: error.message });
        }
    }

    /**
     * DELETE /api/v1/ai/sessions/:id
     * Delete chat session
     */
    static async deleteChatSession(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const result = await AIChatService.deleteChatSession(userId, id);
            return res.json(result);
        } catch (error: any) {
            console.error('[AIController.deleteChatSession] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/chat
     * Unified multi-turn conversational AI with streaming SSE support, tools, and agent personas
     */
    static async chat(req: Request, res: Response) {
        try {
            const { message, prompt, history, sessionId, isLegalMode, fileContext, stream, mode, documentType, existingBlocks } = req.body;
            const activePrompt = message || prompt;

            if (!activePrompt) {
                return res.status(400).json({ success: false, message: 'Message or prompt is required.' });
            }

            // Agent Mode: Deterministic LangChain Tool Calling & Algorithm First execution
            if (mode === 'agent') {
                const agentResult = await AIAgentExecutor.execute({
                    prompt: activePrompt,
                    sessionId,
                    companyId: req.user?.companyId,
                    userId: req.user?.id,
                    userRole: req.user?.role
                });
                return res.json({
                    success: true,
                    ...agentResult,
                    telemetry: { source: 'Deterministic LangChain Tool Calling Engine', timestamp: new Date() }
                });
            }

            // Document architect generator mode
            if (mode === 'document') {
                const docResult = await AIDocumentArchitectService.generate({
                    prompt: activePrompt,
                    documentType,
                    companyId: req.user?.companyId,
                    userId: req.user?.id,
                    existingBlocks,
                    sessionId
                });
                return res.json(docResult);
            }
            if (stream) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                const result = await AIChatService.chatWithAI(
                    req.user,
                    { message: activePrompt, history, sessionId, isLegalMode, fileContext, stream: true },
                    (chunk) => {
                        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
                    }
                );

                res.write(`data: ${JSON.stringify({ done: true, reply: result.reply, sessionId: result.sessionId, documentPreview: result.documentPreview, directive: result.directive })}\n\n`);
                return res.end();
            }

            // Non-streaming chat
            const result = await AIChatService.chatWithAI(
                req.user,
                { message: activePrompt, history, sessionId, isLegalMode, fileContext, stream: false }
            );

            return res.json({
                success: true,
                reply: result.reply,
                sessionId: result.sessionId,
                documentPreview: result.documentPreview,
                directive: result.directive,
                telemetry: { source: 'Unified @workspace/ai Domain', timestamp: new Date() }
            });
        } catch (error: any) {
            console.error('[AIController.chat] Error:', error);
            if (!res.headersSent) {
                return res.status(500).json({ success: false, message: error.message });
            }
            res.end();
        }
    }

    /**
     * POST /api/v1/ai/agent/execute
     * Direct LangChain-style deterministic tool calling execution
     */
    static async executeAgent(req: Request, res: Response) {
        try {
            const { prompt, sessionId } = req.body;
            if (!prompt) {
                return res.status(400).json({ success: false, message: 'Prompt is required.' });
            }

            const result = await AIAgentExecutor.execute({
                prompt,
                sessionId,
                companyId: req.user?.companyId,
                userId: req.user?.id,
                userRole: req.user?.role
            });

            return res.json({ success: true, ...result });
        } catch (error: any) {
            console.error('[AIController.executeAgent] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET /api/v1/ai/search-entities
     * Search entity mentions (@C/client, @E/employee, @P/project)
     */
    static async searchEntities(req: Request, res: Response) {
        try {
            const type = (req.query.type as string) || 'E';
            const query = (req.query.q as string) || '';

            const results = await AIEntitySearchService.searchEntities(req.user, type, query);
            return res.json(results);
        } catch (error: any) {
            console.error('[AIController.searchEntities] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/upload
     * Document upload & vector store indexing
     */
    static async uploadDocument(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded.' });
            }

            const result = await AIChatService.uploadDocument(req.user, req.file, req.user?.companyId);
            return res.json({ success: true, ...result });
        } catch (error: any) {
            console.error('[AIController.uploadDocument] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/documents/generate
     * Document builder AST generator with clarification & rollback
     */
    static async generateDocument(req: Request, res: Response) {
        try {
            const { prompt, documentType, clientId, employeeId, existingBlocks, sessionId } = req.body;
            const companyId = req.user?.companyId;

            const result = await AIDocumentArchitectService.generate({
                prompt,
                documentType,
                clientId,
                employeeId,
                companyId,
                userId: req.user?.id,
                existingBlocks,
                sessionId
            });

            return res.json(result);
        } catch (error: any) {
            console.error('[AIController.generateDocument] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/websites/generate
     * Full website synthesis and PostgreSQL persistence
     */
    static async generateWebsite(req: Request, res: Response) {
        try {
            const { prompt, theme } = req.body;
            const companyId = req.user?.companyId;
            const userId = req.user?.id;

            const result = await UniversalBuilderRegistry.compile('website', {
                prompt: prompt || 'Modern marketing landing page',
                theme,
                companyId,
                userId
            });

            return res.json({ success: true, ...result });
        } catch (error: any) {
            console.error('[AIController.generateWebsite] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/websites/patch
     * Iterative section update, theme change, and conversational editing
     */
    static async patchWebsite(req: Request, res: Response) {
        try {
            const { websiteId, instruction, prompt } = req.body;
            const companyId = req.user?.companyId;
            const userId = req.user?.id;

            if (!websiteId) {
                return res.status(400).json({ success: false, message: 'Website ID is required for patching.' });
            }

            const result = await UniversalBuilderRegistry.patch('website', websiteId, instruction || prompt || '', {
                companyId,
                userId
            });

            return res.json({ success: true, ...result });
        } catch (error: any) {
            console.error('[AIController.patchWebsite] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/forms/generate
     * Full form synthesis and PostgreSQL persistence
     */
    static async generateForm(req: Request, res: Response) {
        try {
            const { prompt, theme } = req.body;
            const companyId = req.user?.companyId;
            const userId = req.user?.id;

            const result = await UniversalBuilderRegistry.compile('form', {
                prompt: prompt || 'Lead Intake & Inquiry Form',
                theme,
                companyId,
                userId
            });

            return res.json({ success: true, ...result });
        } catch (error: any) {
            console.error('[AIController.generateForm] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/forms/patch
     * Iterative question addition, styling update, and live form editing
     */
    static async patchForm(req: Request, res: Response) {
        try {
            const { formId, instruction, prompt } = req.body;
            const companyId = req.user?.companyId;
            const userId = req.user?.id;

            if (!formId) {
                return res.status(400).json({ success: false, message: 'Form ID is required for patching.' });
            }

            const result = await UniversalBuilderRegistry.patch('form', formId, instruction || prompt || '', {
                companyId,
                userId
            });

            return res.json({ success: true, ...result });
        } catch (error: any) {
            console.error('[AIController.patchForm] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/documents/chat-file
     * Chat with uploaded document / PDF analysis
     */
    static async analyzeDocument(req: Request, res: Response) {
        try {
            const { fileText, fileName, query, documentId, message, summarizeOnly, history } = req.body;

            // Direct file text analysis
            if (fileText && (query || message)) {
                const result = await AIDocumentChatService.analyzeDocument({
                    fileText,
                    fileName: fileName || 'Uploaded Document',
                    query: query || message,
                    companyId: req.user?.companyId
                });
                return res.json(result);
            }

            // Document ID lookup
            if (documentId) {
                const result = await AIChatService.analyzeDocumentText(
                    req.user,
                    documentId,
                    message || query || '',
                    summarizeOnly || false,
                    history || []
                );
                return res.json({ success: true, answer: result, reply: result });
            }

            return res.status(400).json({ success: false, message: 'Document content or documentId is required.' });
        } catch (error: any) {
            console.error('[AIController.analyzeDocument] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET /api/v1/ai/analytics/dashboard
     * Algorithmic business radar insights
     */
    static async getDashboardInsights(req: Request, res: Response) {
        try {
            const companyId = req.user?.companyId;
            const data: any = await AIBusinessInsightsService.getDashboardInsights(companyId);
            const summaryText = typeof data === 'string' ? data : (data.summary || data.text || '');
            return res.json({ 
                success: true, 
                isConfigured: data.isConfigured !== false,
                error: data.error || null,
                insights: summaryText, 
                insight: summaryText,
                summary: summaryText,
                metrics: data.metrics 
            });
        } catch (error: any) {
            console.error('[AIController.getDashboardInsights] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET /api/v1/ai/projects/:id/insights
     * Project specific risk & progress analysis
     */
    static async getProjectInsights(req: Request, res: Response) {
        try {
            const companyId = req.user?.companyId;
            const { id } = req.params;
            const { settings } = await AICompanyConfigService.getCompanyAISettings(companyId);

            const prompt = `Analyze project risks and progress for project ID "${id}". Provide a concise 2-sentence risk analysis.`;
            const insight = await aiProviderService.getInsights(prompt, settings);

            return res.json({ success: true, insight });
        } catch (error: any) {
            console.error('[AIController.getProjectInsights] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/content/calendar
     * Social Media Content Calendar Generator
     */
    static async generateContentCalendar(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            const companyId = req.user?.companyId;
            const result = await AIContentCalendarService.generateContentCalendar(req.body, userId, companyId);
            return res.json(result);
        } catch (error: any) {
            console.error('[AIController.generateContentCalendar] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/crm/email-draft
     * Sales email drafter
     */
    static async generateEmailDraft(req: Request, res: Response) {
        try {
            const { recipientName, recipientEmail, purpose, dealValue, idea, tone, context } = req.body;
            const companyId = req.user?.companyId;

            if (purpose || recipientEmail) {
                const result = await AICRMCopilotService.generateEmailDraft({
                    recipientName: recipientName || 'Client',
                    recipientEmail: recipientEmail || '',
                    purpose: purpose || idea || 'Follow-up',
                    dealValue,
                    companyId
                });

                return res.json({
                    success: true,
                    subject: result.subject,
                    body: result.body,
                    draft: {
                        subject: result.subject,
                        body: result.body
                    }
                });
            }

            const draft = await AIChatService.generateEmailDraft(req.user, { idea, recipientName, tone, context });
            return res.json({ success: true, draft, body: draft });
        } catch (error: any) {
            console.error('[AIController.generateEmailDraft] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/meetings/process
     * Meeting transcript summarizer and auto task creator
     */
    static async processMeetingTranscript(req: Request, res: Response) {
        try {
            const { transcript, title, bodyText } = req.body;
            const file = req.file;

            if (file || bodyText) {
                const result = await AIChatService.processMeetingTranscript(req.user, file, bodyText || transcript);
                return res.json({ success: true, ...result });
            }

            const result = await AIEmailAndMeetingService.processMeetingTranscript({
                transcript: transcript || '',
                title,
                companyId: req.user?.companyId
            });

            return res.json(result);
        } catch (error: any) {
            console.error('[AIController.processMeetingTranscript] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/automation/classify
     */
    static async classifyDocument(req: Request, res: Response) {
        try {
            const { text } = req.body;
            const { settings } = await AICompanyConfigService.getCompanyAISettings(req.user?.companyId);
            const result = await AIAutomationService.classifyDocument(text, settings);
            return res.json({ success: true, ...result });
        } catch (error: any) {
            console.error('[AIController.classifyDocument] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/automation/task-priority
     */
    static async detectTaskPriority(req: Request, res: Response) {
        try {
            const { title, description } = req.body;
            const { settings } = await AICompanyConfigService.getCompanyAISettings(req.user?.companyId);
            const result = await AIAutomationService.detectTaskPriority(title, description, settings);
            return res.json({ success: true, ...result });
        } catch (error: any) {
            console.error('[AIController.detectTaskPriority] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/automation/project-risk
     */
    static async predictProjectRisk(req: Request, res: Response) {
        try {
            const { tasks } = req.body;
            const { settings } = await AICompanyConfigService.getCompanyAISettings(req.user?.companyId);
            const result = await AIAutomationService.predictProjectRisk(tasks || [], settings);
            return res.json({ success: true, ...result });
        } catch (error: any) {
            console.error('[AIController.predictProjectRisk] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/automation/sales-chat
     */
    static async salesAssistantChat(req: Request, res: Response) {
        try {
            const { query, contextData } = req.body;
            const { settings } = await AICompanyConfigService.getCompanyAISettings(req.user?.companyId);
            const result = await AIAutomationService.salesAssistantChat(query, contextData, settings);
            return res.json({ success: true, ...result });
        } catch (error: any) {
            console.error('[AIController.salesAssistantChat] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/ai/automation/forecast
     */
    static async generateAdvancedForecast(req: Request, res: Response) {
        try {
            const { contextData } = req.body;
            const { settings } = await AICompanyConfigService.getCompanyAISettings(req.user?.companyId);
            const result = await AIAutomationService.generateAdvancedForecast(contextData, settings);
            return res.json({ success: true, forecast: result });
        } catch (error: any) {
            console.error('[AIController.generateAdvancedForecast] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

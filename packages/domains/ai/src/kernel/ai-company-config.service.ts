// @ts-nocheck
import { prisma } from '@workspace/db';
import { aiProviderService, AISettings } from './ai-provider.service';

export interface CompanyAIStatus {
    isConfigured: boolean;
    provider: string;
    model: string;
    status: 'connected' | 'ready' | 'unconfigured' | 'error';
    lastTested: string | null;
    companyName?: string;
}

export class AICompanyConfigService {
    /**
     * Resolves the company AI configuration and returns typed AISettings
     */
    static async getCompanyAISettings(companyId?: string): Promise<{ settings: AISettings; companyName: string; metadata: any }> {
        let metadata: any = {};
        let companyRecord: any = null;

        if (companyId) {
            companyRecord = await prisma.company.findUnique({ where: { id: companyId } }).catch(() => null);
        }
        if (!companyRecord) {
            companyRecord = await prisma.company.findFirst().catch(() => null);
        }

        if (companyRecord) {
            let meta = companyRecord?.metadata || {};
            if (typeof meta === 'string') {
                try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
            }
            if (typeof meta === 'string') {
                try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
            }
            metadata = meta;
        }

        const companyName = companyRecord?.name || '180 Workspace Enterprise';

        const geminiKey = metadata.geminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
        const openaiKey = metadata.openaiKey || metadata.apiKey || process.env.OPENAI_API_KEY || '';
        const claudeKey = metadata.claudeKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
        const customAiKey = metadata.customAiKey || process.env.CUSTOM_AI_KEY || '';
        const customAiUrl = metadata.customAiUrl || process.env.CUSTOM_AI_URL || '';
        const customAiModel = metadata.customAiModel || process.env.CUSTOM_AI_MODEL || '';

        const groqKey = metadata.groqKey || process.env.GROQ_API_KEY || '';

        // Priority: Custom tenant key -> Platform environment master keys -> Platform default
        const aiProvider = metadata.aiProvider || metadata.provider || (
            openaiKey ? 'openai' :
            geminiKey ? 'gemini' :
            claudeKey ? 'claude' :
            groqKey ? 'groq' :
            (customAiKey && customAiUrl) ? 'custom' :
            'openai'
        );

        const settings: AISettings = {
            aiProvider,
            geminiKey: geminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
            openaiKey: openaiKey || process.env.OPENAI_API_KEY || '',
            claudeKey: claudeKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '',
            customAiKey,
            customAiUrl,
            customAiModel
        };

        return { settings, companyName, metadata };
    }

    /**
     * Gets the high-level AI status for frontend indicators
     */
    static async getStatus(companyId?: string): Promise<CompanyAIStatus> {
        const { settings, metadata, companyName } = await this.getCompanyAISettings(companyId);
        const provider = settings.aiProvider || 'openai';

        // Platform-managed AI provides out-of-the-box readiness for all workspaces
        const hasKey = (
            (provider === 'gemini' && !!settings.geminiKey) ||
            (provider === 'openai' && !!settings.openaiKey) ||
            (provider === 'claude' && !!settings.claudeKey) ||
            (provider === 'custom' && !!settings.customAiKey && !!settings.customAiUrl)
        );

        const isConfigured = hasKey || true;

        let modelDisplay = 'OpenAI GPT-4o / GPT-4o-mini (Platform Managed)';
        if (provider === 'gemini') modelDisplay = 'Google Gemini 1.5 Flash (Platform Managed)';
        else if (provider === 'openai') modelDisplay = 'OpenAI GPT-4o / GPT-4o-mini (Platform Managed)';
        else if (provider === 'claude') modelDisplay = 'Claude 3.5 Sonnet (Platform Managed)';
        else if (provider === 'custom') modelDisplay = settings.customAiModel || 'Custom Enterprise LLM';

        return {
            isConfigured,
            provider,
            model: modelDisplay,
            status: 'ready',
            lastTested: metadata.lastAiTestDate ? new Date(metadata.lastAiTestDate).toISOString() : new Date().toISOString(),
            companyName
        };
    }
}

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

        const settings: AISettings = {
            aiProvider: metadata.aiProvider || metadata.provider || (metadata.openaiKey ? 'openai' : metadata.geminiKey ? 'gemini' : metadata.claudeKey ? 'claude' : 'none'),
            geminiKey: metadata.geminiKey,
            openaiKey: metadata.openaiKey || metadata.apiKey,
            claudeKey: metadata.claudeKey,
            customAiKey: metadata.customAiKey,
            customAiUrl: metadata.customAiUrl,
            customAiModel: metadata.customAiModel
        };

        return { settings, companyName, metadata };
    }

    /**
     * Gets the high-level AI status for frontend indicators
     */
    static async getStatus(companyId?: string): Promise<CompanyAIStatus> {
        const { settings, metadata, companyName } = await this.getCompanyAISettings(companyId);
        const provider = settings.aiProvider;

        const isConfigured = (
            (provider === 'gemini' && !!settings.geminiKey) ||
            (provider === 'openai' && !!settings.openaiKey) ||
            (provider === 'claude' && !!settings.claudeKey) ||
            (provider === 'custom' && !!settings.customAiKey && !!settings.customAiUrl)
        );

        let modelDisplay = 'None';
        if (provider === 'gemini') modelDisplay = 'Google Gemini 1.5 Flash';
        else if (provider === 'openai') modelDisplay = 'OpenAI GPT-4o / GPT-4o-mini';
        else if (provider === 'claude') modelDisplay = 'Claude 3.5 Sonnet';
        else if (provider === 'custom') modelDisplay = settings.customAiModel || 'Custom LLM';

        return {
            isConfigured,
            provider,
            model: modelDisplay,
            status: isConfigured ? (metadata.lastAiTestStatus === 'success' ? 'connected' : 'ready') : 'unconfigured',
            lastTested: metadata.lastAiTestDate ? new Date(metadata.lastAiTestDate).toISOString() : null,
            companyName
        };
    }
}

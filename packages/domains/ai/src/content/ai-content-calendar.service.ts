// @ts-nocheck
import { prisma, requestContext } from '@workspace/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AICompanyConfigService } from '../kernel/ai-company-config.service';

export class AIContentCalendarService {
    /**
     * Instance method for backwards compatibility
     */
    async generateContentCalendar(config: any, userId?: string, companyIdParam?: string) {
        return AIContentCalendarService.generateContentCalendar(config, userId || '', companyIdParam);
    }

    /**
     * Get the company-specific AI settings
     */
    static async getAiSettings(companyIdParam?: string) {
        const companyId = companyIdParam || (requestContext.getStore()?.companyId as string);
        if (!companyId) return null;

        const { settings } = await AICompanyConfigService.getCompanyAISettings(companyId);
        if (!settings || !settings.aiProvider || settings.aiProvider === 'none') {
            return null;
        }

        return settings;
    }

    /**
     * Generates the master prompt for social media content calendar creation
     */
    static buildMasterPrompt(config: any) {
        const {
            durationWords = '1 month',
            startDate,
            endDate,
            frequency = 'Weekly',
            industry = config.industry || config.brand_industry,
            brandVoice = config.brandVoice || config.brand_voice,
            targetAudience = config.targetAudience || config.target_audience,
            platforms = config.platforms || [],
            contentTypeMix = config.contentTypeMix || config.content_type_mix || {},
            engagementGoal = config.engagementGoal || config.engagement_goal || 'Growth'
        } = config;

        // Calculate expected number of pieces
        let weeks = 4;
        if (durationWords.includes('1 week')) weeks = 1;
        if (durationWords.includes('2 weeks')) weeks = 2;
        if (durationWords.includes('month')) weeks = 4.3;

        let postsPerWeek = 3;
        if (frequency.toLowerCase() === 'daily') postsPerWeek = 7;
        else if (frequency.includes('1x')) postsPerWeek = 1;
        else if (frequency.includes('3x')) postsPerWeek = 3;
        else if (frequency.includes('5x')) postsPerWeek = 5;

        const targetCount = Math.floor(weeks * postsPerWeek) || 6;

        // Calculate distribution
        let mixInstructions = '';
        if (Object.keys(contentTypeMix).length > 0) {
            mixInstructions = Object.entries(contentTypeMix)
                .map(([type, percentage]) => `- ${percentage}% ${type}`)
                .join('\n');
        } else {
            mixInstructions = 'Balanced mix of educational, promotional, and engaging content.';
        }

        return `
SYSTEM ROLE: Content Calendar Creator Engine for 180 Workspace
YOU ARE: An enterprise-grade content calendar creation assistant skilled in viral marketing and brand strategy.
YOUR GOAL: Generate a high-quality, perfectly structured social media content calendar based on the user's specific parameters.

PARAMETERS SET BY USER:
- Duration: ${durationWords} (From ${startDate || 'Today'} to ${endDate || 'Next Month'})
- Posting Frequency: ${frequency}
- REQUIRED TOTAL CONTENT PIECES: ${targetCount}
- Industry/Niche: ${industry || 'General Business'}
- Brand Voice: ${brandVoice || 'Professional & Engaging'}
- Target Audience: ${targetAudience || 'General Audience'}
- Selected Platforms: ${platforms.length > 0 ? platforms.join(', ') : 'LinkedIn, Twitter, Instagram'}
- Main Goal: ${engagementGoal}
- Content Mix Distribution:
${mixInstructions}

CRITICAL INSTRUCTIONS:
1. QUANTITY IS MANDATORY: You MUST generate exactly ${targetCount} content pieces. Do NOT truncate, do NOT use "..." or examples.
2. Full Ad Copy: Provide COMPLETE, ready-to-publish captions.
3. Researched Hashtags: Provide high-performance, niche-relevant hashtags.
4. Output format: You MUST return ONLY a valid JSON array of objects with NO markdown formatting blocks.

JSON ARRAY FORMAT:
[
  {
    "dateScheduled": "2025-05-01T10:00:00Z",
    "platform": "LinkedIn", 
    "contentType": "Post", 
    "pillar": "Educational",
    "headline": "Opening headline",
    "adCopyFull": "Full copy text...",
    "videoScriptOrHooks": "Hooks if video...",
    "visualAssetsBrief": "Brief for graphic...",
    "hashtags": ["#marketing", "#b2b"],
    "callToAction": "Click link in bio",
    "engagementTarget": {
        "estimatedImpressions": 1200,
        "estimatedEngagementPercent": 4.5
    }
  }
]
`;
    }

    /**
     * Generate content calendar using the configured AI provider
     */
    static async generateContentCalendar(config: any, userId: string, companyIdParam?: string) {
        const startTime = Date.now();
        let providerUsed = 'unknown';
        const promptContent = this.buildMasterPrompt(config);

        try {
            const settings = await this.getAiSettings(companyIdParam);
            if (!settings) {
                return {
                    success: false,
                    error: 'AI Provider is not configured or disabled for this workspace. Please update your Settings.'
                };
            }

            providerUsed = settings.aiProvider;
            let rawAiResponse = '';

            if (providerUsed === 'openai') {
                if (!settings.openaiKey) throw new Error('OpenAI API key is missing in settings.');
                const openai = new OpenAI({ apiKey: settings.openaiKey });
                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant designed to output strict JSON arrays only.' },
                        { role: 'user', content: promptContent }
                    ],
                    model: 'gpt-4o',
                    temperature: 0.7,
                });
                rawAiResponse = completion.choices[0]?.message?.content || '';
            } else if (providerUsed === 'gemini') {
                if (!settings.geminiKey) throw new Error('Gemini API key is missing in settings.');
                const genAI = new GoogleGenerativeAI(settings.geminiKey);
                const model = genAI.getGenerativeModel({
                    model: 'gemini-1.5-flash',
                    generationConfig: { responseMimeType: 'application/json' }
                });
                const result = await model.generateContent(promptContent);
                rawAiResponse = result.response.text();
            } else if (providerUsed === 'claude') {
                if (!settings.claudeKey) throw new Error('Claude API key is missing in settings.');
                const anthropic = new Anthropic({ apiKey: settings.claudeKey });
                const msg = await anthropic.messages.create({
                    model: 'claude-3-5-sonnet-20240620',
                    max_tokens: 4000,
                    system: 'You are a helpful assistant designed to output strict JSON arrays only. Do not wrap in markdown tags.',
                    messages: [{ role: 'user', content: promptContent }]
                });
                rawAiResponse = (msg.content[0] as any)?.text || '';
            } else if (providerUsed === 'custom') {
                if (!settings.customAiKey || !settings.customAiUrl) throw new Error('Custom AI settings missing.');
                const openai = new OpenAI({ apiKey: settings.customAiKey, baseURL: settings.customAiUrl });
                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant designed to output strict JSON arrays only.' },
                        { role: 'user', content: promptContent }
                    ],
                    model: settings.customAiModel || 'default-model',
                    temperature: 0.7
                });
                rawAiResponse = completion.choices[0]?.message?.content || '';
            }

            // Parse and Validate Response
            let parsedData: any;
            try {
                let cleanResponse = rawAiResponse;
                if (cleanResponse.startsWith('```json')) {
                    cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (cleanResponse.startsWith('```')) {
                    cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }

                parsedData = JSON.parse(cleanResponse);
                if (!Array.isArray(parsedData) && parsedData.data && Array.isArray(parsedData.data)) {
                    parsedData = parsedData.data;
                } else if (!Array.isArray(parsedData)) {
                    const possibleArrayMatch = Object.values(parsedData).find(val => Array.isArray(val));
                    if (possibleArrayMatch) {
                        parsedData = possibleArrayMatch;
                    } else {
                        throw new Error('AI response was JSON but root is not an array');
                    }
                }
            } catch (parseError) {
                console.error('[AIContentCalendarService] Failed to parse AI response:', parseError);
                await this.logAiRequest({
                    provider: providerUsed,
                    endpoint: 'generateContentCalendar',
                    durationMs: Date.now() - startTime,
                    status: 'failed',
                    errorMessage: 'Failed to parse JSON response from AI',
                    requestedBy: userId,
                    companyId: companyIdParam
                });
                return { success: false, error: 'AI generated invalid data format. Please try again.' };
            }

            const contentPieces = parsedData.map((item: any) => ({
                platform: item.platform || 'General',
                contentType: item.contentType || 'Post',
                pillar: item.pillar || item.category || 'General',
                dateScheduled: item.dateScheduled ? new Date(item.dateScheduled) : (item.scheduledDate ? new Date(item.scheduledDate) : new Date()),
                headline: item.headline || '',
                adCopyFull: item.adCopyFull || item.copy || '',
                videoScriptOrHooks: item.videoScriptOrHooks || item.script || '',
                visualAssetsBrief: item.visualAssetsBrief || item.visualDescription || '',
                hashtagsResearched: Array.isArray(item.hashtags) ? item.hashtags.join(' ') : (item.hashtags || ''),
                callToAction: item.callToAction || '',
                status: 'ready',
                engagementTarget: {
                    estimatedImpressions: item.engagementTarget?.estimatedImpressions?.toString() || '0',
                    estimatedEngagementPercent: item.engagementTarget?.estimatedEngagementPercent || 0,
                    estimatedShares: item.engagementTarget?.estimatedShares?.toString() || '0'
                }
            }));

            return {
                success: true,
                data: contentPieces,
                meta: {
                    provider: providerUsed,
                    durationMs: Date.now() - startTime
                }
            };
        } catch (error: any) {
            console.error(`[AIContentCalendarService] Error generating calendar (${providerUsed}):`, error);
            return {
                success: false,
                error: 'An error occurred while communicating with the AI provider.',
                meta: {
                    provider: providerUsed,
                    durationMs: Date.now() - startTime
                }
            };
        }
    }

    /**
     * Log an AI request to the database
     */
    static async logAiRequest(data: any) {
        try {
            const companyId = data.companyId || requestContext.getStore()?.companyId;
            if (!companyId || !(prisma as any).aiRequestLog) return;
            await (prisma as any).aiRequestLog.create({
                data: {
                    ...data,
                    companyId
                }
            });
        } catch (err: any) {
            console.error('[AIContentCalendarService] Failed to log AI request:', err.message);
        }
    }
}

export const aiContentCalendarService = new AIContentCalendarService();
export const AiContentService = AIContentCalendarService;
export const aiContentService = aiContentCalendarService;

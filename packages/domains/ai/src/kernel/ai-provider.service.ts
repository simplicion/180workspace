import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface AISettings {
    aiProvider: 'gemini' | 'openai' | 'claude' | 'custom' | string;
    geminiKey?: string;
    openaiKey?: string;
    claudeKey?: string;
    customAiKey?: string;
    customAiUrl?: string;
    customAiModel?: string;
}

export interface AIClient {
    provider: string;
    generate: (prompt: string, options?: any) => Promise<string>;
    generateStream: (prompt: string, options?: any, onChunk?: (chunk: string) => void) => Promise<string>;
}

export class AIProviderService {
    private static instance: AIProviderService;

    public static getInstance(): AIProviderService {
        if (!AIProviderService.instance) {
            AIProviderService.instance = new AIProviderService();
        }
        return AIProviderService.instance;
    }

    /**
     * Instantiates an active LLM client from configured company settings.
     * All providers now support both `generate` and `generateStream`.
     */
    async getClient(settings: AISettings): Promise<AIClient | null> {
        if (!settings || !settings.aiProvider || settings.aiProvider === 'none') return null;
        const provider = settings.aiProvider;

        try {
            if (provider === 'gemini') {
                const key = (settings.geminiKey || '').trim();
                if (!key) return null;

                const genAI = new GoogleGenerativeAI(key);
                const candidateModels = [
                    'gemini-1.5-flash',
                    'gemini-1.5-flash-latest',
                    'gemini-2.0-flash',
                    'gemini-1.5-pro',
                    'gemini-pro'
                ];

                return {
                    provider: 'gemini',
                    generate: async (prompt: string, options: any = {}) => {
                        const generationConfig = options.max_tokens ? { maxOutputTokens: options.max_tokens } : {};
                        let lastErr: any = null;
                        for (const modelName of candidateModels) {
                            try {
                                const model = genAI.getGenerativeModel({ model: modelName, generationConfig });
                                const result = await model.generateContent(prompt);
                                return result.response.text();
                            } catch (err) {
                                lastErr = err;
                            }
                        }
                        throw lastErr || new Error('All Gemini candidate models failed.');
                    },
                    generateStream: async (prompt: string, options: any = {}, onChunk?: (chunk: string) => void) => {
                        const generationConfig = options.max_tokens ? { maxOutputTokens: options.max_tokens } : {};
                        let lastErr: any = null;
                        for (const modelName of candidateModels) {
                            try {
                                const model = genAI.getGenerativeModel({ model: modelName, generationConfig });
                                const result = await model.generateContentStream(prompt);
                                let text = '';
                                for await (const chunk of result.stream) {
                                    const chunkText = chunk.text();
                                    text += chunkText;
                                    if (onChunk) onChunk(chunkText);
                                }
                                return text;
                            } catch (err) {
                                lastErr = err;
                            }
                        }
                        throw lastErr || new Error('All Gemini candidate models failed.');
                    }
                };
            }

            if (provider === 'openai') {
                const key = (settings.openaiKey || '').trim();
                if (!key) return null;
                const openai = new OpenAI({ apiKey: key });

                return {
                    provider: 'openai',
                    generate: async (prompt: string, options: any = {}) => {
                        const reqOptions: any = {
                            messages: [{ role: 'user' as const, content: prompt }],
                            model: options.model || 'gpt-4o',
                            temperature: options.temperature || 0.7
                        };
                        if (options.max_tokens) reqOptions.max_tokens = options.max_tokens;
                        const completion = await openai.chat.completions.create(reqOptions);
                        return completion.choices[0]?.message?.content || '';
                    },
                    generateStream: async (prompt: string, options: any = {}, onChunk?: (chunk: string) => void) => {
                        const reqOptions: any = {
                            messages: [{ role: 'user' as const, content: prompt }],
                            model: options.model || 'gpt-4o',
                            stream: true,
                            temperature: options.temperature || 0.7
                        };
                        if (options.max_tokens) reqOptions.max_tokens = options.max_tokens;
                        const stream = await openai.chat.completions.create(reqOptions);
                        let text = '';
                        for await (const chunk of stream as any) {
                            const content = chunk.choices[0]?.delta?.content || '';
                            text += content;
                            if (onChunk && content) onChunk(content);
                        }
                        return text;
                    }
                };
            }

            if (provider === 'claude') {
                const key = (settings.claudeKey || '').trim();
                if (!key) return null;
                const anthropic = new Anthropic({ apiKey: key });

                return {
                    provider: 'claude',
                    generate: async (prompt: string, options: any = {}) => {
                        const reqOptions: any = {
                            model: options.model || 'claude-3-5-sonnet-20240620',
                            max_tokens: options.max_tokens || 1024,
                            messages: [{ role: 'user' as const, content: prompt }]
                        };
                        const msg = await anthropic.messages.create(reqOptions);
                        return (msg.content[0] as any)?.text || '';
                    },
                    generateStream: async (prompt: string, options: any = {}, onChunk?: (chunk: string) => void) => {
                        const reqOptions: any = {
                            model: options.model || 'claude-3-5-sonnet-20240620',
                            max_tokens: options.max_tokens || 1024,
                            messages: [{ role: 'user' as const, content: prompt }],
                            stream: true
                        };
                        const stream = await anthropic.messages.create(reqOptions);
                        let text = '';
                        for await (const event of stream as any) {
                            if (event.type === 'content_block_delta' && (event.delta as any).type === 'text_delta') {
                                const chunk = (event.delta as any).text;
                                text += chunk;
                                if (onChunk) onChunk(chunk);
                            }
                        }
                        return text;
                    }
                };
            }

            if (provider === 'custom') {
                const key = (settings.customAiKey || '').trim();
                const baseURL = (settings.customAiUrl || '').trim();
                if (!key || !baseURL) return null;

                const customOpenAI = new OpenAI({
                    apiKey: key,
                    baseURL
                });

                return {
                    provider: 'custom',
                    generate: async (prompt: string, options: any = {}) => {
                        const reqOptions: any = {
                            messages: [{ role: 'user' as const, content: prompt }],
                            model: settings.customAiModel || options.model || 'default-model',
                            temperature: options.temperature || 0.7
                        };
                        if (options.max_tokens) reqOptions.max_tokens = options.max_tokens;
                        const completion = await customOpenAI.chat.completions.create(reqOptions);
                        return completion.choices[0]?.message?.content || '';
                    },
                    generateStream: async (prompt: string, options: any = {}, onChunk?: (chunk: string) => void) => {
                        const reqOptions: any = {
                            messages: [{ role: 'user' as const, content: prompt }],
                            model: settings.customAiModel || options.model || 'default-model',
                            stream: true,
                            temperature: options.temperature || 0.7
                        };
                        if (options.max_tokens) reqOptions.max_tokens = options.max_tokens;
                        const stream = await customOpenAI.chat.completions.create(reqOptions);
                        let text = '';
                        for await (const chunk of stream as any) {
                            const content = chunk.choices[0]?.delta?.content || '';
                            text += content;
                            if (onChunk && content) onChunk(content);
                        }
                        return text;
                    }
                };
            }
        } catch (error) {
            console.error('[AIProviderService] Error initializing AI client:', error);
            return null;
        }

        return null;
    }

    /**
     * Convenience method: Generate insights using the company's AI provider.
     * Direct port of old `aiService.getInsights()`.
     */
    async getInsights(prompt: string, settings: AISettings, options: any = {}): Promise<string> {
        const client = await this.getClient(settings);
        if (!client) {
            return 'AI Insights currently unavailable. Please configure your AI provider in Settings.';
        }

        try {
            return await client.generate(prompt, options);
        } catch (err: any) {
            console.error(`[AIProviderService] Insight generation failed (${client.provider}):`, err.message);
            return 'Failed to generate AI insights. Please check your API key and connection settings.';
        }
    }

    /**
     * Convenience method: Stream insights using the company's AI provider.
     * Direct port of old `aiService.getInsightsStream()`.
     */
    async getInsightsStream(prompt: string, settings: AISettings, options: any = {}, onChunk?: (chunk: string) => void): Promise<string> {
        const client = await this.getClient(settings);
        if (!client) {
            const msg = 'AI Insights currently unavailable. Please configure your AI provider in Settings.';
            if (onChunk) onChunk(msg);
            return msg;
        }

        try {
            if (!client.generateStream) {
                const res = await client.generate(prompt, options);
                if (onChunk) onChunk(res);
                return res;
            }
            return await client.generateStream(prompt, options, onChunk);
        } catch (err: any) {
            console.error(`[AIProviderService] Insight streaming failed (${client.provider}):`, err.message);
            const errMsg = 'Failed to generate AI insights. Please check your API key and connection settings.';
            if (onChunk) onChunk(errMsg);
            return errMsg;
        }
    }

    /**
     * Live test connection for any provider
     */
    async testConnection(provider: string, apiKey: string, customUrl?: string, customModel?: string): Promise<{ success: boolean; message: string; text?: string }> {
        const trimmedKey = (apiKey || '').trim();
        if (!trimmedKey) {
            throw new Error('API Key is required.');
        }

        if (provider === 'gemini') {
            if (trimmedKey.startsWith('AQ.') || trimmedKey.startsWith('ya29.')) {
                throw new Error('The key entered appears to be an OAuth Access Token. The Gemini API expects an API Key generated from Google AI Studio (https://aistudio.google.com/app/apikey), which typically starts with "AIzaSy...". If using Vertex/Cloud, select the "Custom (Unified)" provider.');
            }

            const genAI = new GoogleGenerativeAI(trimmedKey);
            const candidateModels = [
                'gemini-1.5-flash',
                'gemini-1.5-flash-latest',
                'gemini-2.0-flash',
                'gemini-1.5-pro',
                'gemini-pro'
            ];

            let lastErr: any = null;
            for (const modelName of candidateModels) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent("Say '180 Workspace AI Connection Successful'");
                    const text = result.response.text();
                    if (text) {
                        return { success: true, message: `Connected to Google Gemini (${modelName})`, text };
                    }
                } catch (err: any) {
                    lastErr = err;
                }
            }

            const msg = lastErr?.message || '';
            if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
                throw new Error('Invalid Gemini API Key. Please verify key from Google AI Studio (https://aistudio.google.com/app/apikey).');
            }
            if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
                throw new Error('Gemini API Quota Exceeded. Please check your project billing or rate limits.');
            }
            throw new Error(`Gemini connection error: ${msg}`);
        }

        if (provider === 'openai') {
            const openai = new OpenAI({ apiKey: trimmedKey });
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: "Say '180 Workspace AI Connection Successful'" }],
                max_tokens: 20
            });
            return {
                success: true,
                message: 'Connected to OpenAI',
                text: response.choices[0]?.message?.content || ''
            };
        }

        if (provider === 'claude') {
            const anthropic = new Anthropic({ apiKey: trimmedKey });
            const response = await anthropic.messages.create({
                model: 'claude-3-5-sonnet-20240620',
                messages: [{ role: 'user', content: "Say '180 Workspace AI Connection Successful'" }],
                max_tokens: 20
            });
            const block = response.content[0];
            return {
                success: true,
                message: 'Connected to Anthropic Claude',
                text: block.type === 'text' ? block.text : ''
            };
        }

        if (provider === 'custom') {
            if (!customUrl) throw new Error('Custom Base URL is required.');
            const customOpenAI = new OpenAI({ apiKey: trimmedKey, baseURL: customUrl.trim() });
            const response = await customOpenAI.chat.completions.create({
                model: customModel || 'default-model',
                messages: [{ role: 'user', content: "Say '180 Workspace AI Connection Successful'" }],
                max_tokens: 20
            });
            return {
                success: true,
                message: 'Connected to Custom AI Endpoint',
                text: response.choices[0]?.message?.content || ''
            };
        }

        throw new Error(`Unsupported AI provider: ${provider}`);
    }
}

export const aiProviderService = AIProviderService.getInstance();

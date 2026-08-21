import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface AISettings {
    aiProvider?: string;
    geminiKey?: string;
    openaiKey?: string;
    claudeKey?: string;
    customAiKey?: string;
    customAiUrl?: string;
    customAiModel?: string;
}

export class AIService {
    /**
     * Gets a configured AI client
     * @param settings - Company-specific settings (optional)
     */
    async getClient(settings?: AISettings | null): Promise<any> {
        if (!settings || !settings.aiProvider || settings.aiProvider === 'none') {
            return null;
        }

        const provider = settings.aiProvider;

        try {
            if (provider === 'gemini') {
                if (!settings.geminiKey) return null;
                const genAI = new GoogleGenerativeAI(settings.geminiKey);
                return {
                    provider: 'gemini',
                    client: genAI.getGenerativeModel({ model: "gemini-1.5-flash" }),
                    generate: async (prompt: string, options: any = {}) => {
                        const generationConfig = options.max_tokens ? { maxOutputTokens: options.max_tokens } : {};
                        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig });
                        const result = await model.generateContent(prompt);
                        return result.response.text();
                    },
                    generateStream: async (prompt: string, options: any = {}, onChunk?: (chunk: string) => void) => {
                        const generationConfig = options.max_tokens ? { maxOutputTokens: options.max_tokens } : {};
                        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig });
                        const result = await model.generateContentStream(prompt);
                        let text = '';
                        for await (const chunk of result.stream) {
                            const chunkText = chunk.text();
                            text += chunkText;
                            if (onChunk) onChunk(chunkText);
                        }
                        return text;
                    }
                };
            }

            if (provider === 'openai') {
                if (!settings.openaiKey) return null;
                const openai = new OpenAI({ apiKey: settings.openaiKey });
                return {
                    provider: 'openai',
                    client: openai,
                    generate: async (prompt: string, options: any = {}) => {
                        const reqOptions: any = {
                            messages: [{ role: "user", content: prompt }],
                            model: "gpt-3.5-turbo",
                        };
                        if (options.max_tokens) reqOptions.max_tokens = options.max_tokens;
                        const completion = await openai.chat.completions.create(reqOptions);
                        return completion.choices[0].message.content;
                    },
                    generateStream: async (prompt: string, options: any = {}, onChunk?: (chunk: string) => void) => {
                        const reqOptions: any = {
                            messages: [{ role: "user", content: prompt }],
                            model: "gpt-3.5-turbo",
                            stream: true,
                        };
                        if (options.max_tokens) reqOptions.max_tokens = options.max_tokens;
                        const stream = await openai.chat.completions.create(reqOptions);
                        let text = '';
                        for await (const chunk of (stream as any)) {
                            const content = chunk.choices[0]?.delta?.content || '';
                            text += content;
                            if (onChunk && content) onChunk(content);
                        }
                        return text;
                    }
                };
            }

            if (provider === 'claude') {
                if (!settings.claudeKey) return null;
                const anthropic = new Anthropic({ apiKey: settings.claudeKey });
                return {
                    provider: 'claude',
                    client: anthropic,
                    generate: async (prompt: string, options: any = {}) => {
                        const reqOptions: any = {
                            model: "claude-3-5-sonnet-20240620",
                            max_tokens: options.max_tokens || 1024,
                            messages: [{ role: "user", content: prompt }]
                        };
                        const msg = await anthropic.messages.create(reqOptions);
                        return (msg.content[0] as any)?.text || '';
                    },
                    generateStream: async (prompt: string, options: any = {}, onChunk?: (chunk: string) => void) => {
                        const reqOptions: any = {
                            model: "claude-3-5-sonnet-20240620",
                            max_tokens: options.max_tokens || 1024,
                            messages: [{ role: "user", content: prompt }],
                            stream: true
                        };
                        const stream = await anthropic.messages.create(reqOptions);
                        let text = '';
                        for await (const event of (stream as any)) {
                            if (event.type === 'content_block_delta' && (event.delta as any).type === 'text_delta') {
                                text += (event.delta as any).text;
                                if (onChunk) onChunk((event.delta as any).text);
                            }
                        }
                        return text;
                    }
                };
            }

            if (provider === 'custom') {
                if (!settings.customAiKey || !settings.customAiUrl || !settings.customAiModel) return null;
                const openai = new OpenAI({ 
                    apiKey: settings.customAiKey, 
                    baseURL: settings.customAiUrl 
                });
                return {
                    provider: 'custom',
                    client: openai,
                    generate: async (prompt: string, options: any = {}) => {
                        const reqOptions: any = {
                            messages: [{ role: "user", content: prompt }],
                            model: settings.customAiModel,
                        };
                        if (options.max_tokens) reqOptions.max_tokens = options.max_tokens;
                        const completion = await openai.chat.completions.create(reqOptions);
                        return completion.choices[0].message.content;
                    },
                    generateStream: async (prompt: string, options: any = {}, onChunk?: (chunk: string) => void) => {
                        const reqOptions: any = {
                            messages: [{ role: "user", content: prompt }],
                            model: settings.customAiModel,
                            stream: true
                        };
                        if (options.max_tokens) reqOptions.max_tokens = options.max_tokens;
                        const stream = await openai.chat.completions.create(reqOptions);
                        let text = '';
                        for await (const chunk of (stream as any)) {
                            const content = chunk.choices[0]?.delta?.content || '';
                            text += content;
                            if (onChunk && content) onChunk(content);
                        }
                        return text;
                    }
                };
            }
        } catch (err: any) {
            console.error(`[AI Service] Initialization failed for ${provider}:`, err.message);
            return null;
        }

        return null;
    }

    /**
     * Generates insights using the configured provider
     */
    async getInsights(prompt: string, settings: AISettings, options: any = {}): Promise<string> {
        const client = await this.getClient(settings);
        if (!client) {
            return "AI Insights currently unavailable. Please configure your AI provider in Settings.";
        }

        try {
            return await client.generate(prompt, options);
        } catch (err: any) {
            console.error(`[AI Service] Insight generation failed (${client.provider}):`, err.message);
            return "Failed to generate AI insights. Please check your API key and connection settings.";
        }
    }

    /**
     * Generates insights using the configured provider via Streaming
     */
    async getInsightsStream(prompt: string, settings: AISettings, options: any = {}, onChunk?: (chunk: string) => void): Promise<string> {
        const client = await this.getClient(settings);
        if (!client) {
            if (onChunk) onChunk("AI Insights currently unavailable. Please configure your AI provider in Settings.");
            return "AI Insights currently unavailable. Please configure your AI provider in Settings.";
        }

        try {
            if (!client.generateStream) {
                // Fallback to non-streaming if provider doesn't support it yet
                const res = await client.generate(prompt, options);
                if (onChunk) onChunk(res);
                return res;
            }
            return await client.generateStream(prompt, options, onChunk);
        } catch (err: any) {
            console.error(`[AI Service] Insight streaming failed (${client.provider}):`, err.message);
            const errMsj = "Failed to generate AI insights. Please check your API key and connection settings.";
            if (onChunk) onChunk(errMsj);
            return errMsj;
        }
    }
}

export const aiService = new AIService();




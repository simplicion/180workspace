'use strict';

/**
 * AI Service for dynamic provider management
 * Supports multi-tenancy by accepting tenant-specific settings
 */
class AIService {
    /**
     * Gets a configured AI client
     * @param {Object} settings - Tenant-specific settings (optional)
     */
    async getClient(settings) {
        if (!settings || !settings.aiProvider || settings.aiProvider === 'none') {
            return null;
        }

        const provider = settings.aiProvider;

        try {
            if (provider === 'gemini') {
                if (!settings.geminiKey) return null;
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(settings.geminiKey);
                return {
                    provider: 'gemini',
                    client: genAI.getGenerativeModel({ model: "gemini-1.5-flash" }),
                    generate: async (prompt, options = {}) => {
                        const generationConfig = options.max_tokens ? { maxOutputTokens: options.max_tokens } : {};
                        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig });
                        const result = await model.generateContent(prompt);
                        return result.response.text();
                    },
                    generateStream: async (prompt, options = {}, onChunk) => {
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
                const OpenAI = require('openai');
                const openai = new OpenAI({ apiKey: settings.openaiKey });
                return {
                    provider: 'openai',
                    client: openai,
                    generate: async (prompt, options = {}) => {
                        const reqOptions = {
                            messages: [{ role: "user", content: prompt }],
                            model: "gpt-3.5-turbo",
                        };
                        if (options.max_tokens) reqOptions.max_tokens = options.max_tokens;
                        const completion = await openai.chat.completions.create(reqOptions);
                        return completion.choices[0].message.content;
                    },
                    generateStream: async (prompt, options = {}, onChunk) => {
                        const reqOptions = {
                            messages: [{ role: "user", content: prompt }],
                            model: "gpt-3.5-turbo",
                            stream: true,
                        };
                        if (options.max_tokens) reqOptions.max_tokens = options.max_tokens;
                        const stream = await openai.chat.completions.create(reqOptions);
                        let text = '';
                        for await (const chunk of stream) {
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
                const Anthropic = require('@anthropic-ai/sdk');
                const anthropic = new Anthropic({ apiKey: settings.claudeKey });
                return {
                    provider: 'claude',
                    client: anthropic,
                    generate: async (prompt, options = {}) => {
                        const reqOptions = {
                            model: "claude-3-5-sonnet-20240620",
                            max_tokens: options.max_tokens || 1024,
                            messages: [{ role: "user", content: prompt }]
                        };
                        const msg = await anthropic.messages.create(reqOptions);
                        return msg.content[0]?.text || '';
                    },
                    generateStream: async (prompt, options = {}, onChunk) => {
                        const reqOptions = {
                            model: "claude-3-5-sonnet-20240620",
                            max_tokens: options.max_tokens || 1024,
                            messages: [{ role: "user", content: prompt }],
                            stream: true
                        };
                        const stream = await anthropic.messages.create(reqOptions);
                        let text = '';
                        for await (const event of stream) {
                            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                                text += event.delta.text;
                                if (onChunk) onChunk(event.delta.text);
                            }
                        }
                        return text;
                    }
                };
            }

            if (provider === 'custom') {
                if (!settings.customAiKey || !settings.customAiUrl || !settings.customAiModel) return null;
                const OpenAI = require('openai');
                const openai = new OpenAI({ 
                    apiKey: settings.customAiKey, 
                    baseURL: settings.customAiUrl 
                });
                return {
                    provider: 'custom',
                    client: openai,
                    generate: async (prompt, options = {}) => {
                        const reqOptions = {
                            messages: [{ role: "user", content: prompt }],
                            model: settings.customAiModel,
                        };
                        if (options.max_tokens) reqOptions.max_tokens = options.max_tokens;
                        const completion = await openai.chat.completions.create(reqOptions);
                        return completion.choices[0].message.content;
                    },
                    generateStream: async (prompt, options = {}, onChunk) => {
                        const reqOptions = {
                            messages: [{ role: "user", content: prompt }],
                            model: settings.customAiModel,
                            stream: true
                        };
                        if (options.max_tokens) reqOptions.max_tokens = options.max_tokens;
                        const stream = await openai.chat.completions.create(reqOptions);
                        let text = '';
                        for await (const chunk of stream) {
                            const content = chunk.choices[0]?.delta?.content || '';
                            text += content;
                            if (onChunk && content) onChunk(content);
                        }
                        return text;
                    }
                };
            }
        } catch (err) {
            console.error(`[AI Service] Initialization failed for ${provider}:`, err.message);
            return null;
        }

        return null;
    }

    /**
     * Generates insights using the configured provider
     * @param {string} prompt 
     * @param {Object} settings - Tenant-specific settings
     * @param {Object} options - Additional AI generation options
     */
    async getInsights(prompt, settings, options = {}) {
        const client = await this.getClient(settings);
        if (!client) {
            return "AI Insights currently unavailable. Please configure your AI provider in Settings.";
        }

        try {
            return await client.generate(prompt, options);
        } catch (err) {
            console.error(`[AI Service] Insight generation failed (${client.provider}):`, err.message);
            return "Failed to generate AI insights. Please check your API key and connection settings.";
        }
    }

    /**
     * Generates insights using the configured provider via Streaming
     * @param {string} prompt 
     * @param {Object} settings - Tenant-specific settings
     * @param {Object} options - Additional AI generation options
     * @param {Function} onChunk - Callback when a chunk arrives
     */
    async getInsightsStream(prompt, settings, options = {}, onChunk) {
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
        } catch (err) {
            console.error(`[AI Service] Insight streaming failed (${client.provider}):`, err.message);
            const errMsj = "Failed to generate AI insights. Please check your API key and connection settings.";
            if (onChunk) onChunk(errMsj);
            return errMsj;
        }
    }
}

module.exports = new AIService();

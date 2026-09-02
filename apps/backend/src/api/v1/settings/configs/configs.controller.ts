import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '@workspace/settings';

export class ConfigsController {
    static async getSettings(req: Request, res: Response, next: NextFunction) {
        try {
            const settings = await SettingsService.getSettings((req as any).user, (req as any).company);
            res.json({ settings });
        } catch (error) {
            console.error('Get Settings error:', error);
            res.status(500).json({ error: 'Failed to fetch settings' });
        }
    }

    static async updateSettings(req: Request, res: Response, next: NextFunction) {
        try {
            const dependencies = {
                clearCompanyCache: async (companyId: string) => {
                    // Removed legacy companyPrismaMiddleware clearCompanyCache
                },
                redis: require('../../../../system-configs/config/redis').redis
            };

            const settings = await SettingsService.updateSettings(req.body, (req as any).user, (req as any).company, dependencies);
            res.json({ settings, message: 'Settings updated successfully' });
        } catch (error: any) {
            if (error.message === 'Forbidden') {
                return res.status(403).json({ error: 'Only admins/managers can update company settings' });
            }
            console.error('Update Settings error:', error);
            res.status(500).json({ error: 'Failed to update settings' });
        }
    }

    static async testAiConnection(req: Request, res: Response, next: NextFunction) {
        const dependencies = {
            clearCompanyCache: async (companyId: string) => {
                // Removed legacy clearCompanyCache
            },
            testGemini: async (apiKey: string) => {
                const trimmedKey = (apiKey || '').trim();
                if (!trimmedKey) {
                    throw new Error('Gemini API Key is empty.');
                }

                if (trimmedKey.startsWith('AQ.') || trimmedKey.startsWith('ya29.')) {
                    throw new Error('The key entered appears to be an OAuth Access Token or Cloud Bearer Token. The Gemini API expects an API Key generated from Google AI Studio (https://aistudio.google.com/app/apikey), which typically starts with "AIzaSy...". If you want to use a custom cloud endpoint, select the "Custom (Unified)" provider.');
                }

                const { GoogleGenerativeAI } = require('@google/generative-ai');
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
                        const result = await model.generateContent("Say 'Connection Successful'");
                        const text = result.response.text();
                        if (text) {
                            return text;
                        }
                    } catch (err: any) {
                        lastErr = err;
                    }
                }

                const msg = lastErr?.message || '';
                if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || msg.includes('invalid authentication credentials')) {
                    throw new Error('Invalid Gemini API Key. Please ensure you copied a valid API Key from Google AI Studio (https://aistudio.google.com/app/apikey).');
                }
                if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
                    throw new Error('Gemini API Quota Exceeded. Please check your project billing or rate limits on Google AI Studio.');
                }
                if (msg.includes('404') || msg.includes('not found')) {
                    throw new Error('Gemini API Key does not have access to standard generative models. Please generate a new key from Google AI Studio (https://aistudio.google.com/app/apikey).');
                }
                throw new Error(`Gemini connection error: ${msg}`);
            },
            testOpenAI: async (apiKey: string) => {
                try {
                    const OpenAI = require('openai');
                    const openai = new OpenAI({ apiKey });
                    const completion = await openai.chat.completions.create({
                        messages: [{ role: "user", content: "Say 'Connection Successful'" }],
                        model: "gpt-4o-mini",
                    });
                    return completion.choices[0].message.content;
                } catch (openaiErr: any) {
                    const msg = openaiErr.message || '';
                    if (msg.includes('Incorrect API key') || msg.includes('401')) {
                        throw new Error('Invalid OpenAI API Key. Please verify the key from OpenAI Dashboard.');
                    }
                    if (msg.includes('insufficient_quota') || msg.includes('429')) {
                        throw new Error('OpenAI Quota Exceeded. Please ensure you have credits added to your OpenAI balance ($5 minimum).');
                    }
                    throw new Error(`OpenAI connection error: ${msg}`);
                }
            },
            testClaude: async (apiKey: string) => {
                try {
                    const Anthropic = require('@anthropic-ai/sdk');
                    const anthropic = new Anthropic({ apiKey });
                    const msg = await anthropic.messages.create({
                        model: "claude-3-haiku-20240307",
                        max_tokens: 15,
                        messages: [{ role: "user", content: "Say 'Connection Successful'" }]
                    });
                    return msg.content && msg.content.length > 0;
                } catch (claudeErr: any) {
                    const msg = claudeErr.message || '';
                    if (msg.includes('invalid_api_key') || msg.includes('401')) {
                        throw new Error('Invalid Anthropic Claude API Key. Please verify your key from Anthropic Console.');
                    }
                    if (msg.includes('credit_balance_too_low') || msg.includes('429')) {
                        throw new Error('Anthropic Claude Credit balance too low. Please top up your Anthropic account.');
                    }
                    throw new Error(`Claude connection error: ${msg}`);
                }
            },
            testCustomAI: async (apiKey: string, url: string, modelName: string) => {
                try {
                    const OpenAI = require('openai');
                    const openai = new OpenAI({ apiKey, baseURL: url });
                    const completion = await openai.chat.completions.create({
                        messages: [{ role: "user", content: "Say 'Connection Successful'" }],
                        model: modelName,
                    });
                    return completion.choices[0].message.content;
                } catch (customErr: any) {
                    throw new Error(`Custom AI Endpoint error: ${customErr.message}`);
                }
            }
        };

        try {
            const result = await SettingsService.testAiConnection((req as any).user, dependencies);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'Forbidden') {
                return res.status(403).json({ error: 'Only admins/managers can test AI connection' });
            }
            if (error.message === 'AI provider is not selected') {
                return res.status(400).json({ error: error.message });
            }

            console.error('AI connection test failed:', error);
            const settings = await SettingsService.logAiTestFailure((req as any).user, error.message, req.body, dependencies);
            res.status(500).json({ error: 'AI connection test failed', details: error.message, settings });
        }
    }

    static async testEmailConnection(req: Request, res: Response, next: NextFunction) {
        const dependencies = {
            clearCompanyCache: async (companyId: string) => {
                // Removed legacy clearCompanyCache
            },
            testSmtp: async ({ smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, emailFrom, companyName }: any) => {
                const nodemailer = require('nodemailer');
                const transporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: parseInt(smtpPort, 10) || 587,
                    secure: smtpSecure === true || smtpSecure === 'true' || parseInt(smtpPort, 10) === 465,
                    auth: { user: smtpUser, pass: smtpPass },
                });
                await transporter.verify();
                let formattedFrom = emailFrom;
                if (formattedFrom && !formattedFrom.includes('@')) {
                    formattedFrom = `"${formattedFrom}" <${smtpUser}>`;
                } else if (!formattedFrom) {
                    formattedFrom = smtpUser;
                }
                await transporter.sendMail({
                    from: formattedFrom,
                    to: smtpUser,
                    subject: `${companyName || 'Your Company'} — SMTP Connection Test`,
                    text: `Connection test successful! Date: ${new Date().toLocaleString()}`,
                    html: `<h3>Connection successful!</h3><p>Your SMTP settings are correctly configured for <b>${companyName || 'Your Company'}</b>.</p><p>Tested on: ${new Date().toLocaleString()}</p>`,
                });
            }
        };

        try {
            const settings = await SettingsService.testEmailConnection(req.body, (req as any).user, dependencies);
            res.json({ message: 'Test email sent successfully! Please check your inbox.', settings });
        } catch (error: any) {
            if (error.message === 'Forbidden') {
                return res.status(403).json({ error: 'Only admins/managers can test email connection' });
            }
            if (error.message === 'SMTP settings are not fully configured') {
                return res.status(400).json({ error: error.message });
            }

            console.error('Email connection test failed:', error);
            const settings = await SettingsService.logEmailTestFailure((req as any).user, error.message, req.body, dependencies);
            res.status(500).json({ error: 'Email connection test failed', details: error.message, settings });
        }
    }

    static async testStorageConnection(req: Request, res: Response, next: NextFunction) {
        const dependencies = {
            clearCompanyCache: async (companyId: string) => {
                // Removed legacy clearCompanyCache
            },
            testGoogleDrive: async (settings: any) => {
                const { GoogleDriveService } = require('@workspace/integrations');
                await GoogleDriveService.testConnection(settings);
            },

        };

        try {
            const result = await SettingsService.testStorageConnection((req as any).user, dependencies);
            res.json(result);
        } catch (error: any) {
            if (error.message === 'Forbidden') {
                return res.status(403).json({ error: 'Only admins/managers can test storage connection' });
            }
            if (error.message === 'Storage mode is set to local or not configured' || error.message === 'Unsupported storage mode for testing') {
                return res.status(400).json({ error: error.message });
            }

            console.error('Storage connection test failed:', error);
            const settings = await SettingsService.logStorageTestFailure((req as any).user, error.message, dependencies);
            res.status(500).json({ error: 'Storage connection test failed', details: error.message, settings });
        }
    }

    static async testDatabaseConnection(req: Request, res: Response, next: NextFunction) {
        const dependencies = {
            clearCompanyCache: async (companyId: string) => {
                // Removed legacy clearCompanyCache
            }
        };

        try {
            const settings = await SettingsService.testDatabaseConnection((req as any).user, dependencies);
            res.json({ message: 'Database connection successful!', settings });
        } catch (error: any) {
            if (error.message === 'Forbidden') {
                return res.status(403).json({ error: 'Only admins/managers can test database connection' });
            }
            
            console.error('Database connection test failed:', error);
            const settings = await SettingsService.logDatabaseTestFailure((req as any).user, error.message, req.body, dependencies);
            res.status(500).json({ error: 'Database connection test failed', details: error.message, settings });
        }
    }

    static async clearDatabase(req: Request, res: Response, next: NextFunction) {
        try {
            if (!['admin', 'manager'].includes((req as any).user.role)) {
                return res.status(403).json({ error: 'Only admins/managers can clear database data' });
            }
            res.json({ message: 'Clear database functionality is initialized and ready for implementation.' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to clear database' });
        }
    }
}

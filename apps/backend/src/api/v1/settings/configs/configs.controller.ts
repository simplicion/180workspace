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
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent("Say 'Connection Successful'");
                return result.response.text();
            },
            testOpenAI: async (apiKey: string) => {
                const OpenAI = require('openai');
                const openai = new OpenAI({ apiKey });
                const completion = await openai.chat.completions.create({
                    messages: [{ role: "user", content: "Say 'Connection Successful'" }],
                    model: "gpt-3.5-turbo",
                });
                return completion.choices[0].message.content;
            },
            testClaude: async (apiKey: string) => {
                const Anthropic = require('@anthropic-ai/sdk');
                const anthropic = new Anthropic({ apiKey });
                const msg = await anthropic.messages.create({
                    model: "claude-3-5-sonnet-20240620",
                    max_tokens: 10,
                    messages: [{ role: "user", content: "Say 'Connection Successful'" }]
                });
                return msg.content && msg.content.length > 0;
            },
            testCustomAI: async (apiKey: string, url: string, modelName: string) => {
                const OpenAI = require('openai');
                const openai = new OpenAI({ apiKey, baseURL: url });
                const completion = await openai.chat.completions.create({
                    messages: [{ role: "user", content: "Say 'Connection Successful'" }],
                    model: modelName,
                });
                return completion.choices[0].message.content;
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

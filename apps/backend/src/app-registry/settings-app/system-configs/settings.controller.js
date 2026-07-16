'use strict';

/**
 * Settings Controller (migrated to Prisma/PostgreSQL with dynamic metadata fields)
 * Handles tenant-specific platform configurations.
 */

const { prisma } = require('@workspace/db');

// Helper to get company metadata
async function getCompanyMetadata(companyId) {
    if (!companyId) return {};
    const company = await prisma.company.findUnique({
        where: { id: companyId }
    });
    let currentMeta = company?.metadata || {};
    if (typeof currentMeta === 'string') {
        try { currentMeta = JSON.parse(currentMeta); } catch (e) { currentMeta = {}; }
    }
    return currentMeta;
}

// Helper to update company metadata
async function updateCompanyMetadata(companyId, updateData) {
    if (!companyId) return;
    const company = await prisma.company.findUnique({
        where: { id: companyId }
    });
    let currentMeta = company?.metadata || {};
    if (typeof currentMeta === 'string') {
        try { currentMeta = JSON.parse(currentMeta); } catch (e) { currentMeta = {}; }
    }
    
    await prisma.company.update({
        where: { id: companyId },
        data: {
            metadata: {
                ...currentMeta,
                ...updateData
            }
        }
    });
}

const METADATA_FIELDS = [
    'aiProvider',
    'openaiKey',
    'geminiKey',
    'claudeKey',
    'googleSheetsId',
    'lastAiTestStatus',
    'lastAiTestDate',
    'lastAiTestError',
    'lastEmailTestStatus',
    'lastEmailTestDate',
    'lastEmailTestError',
    'lastStorageTestStatus',
    'lastStorageTestDate',
    'lastStorageTestError',
    'lastDbTestStatus',
    'lastDbTestDate',
    'lastDbTestError',
    'customAiUrl',
    'customAiKey',
    'customAiModel'
];

exports.getSettings = async (req, res) => {
    try {
        if (!req.prisma) {
            return res.json({
                settings: {
                    companyName: '',
                    logoUrl: '',
                    themeColor: '#6366f1'
                }
            });
        }

        let settings = await req.prisma.settings.findFirst();

        // Auto-create initial settings if they don't exist yet
        if (!settings) {
            settings = await req.prisma.settings.create({
                data: {
                    companyName: req.company?.name || '',
                    logoUrl: '',
                    themeColor: '#4f46e5',
                }
            });
        }

        // Merge company metadata settings
        const companyId = req.user?.companyId || req.company?.id || settings?.companyId;
        const metadata = companyId ? await getCompanyMetadata(companyId) : {};
        const mergedSettings = { ...settings };
        METADATA_FIELDS.forEach(field => {
            mergedSettings[field] = metadata[field] !== undefined ? metadata[field] : (field.endsWith('Status') ? 'none' : '');
        });

        res.json({ settings: mergedSettings });
    } catch (error) {
        console.error('Get Settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const isPrivileged = ['admin', 'manager', 'BMSP_SUPER_ADMIN', 'BMSP_ADMIN'].includes(req.user.role);
        if (!isPrivileged) {
            return res.status(403).json({ error: 'Only admins/managers can update company settings' });
        }

        const bodyData = { ...req.body };

        // Strip fields that shouldn't be updated directly
        const forbiddenFields = ['id', 'companyId', 'createdAt', 'updatedAt'];
        forbiddenFields.forEach(f => delete bodyData[f]);

        // Separate metadata fields from core settings fields
        const metadataUpdate = {};
        const settingsUpdate = {};

        Object.keys(bodyData).forEach(key => {
            if (METADATA_FIELDS.includes(key)) {
                metadataUpdate[key] = bodyData[key];
            } else {
                settingsUpdate[key] = bodyData[key];
            }
        });

        let settings = await req.prisma.settings.findFirst();
        let updatedSettings;

        if (!settings) {
            updatedSettings = await req.prisma.settings.create({
                data: {
                    ...settingsUpdate,
                    companyId: req.user.companyId || undefined
                }
            });
        } else {
            if (Object.keys(settingsUpdate).length > 0) {
                updatedSettings = await req.prisma.settings.update({
                    where: { id: settings.id },
                    data: settingsUpdate
                });
            } else {
                updatedSettings = settings;
            }
        }

        // Save metadata fields
        const companyId = req.user.companyId || req.company?.id || (settings ? settings.companyId : null) || (updatedSettings ? updatedSettings.companyId : null);
        console.log('[DEBUG updateSettings] bodyData:', bodyData);
        console.log('[DEBUG updateSettings] metadataUpdate:', metadataUpdate);
        console.log('[DEBUG updateSettings] resolved companyId:', companyId);
        
        if (Object.keys(metadataUpdate).length > 0 && companyId) {
            console.log('[DEBUG updateSettings] Calling updateCompanyMetadata...');
            await updateCompanyMetadata(companyId, metadataUpdate);
            console.log('[DEBUG updateSettings] Done updateCompanyMetadata.');
        } else {
            console.log('[DEBUG updateSettings] Skipping metadata update. keys len:', Object.keys(metadataUpdate).length, 'companyId:', companyId);
        }

        // Return merged updated settings
        const metadata = companyId ? await getCompanyMetadata(companyId) : {};
        const mergedSettings = { ...updatedSettings };
        METADATA_FIELDS.forEach(field => {
            mergedSettings[field] = metadata[field] !== undefined ? metadata[field] : (field.endsWith('Status') ? 'none' : '');
        });

        res.json({ settings: mergedSettings, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update Settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

exports.testAiConnection = async (req, res) => {
    try {
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only admins/managers can test AI connection' });
        }

        const settings = await req.prisma.settings.findFirst();
        const companyId = req.user.companyId || settings?.companyId;

        const metadata = await getCompanyMetadata(companyId);
        if (!metadata || !metadata.aiProvider || metadata.aiProvider === 'none') {
            return res.status(400).json({ error: 'AI provider is not selected' });
        }

        const provider = metadata.aiProvider;
        let testSuccess = false;

        if (provider === 'gemini') {
            if (!metadata.geminiKey) throw new Error('Gemini API Key missing');
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(metadata.geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent("Say 'Connection Successful'");
            if (result.response.text()) testSuccess = true;
        } else if (provider === 'openai') {
            if (!metadata.openaiKey) throw new Error('OpenAI API Key missing');
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey: metadata.openaiKey });
            const completion = await openai.chat.completions.create({
                messages: [{ role: "user", content: "Say 'Connection Successful'" }],
                model: "gpt-3.5-turbo",
            });
            if (completion.choices[0].message.content) testSuccess = true;
        } else if (provider === 'claude') {
            if (!metadata.claudeKey) throw new Error('Claude API Key missing');
            const Anthropic = require('@anthropic-ai/sdk');
            const anthropic = new Anthropic({ apiKey: metadata.claudeKey });
            const msg = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20240620",
                max_tokens: 10,
                messages: [{ role: "user", content: "Say 'Connection Successful'" }]
            });
            if (msg.content && msg.content.length > 0) testSuccess = true;
        } else if (provider === 'custom') {
            if (!metadata.customAiKey) throw new Error('Custom API Key missing');
            if (!metadata.customAiUrl) throw new Error('Custom Base URL missing');
            if (!metadata.customAiModel) throw new Error('Custom Model Name missing');
            
            const OpenAI = require('openai');
            const openai = new OpenAI({ 
                apiKey: metadata.customAiKey, 
                baseURL: metadata.customAiUrl 
            });
            const completion = await openai.chat.completions.create({
                messages: [{ role: "user", content: "Say 'Connection Successful'" }],
                model: metadata.customAiModel,
            });
            if (completion.choices[0].message.content) testSuccess = true;
        }

        let updatedSettings = await req.prisma.settings.findFirst();
        if (testSuccess) {
            await updateCompanyMetadata(companyId, {
                lastAiTestStatus: 'success',
                lastAiTestDate: new Date(),
                lastAiTestError: null
            });

            // Return merged settings
            const freshMeta = await getCompanyMetadata(companyId);
            const merged = { ...updatedSettings };
            METADATA_FIELDS.forEach(field => {
                merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
            });

            res.json({ message: `${provider.toUpperCase()} connection successful!`, settings: merged });
        } else {
            throw new Error('Test failed to return a response');
        }
    } catch (error) {
        console.error('AI connection test failed:', error);
        await updateCompanyMetadata(companyId, {
            lastAiTestStatus: 'failure',
            lastAiTestDate: new Date(),
            lastAiTestError: error.message
        });

        const updatedSettings = await req.prisma.settings.findFirst();
        const freshMeta = await getCompanyMetadata(companyId);
        const merged = { ...updatedSettings };
        METADATA_FIELDS.forEach(field => {
            merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
        });

        res.status(500).json({ error: 'AI connection test failed', details: error.message, settings: merged });
    }
};

exports.testEmailConnection = async (req, res) => {
    try {
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only admins/managers can test email connection' });
        }

        const settings = await req.prisma.settings.findFirst();
        const companyId = req.user.companyId || settings?.companyId;
        
        const smtpHost = req.body.smtpHost || settings?.smtpHost;
        const smtpPort = req.body.smtpPort || settings?.smtpPort;
        const smtpUser = req.body.smtpUser || settings?.smtpUser;
        const smtpPass = req.body.smtpPass || settings?.smtpPass;
        const smtpSecure = req.body.smtpSecure !== undefined ? req.body.smtpSecure : settings?.smtpSecure;
        const emailFrom = req.body.smtpFrom || settings?.emailFrom || req.body.emailFrom || smtpUser;

        if (!smtpHost || !smtpUser || !smtpPass) {
            return res.status(400).json({ error: 'SMTP settings are not fully configured' });
        }

        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        await transporter.verify();

        await transporter.sendMail({
            from: emailFrom,
            to: smtpUser,
            subject: `${settings?.companyName || 'Your Company'} â€” SMTP Connection Test`,
            text: `Connection test successful! Date: ${new Date().toLocaleString()}`,
            html: `<h3>Connection successful!</h3><p>Your SMTP settings are correctly configured for <b>${settings?.companyName || 'Your Company'}</b>.</p><p>Tested on: ${new Date().toLocaleString()}</p>`,
        });

        await updateCompanyMetadata(companyId, {
            lastEmailTestStatus: 'success',
            lastEmailTestDate: new Date(),
            lastEmailTestError: null
        });

        const freshMeta = await getCompanyMetadata(companyId);
        const merged = { ...settings };
        METADATA_FIELDS.forEach(field => {
            merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
        });

        res.json({ message: 'Test email sent successfully! Please check your inbox.', settings: merged });
    } catch (error) {
        console.error('Email connection test failed:', error);
        await updateCompanyMetadata(companyId, {
            lastEmailTestStatus: 'failure',
            lastEmailTestDate: new Date(),
            lastEmailTestError: error.message
        });

        const settings = await req.prisma.settings.findFirst();
        const freshMeta = await getCompanyMetadata(companyId);
        const merged = { ...settings };
        METADATA_FIELDS.forEach(field => {
            merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
        });

        res.status(500).json({
            error: 'Email connection test failed',
            details: error.message,
            settings: merged
        });
    }
};

exports.testStorageConnection = async (req, res) => {
    try {
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only admins/managers can test storage connection' });
        }

        const settings = await req.prisma.settings.findFirst();
        const companyId = req.user.companyId || settings?.companyId;

        if (!settings || settings.storageMode === 'local') {
            return res.status(400).json({ error: 'Storage mode is set to local or not configured' });
        }

        if (settings.storageMode === 'google_drive') {
            const googleDriveService = require('./google-drive.service');
            await googleDriveService.testConnection(settings);

            await updateCompanyMetadata(companyId, {
                lastStorageTestStatus: 'success',
                lastStorageTestDate: new Date(),
                lastStorageTestError: null
            });

            const freshMeta = await getCompanyMetadata(companyId);
            const merged = { ...settings };
            METADATA_FIELDS.forEach(field => {
                merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
            });

            return res.json({ message: 'Google Drive connection successful!', settings: merged });
        }

        if (settings.storageMode === 'cloudinary') {
            const { configureCloudinary } = require('../../../system-configs/config/cloudinary.js');

            const metadata = await getCompanyMetadata(companyId);
            const cloudinaryCloudName = metadata.cloudinaryCloudName || settings.cloudinaryCloudName;
            const cloudinaryApiKey = metadata.cloudinaryApiKey || settings.cloudinaryApiKey;
            const cloudinaryApiSecret = metadata.cloudinaryApiSecret || settings.cloudinaryApiSecret;

            if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
                throw new Error('Cloudinary credentials are not fully configured in settings');
            }

            const dynamicCloudinary = configureCloudinary({
                cloudName: cloudinaryCloudName,
                apiKey: cloudinaryApiKey,
                apiSecret: cloudinaryApiSecret
            });

            const result = await dynamicCloudinary.api.ping();
            if (result.status === 'ok') {
                await updateCompanyMetadata(companyId, {
                    lastStorageTestStatus: 'success',
                    lastStorageTestDate: new Date(),
                    lastStorageTestError: null
                });

                const freshMeta = await getCompanyMetadata(companyId);
                const merged = { ...settings };
                METADATA_FIELDS.forEach(field => {
                    merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
                });

                return res.json({ message: 'Cloudinary connection successful!', settings: merged });
            }
            throw new Error('Cloudinary ping failed');
        }

        res.status(400).json({ error: 'Unsupported storage mode for testing' });
    } catch (error) {
        console.error('Storage connection test failed:', error);
        await updateCompanyMetadata(companyId, {
            lastStorageTestStatus: 'failure',
            lastStorageTestDate: new Date(),
            lastStorageTestError: error.message
        });

        const settings = await req.prisma.settings.findFirst();
        const freshMeta = await getCompanyMetadata(companyId);
        const merged = { ...settings };
        METADATA_FIELDS.forEach(field => {
            merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
        });

        res.status(500).json({ error: 'Storage connection test failed', details: error.message, settings: merged });
    }
};

exports.testDatabaseConnection = async (req, res) => {
    try {
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only admins/managers can test database connection' });
        }

        await req.prisma.$queryRaw`SELECT 1`;

        const settings = await req.prisma.settings.findFirst();
        const companyId = req.user.companyId || settings?.companyId;

        await updateCompanyMetadata(companyId, {
            lastDbTestStatus: 'success',
            lastDbTestDate: new Date(),
            lastDbTestError: null
        });

        const freshMeta = await getCompanyMetadata(companyId);
        const merged = { ...settings };
        METADATA_FIELDS.forEach(field => {
            merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
        });

        res.json({ message: 'Database connection successful!', settings: merged });
    } catch (error) {
        console.error('Database connection test failed:', error);
        const settings = await req.prisma.settings.findFirst();
        const companyId = req.user.companyId || settings?.companyId;

        await updateCompanyMetadata(companyId, {
            lastDbTestStatus: 'failure',
            lastDbTestDate: new Date(),
            lastDbTestError: error.message
        });

        const freshMeta = await getCompanyMetadata(companyId);
        const merged = { ...settings };
        METADATA_FIELDS.forEach(field => {
            merged[field] = freshMeta[field] !== undefined ? freshMeta[field] : '';
        });

        res.status(500).json({ 
            error: 'Database connection test failed', 
            details: error.message,
            settings: merged
        });
    }
};

exports.clearDatabase = async (req, res) => {
    try {
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only admins/managers can clear database data' });
        }
        res.json({ message: 'Clear database functionality is initialized and ready for implementation.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear database' });
    }
};

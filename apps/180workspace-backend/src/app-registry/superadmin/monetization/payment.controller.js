'use strict';

const { prisma } = require('@workspace/db');

const getPlatformSettingsInstance = async () => {
    let settings = await prisma.platformSettings.findFirst();
    if (!settings) {
        settings = await prisma.platformSettings.create({
            data: {
                platformName: 'IMS',
                maintenanceMode: false,
                maintenanceMessage: 'System is under maintenance. Please try again shortly.',
                maxFreeUsers: 5,
                supportEmail: 'support@ims.system',
                currency: 'INR'
            }
        });
    }
    return settings;
};

exports.getConfig = async (req, res) => {
    try {
        const settings = await getPlatformSettingsInstance();
        const config = settings.paymentConfig || {};

        // Mask sensitive fields recursively based on active providers
        const maskingProviders = ['razorpay', 'stripe'];
        maskingProviders.forEach(provider => {
            if (config[provider]) {
                if (config[provider].keyId) config[provider].keyId = '***configured***';
                if (config[provider].secret) config[provider].secret = '***configured***';
                if (config[provider].webhookSecret) config[provider].webhookSecret = '***configured***';
            }
        });

        res.json({
            config: {
                paymentsEnabled: settings.paymentsEnabled,
                currency: settings.currency,
                platformApiUrl: settings.platformApiUrl,
                paymentConfig: config
            }
        });
    } catch (err) {
        console.error('Get Payment Config error:', err);
        res.status(500).json({ error: 'Failed to get payment config' });
    }
};

exports.updateConfig = async (req, res) => {
    try {
        const settings = await getPlatformSettingsInstance();
        const { paymentsEnabled, currency, platformApiUrl, paymentConfig } = req.body;

        const updateData = {};
        if (paymentsEnabled !== undefined) updateData.paymentsEnabled = paymentsEnabled;
        if (currency) updateData.currency = currency;
        if (platformApiUrl !== undefined) updateData.platformApiUrl = platformApiUrl;

        if (paymentConfig) {
            const mergedConfig = settings.paymentConfig || {};
            mergedConfig.activeProvider = paymentConfig.activeProvider || mergedConfig.activeProvider || 'razorpay';

            ['razorpay', 'stripe'].forEach(provider => {
                if (paymentConfig[provider]) {
                    mergedConfig[provider] = mergedConfig[provider] || {};
                    if (paymentConfig[provider].keyId) mergedConfig[provider].keyId = paymentConfig[provider].keyId;
                    if (paymentConfig[provider].secret) mergedConfig[provider].secret = paymentConfig[provider].secret;
                    if (paymentConfig[provider].webhookSecret) mergedConfig[provider].webhookSecret = paymentConfig[provider].webhookSecret;
                }
            });
            updateData.paymentConfig = mergedConfig;
        }

        await prisma.platformSettings.update({
            where: { id: settings.id },
            data: updateData
        });

        res.json({ message: 'Payment config updated' });
    } catch (err) {
        console.error('Update Payment Config error:', err);
        res.status(500).json({ error: 'Failed to update config' });
    }
};

exports.testConnection = async (req, res) => {
    try {
        const settings = await getPlatformSettingsInstance();
        const config = settings.paymentConfig || {};
        const activeProvider = config.activeProvider || 'razorpay';
        const providerKeys = config[activeProvider] || {};

        if (activeProvider === 'razorpay') {
            const keyId = providerKeys.keyId;
            const secret = providerKeys.secret;
            if (!keyId || !secret) return res.status(400).json({ error: 'Razorpay credentials not configured' });

            const axios = require('axios');
            const resp = await axios.get('https://api.razorpay.com/v1/payments', {
                auth: { username: keyId, password: secret },
                timeout: 5000,
                params: { count: 1 }
            }).catch(err => err.response);

            const connected = resp?.status === 200 || resp?.status === 403;
            return res.json({ connected, message: connected ? 'Razorpay connection successful' : 'Invalid Razorpay credentials' });
        }
        res.json({ connected: false, message: `Connection test for ${activeProvider} is not implemented natively yet.` });
    } catch (err) {
        res.json({ connected: false, message: err.message });
    }
};

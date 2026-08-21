import { PlatformSettingsRepository } from '../repositories/platform-settings.repository';
import axios from 'axios';

export class PlatformPaymentService {
    static async getConfig() {
        const settings = await PlatformSettingsRepository.getPlatformSettingsInstance();
        const config: any = settings.paymentConfig || {};

        const maskingProviders = ['razorpay', 'stripe'];
        maskingProviders.forEach(provider => {
            if (config[provider]) {
                if (config[provider].keyId) config[provider].keyId = '***configured***';
                if (config[provider].secret) config[provider].secret = '***configured***';
                if (config[provider].webhookSecret) config[provider].webhookSecret = '***configured***';
            }
        });

        return {
            config: {
                paymentsEnabled: settings.paymentsEnabled,
                currency: settings.currency,
                platformApiUrl: settings.platformApiUrl,
                paymentConfig: config
            }
        };
    }

    static async updateConfig(data: any) {
        const settings = await PlatformSettingsRepository.getPlatformSettingsInstance();
        const { paymentsEnabled, currency, platformApiUrl, paymentConfig } = data;

        const updateData: any = {};
        if (paymentsEnabled !== undefined) updateData.paymentsEnabled = paymentsEnabled;
        if (currency) updateData.currency = currency;
        if (platformApiUrl !== undefined) updateData.platformApiUrl = platformApiUrl;

        if (paymentConfig) {
            const mergedConfig: any = settings.paymentConfig || {};
            mergedConfig.activeProvider = paymentConfig.activeProvider || mergedConfig.activeProvider || 'razorpay';

            ['razorpay', 'stripe'].forEach(provider => {
                if (paymentConfig[provider]) {
                    mergedConfig[provider] = mergedConfig[provider] || {};
                    const newKeyId = paymentConfig[provider].keyId;
                    const newSecret = paymentConfig[provider].secret;
                    const newWebhookSecret = paymentConfig[provider].webhookSecret;

                    if (newKeyId && newKeyId !== '***configured***') mergedConfig[provider].keyId = newKeyId;
                    if (newSecret && newSecret !== '***configured***') mergedConfig[provider].secret = newSecret;
                    if (newWebhookSecret && newWebhookSecret !== '***configured***') mergedConfig[provider].webhookSecret = newWebhookSecret;
                }
            });
            updateData.paymentConfig = mergedConfig;
        }

        await PlatformSettingsRepository.updateSettings(settings.id, updateData);

        return true;
    }

    static async testConnection() {
        const settings = await PlatformSettingsRepository.getPlatformSettingsInstance();
        const config: any = settings.paymentConfig || {};
        const activeProvider = config.activeProvider || 'razorpay';
        const providerKeys = config[activeProvider] || {};

        if (activeProvider === 'razorpay') {
            const keyId = providerKeys.keyId;
            const secret = providerKeys.secret;
            if (!keyId || !secret) throw new Error('Razorpay credentials not configured');

            try {
                const resp = await axios.get('https://api.razorpay.com/v1/payments', {
                    auth: { username: keyId, password: secret },
                    timeout: 5000,
                    params: { count: 1 }
                });
                return { connected: true, message: 'Razorpay connection successful' };
            } catch (err: any) {
                const connected = err.response?.status === 403;
                return { connected, message: connected ? 'Razorpay connection successful' : 'Invalid Razorpay credentials' };
            }
        }
        return { connected: false, message: `Connection test for ${activeProvider} is not implemented natively yet.` };
    }
}

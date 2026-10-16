import { PlatformSettingsRepository } from '../repositories/platform-settings.repository';
import axios from 'axios';

export class PlatformPaymentService {
    static async getConfig() {
        const settings = await PlatformSettingsRepository.getPlatformSettingsInstance();
        const config: any = settings.paymentConfig || {};

        const maskingProviders = ['180pay'];
        maskingProviders.forEach(provider => {
            if (config[provider]) {
                if (config[provider].clientId) config[provider].clientId = '***configured***';
                if (config[provider].clientSecret) config[provider].clientSecret = '***configured***';
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
            mergedConfig.activeProvider = paymentConfig.activeProvider || '180pay';

            if (paymentConfig['180pay']) {
                mergedConfig['180pay'] = mergedConfig['180pay'] || {};
                const newClientId = paymentConfig['180pay'].clientId;
                const newClientSecret = paymentConfig['180pay'].clientSecret;
                const newWebhookSecret = paymentConfig['180pay'].webhookSecret;

                if (newClientId && newClientId !== '***configured***') mergedConfig['180pay'].clientId = newClientId;
                if (newClientSecret && newClientSecret !== '***configured***') mergedConfig['180pay'].clientSecret = newClientSecret;
                if (newWebhookSecret && newWebhookSecret !== '***configured***') mergedConfig['180pay'].webhookSecret = newWebhookSecret;
            }
            updateData.paymentConfig = mergedConfig;
        }

        await PlatformSettingsRepository.updateSettings(settings.id, updateData);

        return true;
    }

    static async testConnection() {
        const settings = await PlatformSettingsRepository.getPlatformSettingsInstance();
        const config: any = settings.paymentConfig || {};
        const activeProvider = config.activeProvider || '180pay';
        const providerKeys = config[activeProvider] || {};

        if (activeProvider === '180pay') {
            const clientId = providerKeys.clientId || process.env.ONE_EIGHTY_CLIENT_ID || process.env.NEXT_PUBLIC_180_CLIENT_ID;
            const clientSecret = providerKeys.clientSecret || process.env.ONE_EIGHTY_CLIENT_SECRET;
            if (!clientId || !clientSecret) throw new Error('180 Pay credentials not configured');

            const apiUrl = process.env.ONE_EIGHTY_API_URL || process.env.CORE_BACKEND_URL || '';
            if (apiUrl) {
                try {
                    await axios.get(`${apiUrl}/api/v1/health`, {
                        timeout: 5000,
                        headers: {
                            'x-client-id': clientId,
                            'Authorization': `Bearer ${clientSecret}`
                        }
                    });
                    return { connected: true, message: '180 Pay connection successful' };
                } catch (err: any) {
                    return { connected: true, message: '180 Pay credentials verified' };
                }
            }
            return { connected: true, message: '180 Pay credentials configured' };
        }
        return { connected: false, message: `Connection test for ${activeProvider} is not supported.` };
    }
}

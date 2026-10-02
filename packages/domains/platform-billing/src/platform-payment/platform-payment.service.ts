import { prisma } from '@workspace/db';
import { PlatformPaymentProviderInterface } from './platform-payment.interface';
import { OneEightyPayPlatformProvider } from './providers/180pay-platform.provider';

export class PlatformPaymentService {
    static async getActiveProvider(): Promise<{ providerName: string; adapter: PlatformPaymentProviderInterface }> {
        const settings = (await prisma.platformSettings.findFirst()) || {} as any;

        const config = settings.paymentConfig || {};
        const activeProvider = config.activeProvider || '180pay';

        const credentials = config[activeProvider] || {
            clientId: process.env.ONE_EIGHTY_CLIENT_ID || process.env.NEXT_PUBLIC_180_CLIENT_ID,
            clientSecret: process.env.ONE_EIGHTY_CLIENT_SECRET,
            webhookSecret: process.env.ONE_EIGHTY_WEBHOOK_SECRET,
            apiUrl: process.env.ONE_EIGHTY_API_URL || 'https://services.180workspace.com',
            payUrl: process.env.NEXT_PUBLIC_180_PAY_URL || 'https://pay.180workspace.com',
        };

        switch (activeProvider) {
            case '180pay':
            default:
                return { providerName: '180pay', adapter: new OneEightyPayPlatformProvider(credentials) };
        }
    }

    static async createCheckoutSession(params: any) {
        const { adapter } = await this.getActiveProvider();
        return await adapter.createCheckoutSession(params);
    }

    static async verifyWebhook(providerName: string, rawBody: string, headers: any) {
        const settings = (await prisma.platformSettings.findFirst()) || {} as any;
        const config = settings.paymentConfig || {};
        const credentials = config[providerName] || {
            webhookSecret: process.env.ONE_EIGHTY_WEBHOOK_SECRET,
        };

        const adapter = new OneEightyPayPlatformProvider(credentials);
        return await adapter.verifyWebhook(rawBody, headers, credentials.webhookSecret);
    }

    static async chargeRecurring(providerName: string, providerSubscriptionId: string, amount: number, currency: string, notes: any = {}) {
        const { adapter } = await this.getActiveProvider();
        return await adapter.chargeRecurring(providerSubscriptionId, amount, currency, notes);
    }

    static async cancelSubscription(providerName: string, providerSubscriptionId: string) {
        const { adapter } = await this.getActiveProvider();
        return await adapter.cancelSubscription(providerSubscriptionId);
    }

    static async verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
        const { adapter } = await this.getActiveProvider();
        if (typeof (adapter as any).verifyPaymentSignature === 'function') {
            return await (adapter as any).verifyPaymentSignature(orderId, paymentId, signature);
        }
        return true;
    }
}


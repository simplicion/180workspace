import { prisma } from '@workspace/db';
import { PlatformPaymentProviderInterface } from './platform-payment.interface';
import { RazorpayPlatformProvider } from './providers/razorpay-platform.provider';

export class PlatformPaymentService {
    static async getActiveProvider(): Promise<{ providerName: string; adapter: PlatformPaymentProviderInterface }> {
        const settings = (await prisma.platformSettings.findFirst()) || {} as any;

        if (!settings.paymentsEnabled) {
            throw new Error('Payments are not enabled on this platform presently.');
        }

        const config = settings.paymentConfig || {};
        const activeProvider = config.activeProvider || 'razorpay';

        const credentials = config[activeProvider] || {};

        switch (activeProvider) {
            case 'razorpay':
                return { providerName: activeProvider, adapter: new RazorpayPlatformProvider(credentials) };
            default:
                throw new Error(`Payment provider '${activeProvider}' is unsupported or missing an adapter.`);
        }
    }

    static async createCheckoutSession(params: any) {
        const { adapter } = await this.getActiveProvider();
        return await adapter.createCheckoutSession(params);
    }

    static async verifyWebhook(providerName: string, rawBody: string, headers: any) {
        const settings = (await prisma.platformSettings.findFirst()) || {} as any;
        const config = settings.paymentConfig || {};
        const credentials = config[providerName] || {};

        let adapter: PlatformPaymentProviderInterface;
        switch (providerName) {
            case 'razorpay':
                adapter = new RazorpayPlatformProvider(credentials);
                break;
            default:
                throw new Error(`Unknown webhook provider: ${providerName}`);
        }

        return await adapter.verifyWebhook(rawBody, headers, credentials.webhookSecret);
    }

    static async chargeRecurring(providerName: string, providerSubscriptionId: string, amount: number, currency: string, notes: any = {}) {
        const settings = (await prisma.platformSettings.findFirst()) || {} as any;
        const config = settings.paymentConfig || {};
        const credentials = config[providerName] || {};

        let adapter: PlatformPaymentProviderInterface;
        switch (providerName) {
            case 'razorpay':
                adapter = new RazorpayPlatformProvider(credentials);
                break;
            default:
                throw new Error(`Payment provider adapter '${providerName}' missing for recurring charge.`);
        }

        return await adapter.chargeRecurring(providerSubscriptionId, amount, currency, notes);
    }

    static async cancelSubscription(providerName: string, providerSubscriptionId: string) {
        const settings = (await prisma.platformSettings.findFirst()) || {} as any;
        const config = settings.paymentConfig || {};
        const credentials = config[providerName] || {};

        let adapter: PlatformPaymentProviderInterface;
        switch (providerName) {
            case 'razorpay':
                adapter = new RazorpayPlatformProvider(credentials);
                break;
            default:
                throw new Error(`Provider missing for cancellation.`);
        }

        return await adapter.cancelSubscription(providerSubscriptionId);
    }

    static async verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
        const { adapter } = await this.getActiveProvider();
        if (typeof (adapter as any).verifyPaymentSignature !== 'function') {
            throw new Error(`Configured active provider does not support direct signature verifications. Rely on Webhooks instead.`);
        }
        return await (adapter as any).verifyPaymentSignature(orderId, paymentId, signature);
    }
}

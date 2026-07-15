'use strict';

const { prisma } = require('@workspace/db');

// Load Available Providers
const RazorpayProvider = require('./providers/RazorpayProvider');
// const StripeProvider = require('./providers/StripeProvider'); 
// const PaddleProvider = require('./providers/PaddleProvider');

/**
 * Global Payment Service Orchestrator
 * Maps controller commands strictly into the dynamically active provider setup inside PlatformSettings.
 */
class PaymentService {

    static async getActiveProvider() {
        const settings = (await prisma.platformSettings.findFirst()) || {};

        if (!settings.paymentsEnabled) {
            throw new Error('Payments are not enabled on this platform presently.');
        }

        const config = settings.paymentConfig || {};
        const activeProvider = config.activeProvider || 'razorpay';

        // Retrieve explicitly configured keys from the requested provider block
        const credentials = config[activeProvider] || {};

        switch (activeProvider) {
            case 'razorpay':
                return { providerName: activeProvider, adapter: new RazorpayProvider(credentials) };
            /*
            case 'stripe':
                return { providerName: activeProvider, adapter: new StripeProvider(credentials) };
            */
            default:
                throw new Error(`Payment provider '${activeProvider}' is unsupported or missing an adapter.`);
        }
    }

    /**
     * Create checkout/mandate sessions
     * @param {Object} params { planId, amount, currency, customerDetails, notes }
     */
    static async createCheckoutSession(params) {
        const { adapter } = await this.getActiveProvider();
        return await adapter.createCheckoutSession(params);
    }

    /**
     * Normalizes Webhook Triggers
     */
    static async verifyWebhook(providerName, rawBody, headers) {
        const settings = await PlatformSettings.getInstance();
        const config = settings.paymentConfig || {};
        const credentials = config[providerName] || {};

        let adapter;
        switch (providerName) {
            case 'razorpay':
                adapter = new RazorpayProvider(credentials);
                break;
            default:
                throw new Error(`Unknown webhook provider: ${providerName}`);
        }

        return await adapter.verifyWebhook(rawBody, headers, credentials.webhookSecret);
    }

    /**
     * Automated Recurring Charges
     */
    static async chargeRecurring(providerName, providerSubscriptionId, amount, currency, notes = {}) {
        const settings = await PlatformSettings.getInstance();
        const config = settings.paymentConfig || {};
        const credentials = config[providerName] || {};

        let adapter;
        switch (providerName) {
            case 'razorpay':
                adapter = new RazorpayProvider(credentials);
                break;
            default:
                throw new Error(`Payment provider adapter '${providerName}' missing for recurring charge.`);
        }

        return await adapter.chargeRecurring(providerSubscriptionId, amount, currency, notes);
    }

    /**
     * Cancel Subscription explicitly at the gateway layer
     */
    static async cancelSubscription(providerName, providerSubscriptionId) {
        const settings = await PlatformSettings.getInstance();
        const config = settings.paymentConfig || {};
        const credentials = config[providerName] || {};

        let adapter;
        switch (providerName) {
            case 'razorpay':
                adapter = new RazorpayProvider(credentials);
                break;
            default:
                throw new Error(`Provider missing for cancellation.`);
        }

        return await adapter.cancelSubscription(providerSubscriptionId);
    }

    /**
     * Helpers for traditional signature verifications (e.g. Razorpay Frontend Success handlers)
     */
    static async verifyPaymentSignature(orderId, paymentId, signature) {
        const { adapter } = await this.getActiveProvider();
        if (typeof adapter.verifyPaymentSignature !== 'function') {
            throw new Error(`Configured active provider does not support direct signature verifications. Rely on Webhooks instead.`);
        }
        return await adapter.verifyPaymentSignature(orderId, paymentId, signature);
    }
}

module.exports = PaymentService;

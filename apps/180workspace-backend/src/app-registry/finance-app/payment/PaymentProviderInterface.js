'use strict';

/**
 * PaymentProviderInterface
 * Blueprint for all generic payment adapter plugins (e.g., RazorpayProvider, StripeProvider).
 * Forces unified method signatures regardless of the actual gateway used.
 */
class PaymentProviderInterface {
    constructor(credentials) {
        if (new.target === PaymentProviderInterface) {
            throw new TypeError("Cannot construct Abstract PaymentProviderInterface directly");
        }
    }

    /**
     * @param {Object} params
     * @param {string} params.planId Internal ID
     * @param {number} params.amount Minor units (paise/cents)
     * @param {string} params.currency 
     * @param {Object} params.customerDetails { email, phone, name }
     * @returns {Promise<{ url: string, providerOrderId: string, options: Object }>}
     */
    async createCheckoutSession(params) {
        throw new Error("Method 'createCheckoutSession()' must be implemented.");
    }

    /**
     * Translates raw incoming webhooks into strict internal events (e.g. PAYMENT_SUCCESS)
     * @param {Object} rawBody
     * @param {Object} headers 
     * @param {string} webhookSecret
     * @returns {Promise<{ event: string, data: Object }>}
     */
    async verifyWebhook(rawBody, headers, webhookSecret) {
        throw new Error("Method 'verifyWebhook()' must be implemented.");
    }

    /**
     * Autopay/Recurring background processing 
     * @param {string} providerSubscriptionId (mandate token id, stripe sub id)
     * @param {number} amount Minor units
     * @param {string} currency
     * @returns {Promise<{ status: string, providerPaymentId: string }>}
     */
    async chargeRecurring(providerSubscriptionId, amount, currency) {
        throw new Error("Method 'chargeRecurring()' must be implemented.");
    }

    /**
     * Safely drop automated recurring sequences from the gateway
     * @param {string} providerSubscriptionId
     * @returns {Promise<{ success: boolean }>}
     */
    async cancelSubscription(providerSubscriptionId) {
        throw new Error("Method 'cancelSubscription()' must be implemented.");
    }

    /**
     * Process return/refund via gateway specific APIs
     * @param {string} providerPaymentId
     * @param {number} amount Minor units
     * @returns {Promise<{ refundId: string, status: string }>}
     */
    async refundPayment(providerPaymentId, amount) {
        throw new Error("Method 'refundPayment()' must be implemented.");
    }

    /**
     * Pull explicit payment statuses mapped locally onto generalized standards 
     * @param {string} providerPaymentId
     * @returns {Promise<{ status: string, amount: number, metadata: Object }>}
     */
    async getPaymentStatus(providerPaymentId) {
        throw new Error("Method 'getPaymentStatus()' must be implemented.");
    }
}

module.exports = PaymentProviderInterface;

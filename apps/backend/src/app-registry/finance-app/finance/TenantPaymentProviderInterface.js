'use strict';

class TenantPaymentProviderInterface {
    constructor(config) {
        if (new.target === TenantPaymentProviderInterface) {
            throw new TypeError("Cannot construct Abstract instances directly");
        }
        this.config = config;
    }

    async initialize() {
        throw new Error('Method "initialize()" must be implemented.');
    }

    async generatePaymentLink({ amount, currency, description, referenceId, customerInfo, returnUrl }) {
        throw new Error('Method "generatePaymentLink()" must be implemented.');
    }

    async verifyWebhookSignature(payload, signature, secret) {
        throw new Error('Method "verifyWebhookSignature()" must be implemented.');
    }

    async payout({ amount, currency, purpose, referenceId, recipientEmail, recipientPhone }) {
        throw new Error('Method "payout()" must be implemented.');
    }
}

module.exports = TenantPaymentProviderInterface;

'use strict';

const crypto = require('crypto');
const Razorpay = require('razorpay');
const PaymentProviderInterface = require('../PaymentProviderInterface');

class RazorpayProvider extends PaymentProviderInterface {
    constructor(credentials) {
        super(credentials);
        if (!credentials || !credentials.keyId || !credentials.secret) {
            throw new Error('RazorpayProvider requires keyId and secret');
        }
        this.keyId = credentials.keyId;
        this.secret = credentials.secret;
        this.webhookSecret = credentials.webhookSecret;
        this.razorpay = new Razorpay({ key_id: this.keyId, key_secret: this.secret });
    }

    /**
     * @param {Object} params { planId, amount, currency, customerDetails, notes }
     * @returns { url, providerOrderId, options }
     */
    async createCheckoutSession(params) {
        const order = await this.razorpay.orders.create({
            amount: params.amount, // minor units
            currency: params.currency || 'INR',
            receipt: `mandate_${Date.now()}`,
            payment_capture: 1,
            notes: params.notes || {}
        });

        // Razorpay UI handles checkout natively through JS options mapping, 
        // We return the required configuration props.
        return {
            url: null, // Razorpay utilizes frontend SDK overlay, not explicit redirect URLs typically like Stripe
            providerOrderId: order.id,
            options: {
                keyId: this.keyId,
                amount: order.amount,
                currency: order.currency,
                orderId: order.id
            }
        };
    }

    /**
     * @param {Object} rawBody Payload from incoming webhook
     * @param {Object} headers Webhook headers 
     * @returns { event, data }
     */
    async verifyWebhook(rawBody, headers, webhookSecretToUse) {
        const secret = webhookSecretToUse || this.webhookSecret;
        if (!secret) throw new Error('RazorpayProvider missing webhookSecret');

        const signature = headers['x-razorpay-signature'];
        if (!signature) throw new Error('Missing razorpay webhook signature');

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');

        if (expectedSignature !== signature) {
            throw new Error('Invalid razorpay signature mismatch');
        }

        const payload = JSON.parse(rawBody);
        const event = payload.event;
        const entity = payload.payload;

        // Normalize internal event mappings
        let internalEvent = null;
        let eventData = {};

        switch (event) {
            case 'payment.authorized':
                internalEvent = 'PAYMENT_AUTHORIZED';
                eventData = {
                    providerOrderId: entity.payment.entity.order_id,
                    providerPaymentId: entity.payment.entity.id,
                    mandateToken: entity.payment.entity.token_id,
                    notes: entity.payment.entity.notes || {}
                };
                break;
            case 'payment.captured':
                internalEvent = 'PAYMENT_SUCCESS';
                eventData = {
                    providerOrderId: entity.payment.entity.order_id,
                    providerPaymentId: entity.payment.entity.id,
                    amount: entity.payment.entity.amount,
                    notes: entity.payment.entity.notes || {}
                };
                break;
            case 'payment.failed':
                internalEvent = 'PAYMENT_FAILED';
                eventData = {
                    providerPaymentId: entity.payment.entity.id,
                    errorDescription: entity.payment.entity.error_description,
                    notes: entity.payment.entity.notes || {}
                };
                break;
            case 'token.confirmed':
            case 'token.active':
                internalEvent = 'MANDATE_AUTHORIZED';
                eventData = {
                    mandateToken: entity.token.entity.id,
                    status: entity.token.entity.status
                };
                break;
            default:
                internalEvent = `UNHANDLED_EVENT_${event}`;
        }

        return { event: internalEvent, data: eventData, raw: payload };
    }

    /**
     * Helper to verify direct backend checkout interactions (non-webhook)
     */
    async verifyPaymentSignature(orderId, paymentId, signature) {
        const generated = crypto
            .createHmac('sha256', this.secret)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');
        if (generated !== signature) {
            throw new Error('Payment verification failed: signature mismatch');
        }
        return true;
    }

    /**
     * @param {string} providerSubscriptionId (Mandate Token)
     * @param {number} amount Minor units
     * @param {string} currency
     */
    async chargeRecurring(providerSubscriptionId, amount, currency, notes = {}) {
        if (!providerSubscriptionId) throw new Error('Missing mandate token for Razorpay recurring charge');

        // Step 1: Create implicit recurring order
        const order = await this.razorpay.orders.create({
            amount: amount,
            currency: currency || 'INR',
            receipt: `renewal_${Date.now()}`,
            payment_capture: 1,
            notes: notes
        });

        // Step 2: Push explicit charge through stored token
        const payment = await this.razorpay.payments.createRecurringPayment({
            email: 'admin@company.com',
            contact: '9999999999',
            amount: amount,
            currency: currency || 'INR',
            order_id: order.id,
            token: providerSubscriptionId,
            recurring: '1',
            description: `Subscription renewal`,
            notes: notes
        });

        return {
            status: 'pending_capture',
            providerPaymentId: payment.id,
            providerOrderId: order.id,
            rawPayment: payment
        };
    }

    /**
     * Razorpay mandates don't natively require explicit cancellation APIs since they depend 
     * purely on our system deciding whether or not to issue chargeRecurring keys. However,
     * if future subscriptions natively hit Razorpay Subscriptions API, we cancel here.
     */
    async cancelSubscription(providerSubscriptionId) {
        // Since we are leveraging e-Mandates vs Subscriptions API natively, dropping the token reference locally
        // suffices. If explicit token revocation is demanded, implement razorpay.tokens.delete(providerSubscriptionId)
        return { success: true };
    }

    /**
     * @param {string} providerPaymentId
     * @param {number} amount
     */
    async refundPayment(providerPaymentId, amount) {
        const refund = await this.razorpay.payments.refund(providerPaymentId, {
            amount: amount // minor units
        });
        return { refundId: refund.id, status: refund.status };
    }

    /**
     * @param {string} providerPaymentId
     */
    async getPaymentStatus(providerPaymentId) {
        const payment = await this.razorpay.payments.fetch(providerPaymentId);
        return {
            status: payment.status, // authorized, captured, refunded, failed
            amount: payment.amount,
            metadata: payment.notes
        };
    }
}

module.exports = RazorpayProvider;

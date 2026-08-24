import crypto from 'crypto';
import Razorpay from 'razorpay';
import { PlatformPaymentProviderInterface } from '../platform-payment.interface';

export class RazorpayPlatformProvider implements PlatformPaymentProviderInterface {
    private keyId: string;
    private secret: string;
    private webhookSecret: string;
    private razorpay: any;

    constructor(credentials: any) {
        if (!credentials || !credentials.keyId || !credentials.secret) {
            throw new Error('RazorpayPlatformProvider requires keyId and secret');
        }
        this.keyId = credentials.keyId;
        this.secret = credentials.secret;
        this.webhookSecret = credentials.webhookSecret;
        this.razorpay = new Razorpay({ key_id: this.keyId, key_secret: this.secret });
    }

    async createCheckoutSession(params: any) {
        const order = await this.razorpay.orders.create({
            amount: params.amount,
            currency: params.currency || 'INR',
            receipt: `mandate_${Date.now()}`,
            payment_capture: 1,
            notes: params.notes || {}
        });

        return {
            url: null,
            providerOrderId: order.id,
            options: {
                keyId: this.keyId,
                amount: order.amount,
                currency: order.currency,
                orderId: order.id
            }
        };
    }

    async verifyWebhook(rawBody: string, headers: any, webhookSecretToUse: string) {
        const secret = webhookSecretToUse || this.webhookSecret;
        if (!secret) throw new Error('RazorpayPlatformProvider missing webhookSecret');

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

        let internalEvent = null;
        let eventData: any = {};

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
            case 'subscription.charged':
                internalEvent = 'SUBSCRIPTION_CHARGED';
                eventData = {
                    subscriptionId: entity.subscription.entity.id,
                    notes: entity.subscription.entity.notes || {}
                };
                break;
            case 'subscription.authenticated':
                internalEvent = 'SUBSCRIPTION_AUTHENTICATED';
                eventData = {
                    subscriptionId: entity.subscription.entity.id,
                    notes: entity.subscription.entity.notes || {}
                };
                break;
            case 'subscription.halted':
                internalEvent = 'SUBSCRIPTION_HALTED';
                eventData = {
                    subscriptionId: entity.subscription.entity.id,
                    notes: entity.subscription.entity.notes || {}
                };
                break;
            case 'subscription.cancelled':
                internalEvent = 'SUBSCRIPTION_CANCELLED';
                eventData = {
                    subscriptionId: entity.subscription.entity.id,
                    notes: entity.subscription.entity.notes || {}
                };
                break;
            default:
                internalEvent = `UNHANDLED_EVENT_${event}`;
        }

        return { event: internalEvent, data: eventData, raw: payload };
    }

    async verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
        const generated = crypto
            .createHmac('sha256', this.secret)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');
        if (generated !== signature) {
            throw new Error('Payment verification failed: signature mismatch');
        }
        return true;
    }

    async chargeRecurring(providerSubscriptionId: string, amount: number, currency: string, notes: any = {}) {
        if (!providerSubscriptionId) throw new Error('Missing mandate token for Razorpay recurring charge');

        const order = await this.razorpay.orders.create({
            amount: amount,
            currency: currency || 'INR',
            receipt: `renewal_${Date.now()}`,
            payment_capture: 1,
            notes: notes
        });

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

    async cancelSubscription(providerSubscriptionId: string) {
        return { success: true };
    }

    async refundPayment(providerPaymentId: string, amount: number) {
        const refund = await this.razorpay.payments.refund(providerPaymentId, {
            amount: amount
        });
        return { refundId: refund.id, status: refund.status };
    }

    async getPaymentStatus(providerPaymentId: string) {
        const payment = await this.razorpay.payments.fetch(providerPaymentId);
        return {
            status: payment.status,
            amount: payment.amount,
            metadata: payment.notes
        };
    }
}

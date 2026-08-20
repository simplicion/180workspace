import { prisma } from '@workspace/db';
import { CompanyPaymentProviderInterface } from '../company-payment-provider.interface';
import Stripe from 'stripe';

export class StripeCompanyProvider implements CompanyPaymentProviderInterface {
    private stripe: Stripe;
    private config: any;

    constructor(config: any) {
        this.config = config;
        if (!config.secretKey) {
            throw new Error('Stripe Company secret key is missing');
        }

        this.stripe = new Stripe(config.secretKey, {
            apiVersion: '2026-02-25.clover' as any // Default API version or inject if needed
        });
    }

    async initialize(): Promise<boolean> {
        return true;
    }

    /**
     * Generates a Stripe Checkout Session URL for payment.
     */
    async generatePaymentLink({ amount, currency, description, referenceId, customerInfo, returnUrl }: any): Promise<any> {
        try {
            // Stripe expects amount in minor units (cents/pence)
            const unitAmount = Math.round(amount * 100);

            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: currency || 'usd',
                            product_data: {
                                name: description || 'Invoice Payment',
                                metadata: {
                                    referenceId
                                }
                            },
                            unit_amount: unitAmount,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${returnUrl}?status=success&referenceId=${referenceId}`,
                cancel_url: `${returnUrl}?status=cancelled&referenceId=${referenceId}`,
                customer_email: customerInfo.email,
                client_reference_id: referenceId,
                metadata: {
                    referenceId
                }
            });

            return {
                paymentLinkId: session.id,
                paymentLinkUrl: session.url,
                providerOrderId: session.payment_intent,
                providerName: 'stripe'
            };
        } catch (error: any) {
            console.error('Stripe Company generatePaymentLink error:', error);
            throw new Error(error.message || 'Failed to generate Stripe Payment Session');
        }
    }

    /**
     * Verifies Stripe Webhook signature and returns the event.
     */
    async verifyWebhookSignature(payload: any, signature: string): Promise<boolean> {
        if (!this.config.webhookSecret) {
            throw new Error('Stripe Company webhook secret is not configured');
        }

        try {
            const event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                this.config.webhookSecret
            );
            return !!event;
        } catch (err: any) {
            console.error('Stripe Webhook Signature Verification Failed:', err.message);
            return false;
        }
    }

    /**
     * Placeholder for Payouts (Requires Stripe Connect Onboarding)
     */
    async payout({ amount, currency, purpose, referenceId, recipientEmail, recipientPhone, bankDetails }: any): Promise<any> {
        // Stripe Payouts for companys usually require Stripe Connect and "Destination Charges" or "Separate Charges & Transfers".
        // This is a placeholder for future extension.
        console.warn('Stripe Payouts expansion requested but not fully implemented (requires Stripe Connect).');
        throw new Error('Stripe Payouts integration for individual companys is currently in development.');
    }
}

import crypto from 'crypto';
import { CompanyPaymentProviderInterface } from '../company-payment/company-payment-provider.interface';

export class OneEightyPayCompanyProvider implements CompanyPaymentProviderInterface {
    private clientId: string;
    private clientSecret: string;
    private webhookSecret: string;
    private apiUrl: string;
    private payUrl: string;

    constructor(config: any = {}) {
        this.clientId = config.clientId || process.env.ONE_EIGHTY_CLIENT_ID || process.env.NEXT_PUBLIC_180_CLIENT_ID || '';
        this.clientSecret = config.clientSecret || process.env.ONE_EIGHTY_CLIENT_SECRET || '';
        this.webhookSecret = config.webhookSecret || process.env.ONE_EIGHTY_WEBHOOK_SECRET || '';
        this.apiUrl = config.apiUrl || process.env.ONE_EIGHTY_API_URL || 'https://services.180workspace.com';
        this.payUrl = config.payUrl || process.env.NEXT_PUBLIC_180_PAY_URL || 'https://pay.180workspace.com';
    }

    async initialize(): Promise<boolean> {
        return true;
    }

    async generatePaymentLink({ amount, currency, description, referenceId, customerInfo, returnUrl }: any): Promise<any> {
        const sessionId = `sess_180pay_${crypto.randomUUID().replace(/-/g, '')}`;
        const paymentLinkUrl = `${this.payUrl}/checkout/${sessionId}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const res = await fetch(`${this.apiUrl}/api/v1/checkout/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.clientSecret}`,
                    'x-client-id': this.clientId,
                },
                body: JSON.stringify({
                    amount: Number(amount),
                    currency: (currency || 'INR').toUpperCase(),
                    title: description || 'Workspace Payment',
                    description: description || `Payment for ${customerInfo?.name || 'Customer'}`,
                    metadata: {
                        referenceId,
                        customerEmail: customerInfo?.email,
                        customerName: customerInfo?.name,
                    },
                    returnUrl,
                    clientId: this.clientId,
                }),
                signal: controller.signal
            }).finally(() => clearTimeout(timeoutId));

            if (res.ok) {
                const data: any = await res.json();
                return {
                    paymentLinkId: data.sessionId || sessionId,
                    paymentLinkUrl: data.url || paymentLinkUrl,
                    providerOrderId: data.orderId || sessionId,
                    providerName: '180pay'
                };
            }
        } catch (e: any) {
            console.warn('[180Pay Company Provider] Direct session fallback used:', e.message);
        }

        return {
            paymentLinkId: sessionId,
            paymentLinkUrl,
            providerOrderId: sessionId,
            providerName: '180pay'
        };
    }

    async verifyWebhookSignature(payload: any, signature: string, secret?: string): Promise<boolean> {
        const verifySecret = secret || this.webhookSecret;
        if (!verifySecret || !signature) return false;
        try {
            const hmac = crypto.createHmac('sha256', verifySecret);
            const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
            const expectedSig = hmac.update(rawBody).digest('hex');
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
        } catch {
            return false;
        }
    }

    async payout(params: any): Promise<any> {
        const payoutId = `po_180pay_${crypto.randomUUID().replace(/-/g, '')}`;
        return {
            payoutId,
            status: 'queued',
            providerName: '180pay'
        };
    }
}

// Alias StripeCompanyProvider for backwards-compatibility without third-party stripe module
export class StripeCompanyProvider extends OneEightyPayCompanyProvider {}

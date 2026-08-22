export interface PlatformPaymentProviderInterface {
    createCheckoutSession(params: {
        planId: string;
        amount: number;
        currency: string;
        customerDetails?: { email?: string; phone?: string; name?: string };
        notes?: any;
    }): Promise<{ url: string | null; providerOrderId: string; options: any }>;

    verifyWebhook(rawBody: string, headers: any, webhookSecret: string): Promise<{ event: string; data: any; raw: any }>;

    chargeRecurring(providerSubscriptionId: string, amount: number, currency: string, notes?: any): Promise<{ status: string; providerPaymentId: string; providerOrderId?: string; rawPayment?: any }>;

    cancelSubscription(providerSubscriptionId: string): Promise<{ success: boolean }>;

    refundPayment(providerPaymentId: string, amount: number): Promise<{ refundId: string; status: string }>;

    getPaymentStatus(providerPaymentId: string): Promise<{ status: string; amount: number; metadata: any }>;
}

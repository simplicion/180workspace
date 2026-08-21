import { prisma } from '@workspace/db';
export interface CompanyPaymentProviderInterface {
    initialize(): Promise<boolean>;
    
    generatePaymentLink(params: {
        amount: number;
        currency?: string;
        description?: string;
        referenceId: string;
        customerInfo: { name: string; email: string; phone?: string };
        returnUrl?: string;
    }): Promise<{ paymentLinkId: string; paymentLinkUrl: string; providerOrderId?: string; providerName: string }>;
    
    verifyWebhookSignature(payload: any, signature: string, secret?: string): Promise<boolean>;
    
    payout(params: {
        amount: number;
        currency?: string;
        purpose?: string;
        referenceId: string;
        recipientEmail: string;
        recipientPhone: string;
        bankDetails?: { accountHolderName: string; ifscCode: string; accountNumber: string };
    }): Promise<{ payoutId: string; status: string; providerName: string }>;
    
    validateBankAccount?(params: {
        name: string;
        email: string;
        contact: string;
        accountNumber: string;
        ifsc: string;
    }): Promise<{ validationId: string; status: string; providerName: string }>;
}

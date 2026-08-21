import { prisma } from '@workspace/db';
import { CompanyPaymentProviderInterface } from './company-payment-provider.interface';
import { RazorpayCompanyProvider } from '../providers/razorpay-company.provider';
import { StripeCompanyProvider } from '../providers/stripe-company.provider';

export class CompanyPaymentService {
    static getProviderAdapter(providerName: string, config: any): CompanyPaymentProviderInterface {
        switch (providerName) {
            case 'razorpay':
                return new RazorpayCompanyProvider(config.razorpay);
            case 'stripe':
                return new StripeCompanyProvider(config.stripe);
            default:
                throw new Error(`Unsupported company payment provider: ${providerName}`);
        }
    }

    static async getActiveProvider(companyId: string): Promise<CompanyPaymentProviderInterface> {
        const config = await prisma.companyConfig.findFirst({
            where: { companyId }
        });
        
        // Use JSON fields or fallback
        const paymentConfig: any = config?.companyPaymentConfig || {};
        
        if (!config || !paymentConfig) {
            throw new Error('Company payment configuration not found');
        }

        const activeProvider = paymentConfig.activeProvider;
        if (activeProvider === 'manual' || !activeProvider) {
            throw new Error('Company payments are set to manual or unconfigured');
        }

        return this.getProviderAdapter(activeProvider, paymentConfig);
    }

    static async getWebhookSecret(companyId: string, providerName: string): Promise<string> {
        const config = await prisma.companyConfig.findFirst({
            where: { companyId }
        });
        
        const paymentConfig: any = config?.companyPaymentConfig || {};
        
        if (!config || !paymentConfig) {
            throw new Error('Company payment configuration not found');
        }

        switch (providerName) {
            case 'razorpay':
                return paymentConfig.razorpay?.webhookSecret;
            case 'stripe':
                return paymentConfig.stripe?.webhookSecret;
            default:
                throw new Error(`Unsupported webhook provider: ${providerName}`);
        }
    }
}


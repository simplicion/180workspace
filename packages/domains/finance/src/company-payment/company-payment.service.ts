import { prisma } from '@workspace/db';
import { CompanyPaymentProviderInterface } from './company-payment-provider.interface';
import { StripeCompanyProvider } from '../providers/stripe-company.provider';

export class CompanyPaymentService {
    static getProviderAdapter(providerName: string, config: any): CompanyPaymentProviderInterface {
        switch (providerName) {
            case '180pay':
            case 'stripe':
            default:
                return new StripeCompanyProvider(config?.stripe || config?.['180pay'] || config);
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
            case 'stripe':
                return paymentConfig.stripe?.webhookSecret;
            default:
                throw new Error(`Unsupported webhook provider: ${providerName}`);
        }
    }
}


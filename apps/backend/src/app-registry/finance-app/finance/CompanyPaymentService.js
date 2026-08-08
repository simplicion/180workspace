'use strict';

class CompanyPaymentService {
    static getProviderAdapter(providerName, config) {
        switch (providerName) {
            case 'razorpay':
                const RazorpayCompanyProvider = require('./providers/RazorpayCompanyProvider');
                return new RazorpayCompanyProvider(config.razorpay);
            case 'stripe':
                const StripeCompanyProvider = require('./providers/StripeCompanyProvider');
                return new StripeCompanyProvider(config.stripe);
            default:
                throw new Error(`Unsupported company payment provider: ${providerName}`);
        }
    }

    static async getActiveProvider(prisma, companyId) {
        const config = await prisma.companyConfig.findFirst({
            where: { companyId }
        });
        
        // Use JSON fields or fallback
        const paymentConfig = config?.companyPaymentConfig || {};
        
        if (!config || !paymentConfig) {
            throw new Error('Company payment configuration not found');
        }

        const activeProvider = paymentConfig.activeProvider;
        if (activeProvider === 'manual' || !activeProvider) {
            throw new Error('Company payments are set to manual or unconfigured');
        }

        return this.getProviderAdapter(activeProvider, paymentConfig);
    }

    static async getWebhookSecret(prisma, companyId, providerName) {
        const config = await prisma.companyConfig.findFirst({
            where: { companyId }
        });
        
        const paymentConfig = config?.companyPaymentConfig || {};
        
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

module.exports = CompanyPaymentService;

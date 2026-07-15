'use strict';

class TenantPaymentService {
    static getProviderAdapter(providerName, config) {
        switch (providerName) {
            case 'razorpay':
                const RazorpayTenantProvider = require('./providers/RazorpayTenantProvider');
                return new RazorpayTenantProvider(config.razorpay);
            case 'stripe':
                const StripeTenantProvider = require('./providers/StripeTenantProvider');
                return new StripeTenantProvider(config.stripe);
            default:
                throw new Error(`Unsupported tenant payment provider: ${providerName}`);
        }
    }

    static async getActiveProvider(prisma, companyId) {
        const config = await prisma.companyConfig.findFirst({
            where: { companyId }
        });
        
        // Use JSON fields or fallback
        const paymentConfig = config?.tenantPaymentConfig || {};
        
        if (!config || !paymentConfig) {
            throw new Error('Tenant payment configuration not found');
        }

        const activeProvider = paymentConfig.activeProvider;
        if (activeProvider === 'manual' || !activeProvider) {
            throw new Error('Tenant payments are set to manual or unconfigured');
        }

        return this.getProviderAdapter(activeProvider, paymentConfig);
    }

    static async getWebhookSecret(prisma, companyId, providerName) {
        const config = await prisma.companyConfig.findFirst({
            where: { companyId }
        });
        
        const paymentConfig = config?.tenantPaymentConfig || {};
        
        if (!config || !paymentConfig) {
            throw new Error('Tenant payment configuration not found');
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

module.exports = TenantPaymentService;

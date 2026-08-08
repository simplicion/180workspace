'use strict';

const CompanyPaymentService = require('./CompanyPaymentService');

class BankVerificationService {
    /**
     * Initiates bank account verification for a user.
     */
    static async verifyEmployeeAccount(prisma, userId, companyId) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) throw new Error('User not found');
        if (!user.bankDetails?.accountNumber || !user.bankDetails?.ifscCode) {
            throw new Error('Bank details are incomplete');
        }

        const provider = await CompanyPaymentService.getActiveProvider(prisma, companyId);
        if (!provider.validateBankAccount) {
            throw new Error('Selected payment provider does not support bank verification');
        }

        const result = await provider.validateBankAccount({
            name: user.bankDetails.accountHolderName || user.name,
            email: user.email,
            contact: user.phone || '9999999999', // Fallback
            accountNumber: user.bankDetails.accountNumber,
            ifsc: user.bankDetails.ifscCode
        });

        // Update user bankDetails status to pending (stored as JSON)
        const updatedBankDetails = {
            ...(user.bankDetails || {}),
            verificationStatus: 'pending',
            verificationId: result.validationId
        };
        await prisma.user.update({
            where: { id: userId },
            data: { bankDetails: updatedBankDetails }
        });

        return { success: true, validationId: result.validationId, status: 'pending' };
    }

    /**
     * Handles Razorpay fund_account.validation webhooks
     */
    static async handleValidationWebhook(prisma, payload) {
        const validation = payload.payload?.fund_account?.validation;

        if (!validation) return;

        const statusMap = {
            'completed': 'verified',
            'failed': 'failed',
            'rejected': 'failed'
        };

        const newStatus = statusMap[validation.status];
        if (!newStatus) return;

        // Find user by verificationId in JSON bankDetails
        // Since bankDetails is a Json field, we use a raw filter approach
        const users = await prisma.user.findMany({
            where: {
                bankDetails: {
                    path: ['verificationId'],
                    equals: validation.id
                }
            }
        });
        const user = users[0];
        if (!user) {
            console.error(`User with verificationId ${validation.id} not found`);
            return;
        }

        const updatedBankDetails = {
            ...(user.bankDetails || {}),
            verificationStatus: newStatus
        };
        await prisma.user.update({
            where: { id: user.id },
            data: { bankDetails: updatedBankDetails }
        });

        console.log(`Bank verification for user ${user.id} updated to ${newStatus}`);
    }
}

module.exports = BankVerificationService;

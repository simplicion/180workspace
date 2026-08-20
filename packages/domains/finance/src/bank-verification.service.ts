// @ts-nocheck
import { PrismaClient } from '@workspace/db';
const { CompanyPaymentService } = require('./company-payment.service');

export class BankVerificationService {
    /**
     * Initiates bank account verification for a user.
     */
    static async verifyEmployeeAccount(userId: string, companyId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) throw new Error('User not found');
        
        const bankDetails: any = user.bankDetails || {};
        if (!bankDetails.accountNumber || !bankDetails.ifscCode) {
            throw new Error('Bank details are incomplete');
        }

        const provider = await CompanyPaymentService.getActiveProvider(companyId);
        if (!provider.validateBankAccount) {
            throw new Error('Selected payment provider does not support bank verification');
        }

        const result = await provider.validateBankAccount({
            name: bankDetails.accountHolderName || user.name,
            email: user.email,
            contact: user.phone || '9999999999', // Fallback
            accountNumber: bankDetails.accountNumber,
            ifsc: bankDetails.ifscCode
        });

        // Update user bankDetails status to pending (stored as JSON)
        const updatedBankDetails = {
            ...bankDetails,
            verificationStatus: 'pending',
            verificationId: result.validationId
        };
        // @ts-ignore
        await prisma.user.update({
            where: { id: userId },
            data: { bankDetails: updatedBankDetails } as any
        });

        return { success: true, validationId: result.validationId, status: 'pending' };
    }

    /**
     * Handles Razorpay fund_account.validation webhooks
     */
    static async handleValidationWebhook(payload: any) {
        const validation = payload.payload?.fund_account?.validation;

        if (!validation) return;

        const statusMap: Record<string, string> = {
            'completed': 'verified',
            'failed': 'failed',
            'rejected': 'failed'
        };

        const newStatus = statusMap[validation.status];
        if (!newStatus) return;

        // Find user by verificationId in JSON bankDetails
        // Since bankDetails is a Json field, we use a raw filter approach
        // @ts-ignore
        const users = await prisma.user.findMany({
            where: {
                bankDetails: {
                    path: ['verificationId'],
                    equals: validation.id
                }
            } as any
        });
        const user = users[0];
        if (!user) {
            console.error(`User with verificationId ${validation.id} not found`);
            return;
        }

        // @ts-ignore
        const updatedBankDetails = {
            ...((user as any).bankDetails || {}),
            verificationStatus: newStatus
        };
        await prisma.user.update({
            where: { id: user.id },
            data: { bankDetails: updatedBankDetails } as any
        });

        console.log(`Bank verification for user ${user.id} updated to ${newStatus}`);
    }
}

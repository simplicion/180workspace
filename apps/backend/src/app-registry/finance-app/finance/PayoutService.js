const CompanyPaymentService = require('./CompanyPaymentService');

class PayoutService {
    static async initiateSalaryPayout(prisma, salaryId) {
        const salary = await prisma.salary.findUnique({
            where: { id: salaryId },
            include: { employee: true }
        });
        if (!salary) throw new Error('Salary record not found');
        if (salary.status === 'paid') throw new Error('Salary already paid');

        // Enforcement: Ensure bank account is verified
        if (salary.employee?.bankDetails?.verificationStatus !== 'verified') {
            throw new Error(`Employee bank account is not verified. Current status: ${salary.employee?.bankDetails?.verificationStatus || 'unverified'}`);
        }

        // Use the unified CompanyPaymentService to get the active provider
        const provider = await CompanyPaymentService.getActiveProvider(prisma, salary.companyId);
        const amount = salary.netSalary || 0;

        // 1. Create a transaction record in 'pending' state
        const transaction = await prisma.companyTransaction.create({
            data: {
                companyId: salary.companyId,
                type: 'outbound',
                amount,
                status: 'pending',
                provider: provider.constructor.name,
                referenceModel: 'Salary',
                referenceId: salary.id,
                userId: salary.employeeId,
                metadata: { month: salary.month }
            }
        });

        // 2. Execute Payout via Provider adapter
        try {
            const result = await provider.payout({
                amount,
                currency: 'INR',
                purpose: 'salary',
                referenceId: transaction.id,
                recipientEmail: salary.employee?.email,
                recipientPhone: salary.employee?.phone,
                bankDetails: salary.employee?.bankDetails
            });

            // 3. Update transaction and salary
            await prisma.companyTransaction.update({
                where: { id: transaction.id },
                data: { status: 'completed', providerTransactionId: result.payoutId }
            });

            await prisma.salary.update({
                where: { id: salaryId },
                data: {
                    status: 'paid',
                    paidAt: new Date(),
                    payoutId: result.payoutId,
                    payoutStatus: result.status
                }
            });

            return { success: true, transactionId: transaction.id, message: 'Payout completed successfully' };
        } catch (err) {
            await prisma.companyTransaction.update({
                where: { id: transaction.id },
                data: { status: 'failed', failureReason: err.message }
            });

            await prisma.salary.update({
                where: { id: salaryId },
                data: { status: 'failed' }
            });

            throw err;
        }
    }

    static async initiateVendorPayout(prisma, billId) {
        const bill = await prisma.vendorBill.findUnique({
            where: { id: billId },
            include: { vendor: true }
        });
        if (!bill) throw new Error('Vendor bill not found');
        if (bill.status === 'paid') throw new Error('Bill already paid');

        const vendor = bill.vendor;
        if (!vendor) throw new Error('Vendor details not found');

        // Ensure vendor bank account is verified
        if (vendor.bankDetails?.verificationStatus !== 'verified') {
            throw new Error(`Vendor bank account is not verified. Current status: ${vendor.bankDetails?.verificationStatus || 'unverified'}`);
        }

        const provider = await CompanyPaymentService.getActiveProvider(prisma, bill.companyId);
        const amount = bill.amount || 0;

        // 1. Create a transaction record
        const transaction = await prisma.companyTransaction.create({
            data: {
                companyId: bill.companyId,
                type: 'outbound',
                amount,
                status: 'pending',
                provider: provider.constructor.name,
                referenceModel: 'VendorBill',
                referenceId: bill.id,
                metadata: { billNumber: bill.billNumber }
            }
        });

        // 2. Execute Payout
        try {
            const result = await provider.payout({
                amount,
                currency: bill.currency || 'INR',
                purpose: 'vendor_payment',
                referenceId: transaction.id,
                recipientEmail: vendor.email,
                recipientPhone: vendor.phone,
                bankDetails: vendor.bankDetails
            });

            // 3. Update records
            await prisma.companyTransaction.update({
                where: { id: transaction.id },
                data: { status: 'completed', providerTransactionId: result.payoutId }
            });

            await prisma.vendorBill.update({
                where: { id: billId },
                data: {
                    status: 'paid',
                    paidAt: new Date(),
                    payoutId: result.payoutId,
                    transactionId: transaction.id
                }
            });

            return { success: true, transactionId: transaction.id, message: 'Vendor payout completed successfully' };
        } catch (err) {
            await prisma.companyTransaction.update({
                where: { id: transaction.id },
                data: { status: 'failed', failureReason: err.message }
            });

            // We don't mark the bill as failed, just let it stay pending/approved for retry
            throw err;
        }
    }
}

module.exports = PayoutService;

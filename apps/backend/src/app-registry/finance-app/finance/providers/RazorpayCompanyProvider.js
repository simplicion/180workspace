'use strict';

const Razorpay = require('razorpay');
const crypto = require('crypto');
const CompanyPaymentProviderInterface = require('../CompanyPaymentProviderInterface');

class RazorpayCompanyProvider extends CompanyPaymentProviderInterface {
    constructor(config) {
        super(config);
        if (!config.keyId || !config.keySecret) {
            throw new Error('Razorpay Company keys are missing');
        }

        this.razorpay = new Razorpay({
            key_id: config.keyId,
            key_secret: config.keySecret,
        });
    }

    async initialize() {
        return true;
    }

    async generatePaymentLink({ amount, currency, description, referenceId, customerInfo, returnUrl }) {
        // amount is expected in major units (e.g., INR 100). Razorpay wants paise.
        const amountInPaise = Math.round(amount * 100);

        try {
            const paymentLinkPayload = {
                amount: amountInPaise,
                currency: currency || 'INR',
                reference_id: referenceId,
                description: description || 'Invoice Payment',
                customer: {
                    name: customerInfo.name,
                    email: customerInfo.email,
                    contact: customerInfo.phone || ''
                },
                notify: {
                    sms: false,
                    email: false // We will handle our own emails
                },
                reminder_enable: false,
                notes: {
                    referenceId
                }
            };

            const linkParams = await this.razorpay.paymentLink.create(paymentLinkPayload);

            return {
                paymentLinkId: linkParams.id,
                paymentLinkUrl: linkParams.short_url,
                providerOrderId: linkParams.order_id, // Might be null depending on RP version
                providerName: 'razorpay'
            };
        } catch (error) {
            console.error('Razorpay Company generatePaymentLink error:', error);
            throw new Error(error?.error?.description || 'Failed to generate Razorpay Payment Link');
        }
    }

    async verifyWebhookSignature(payload, signature) {
        if (!this.config.webhookSecret) {
            throw new Error('Razorpay Company webhook secret is not configured');
        }

        const expectedSignature = crypto
            .createHmac('sha256', this.config.webhookSecret)
            .update(payload)
            .digest('hex');

        return expectedSignature === signature;
    }

    async payout({ amount, currency, purpose, referenceId, recipientEmail, recipientPhone, bankDetails }) {
        const amountInPaise = Math.round(amount * 100);

        try {
            const payoutPayload = {
                account_number: this.config.razorpayXAccountNumber,
                amount: amountInPaise,
                currency: currency || 'INR',
                mode: 'IMPS',
                purpose: purpose || 'payout',
                reference_id: referenceId,
                queue_if_low_balance: true,
                fund_account: {
                    account_type: 'bank_account',
                    bank_account: {
                        name: bankDetails?.accountHolderName || 'Recipient',
                        ifsc: bankDetails?.ifscCode || '',
                        account_number: bankDetails?.accountNumber || ''
                    },
                    contact: {
                        name: bankDetails?.accountHolderName || 'Recipient',
                        email: recipientEmail,
                        contact: recipientPhone,
                        type: 'employee',
                        reference_id: referenceId
                    }
                }
            };

            const payoutResponse = await this.razorpay.payouts.create(payoutPayload);

            return {
                payoutId: payoutResponse.id,
                status: payoutResponse.status,
                providerName: 'razorpay'
            };
        } catch (error) {
            console.error('Razorpay Company payout error:', error);
            throw new Error(error?.error?.description || 'Failed to initiate Razorpay Payout');
        }
    }

    /**
     * Penny Drop Verification
     */
    async validateBankAccount({ name, email, contact, accountNumber, ifsc }) {
        try {
            const validationPayload = {
                account_number: this.config.razorpayXAccountNumber,
                fund_account: {
                    account_type: 'bank_account',
                    bank_account: {
                        name: name,
                        ifsc: ifsc,
                        account_number: accountNumber
                    },
                    contact: {
                        name: name,
                        email: email,
                        contact: contact,
                        type: 'vendor', // Razorpay often requires vendor or employee type
                        reference_id: `VERIFY_${Date.now()}`
                    }
                },
                amount: 100, // â‚¹1 in paise
                currency: 'INR',
                notes: {
                    purpose: 'Bank Account Verification'
                }
            };

            const validationResponse = await this.razorpay.fundAccount.validate(validationPayload);

            return {
                validationId: validationResponse.id,
                status: validationResponse.status,
                providerName: 'razorpay'
            };
        } catch (error) {
            console.error('Razorpay Company validation error:', error);
            throw new Error(error?.error?.description || 'Failed to initiate Bank Account Validation');
        }
    }
}

module.exports = RazorpayCompanyProvider;

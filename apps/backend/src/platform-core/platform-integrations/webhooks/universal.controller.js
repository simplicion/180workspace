'use strict';

/**
 * Universal Webhook Controller
 * Maps incoming gateway calls against active provider abstractions.
 */

const PaymentService = require('../../../app-registry/finance-app/payment/PaymentService');
const { BillingService } = require('@workspace/finance');

// Handle incoming gateway callbacks safely
exports.handleWebhook = async (req, res) => {
    try {
        const providerName = req.params.provider; // Ex: /api/webhooks/:provider (razorpay, stripe)
        const rawBody = req.rawBody; // Required from express raw middleware
        const headers = req.headers;

        // Verify and translate the provider-specific payload into universal event standard
        const { event, data, raw } = await PaymentService.verifyWebhook(providerName, rawBody, headers);

        // Process translated payload
        switch (event) {
            case 'MANDATE_AUTHORIZED':
                // Occurs when the mandate explicitly becomes active after checking
                console.log(`[Webhook] ${providerName} mandate authorized for token:`, data.mandateToken);
                break;
            case 'PAYMENT_AUTHORIZED':
                // Often pre-capture authorization, can log to payment history if required
                console.log(`[Webhook] ${providerName} payment authorized for token:`, data.mandateToken);
                break;
            case 'PAYMENT_SUCCESS':
                console.log(`[Webhook] ${providerName} explicit charge success:`, data.providerPaymentId);
                // Attempt to auto process the recurring success mapping using our system
                if (data.notes && data.notes.subscriptionId) {
                    await BillingService.processRecurringSuccess(
                        data.notes.subscriptionId,
                        data.providerPaymentId,
                        data.amount // Passed securely in minor units from verified signature
                    );
                }
                break;
            case 'PAYMENT_FAILED':
                console.log(`[Webhook] ${providerName} explicit charge failure:`, data.providerPaymentId);
                if (data.notes && data.notes.subscriptionId) {
                    await BillingService.handleAutopayFailure(
                        data.notes.subscriptionId,
                        data.providerPaymentId,
                        data.errorDescription
                    );
                }
                break;
            default:
                console.warn(`[Webhook] Unhandled mapped event ${event} from ${providerName}`);
        }

        res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('[Webhook Error]', err.message);
        // Important: Always return 200 or gateway triggers endless silent retries usually
        // unless it's a structural 400 signature fail directly rejecting unauthorized hits
        if (err.message.includes('signature mismatch') || err.message.includes('missing')) {
            return res.status(400).send('Invalid Signature');
        }
        res.status(500).json({ error: 'Webhook processing failed internally' });
    }
};

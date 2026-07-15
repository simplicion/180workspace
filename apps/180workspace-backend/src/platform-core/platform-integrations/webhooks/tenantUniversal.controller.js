'use strict';

const { prisma, getTenantPrisma } = require('@workspace/db');
const TenantPaymentService = require('../../../app-registry/finance-app/finance/TenantPaymentService');
const AutomationService = require('../../platform-communications/services/automation.service');

// This handles incoming webhooks directed at a specific tenant.
exports.handleWebhook = async (req, res, next) => {
    try {
        const providerName = req.params.provider;
        const companyId = req.query.companyId;

        if (!companyId) {
            console.error(`[Tenant Webhook] companyId missing from query parameters`);
            return res.status(400).send('companyId missing');
        }

        const company = await prisma.company.findUnique({ where: { id: companyId } });

        if (!company || !company.databaseConfigured) {
            return res.status(404).send('Company database not configured');
        }

        const tenantPrisma = getTenantPrisma(companyId);

        const rawBody = req.rawBody || JSON.stringify(req.body);
        const signature = req.headers['x-razorpay-signature'] || req.headers['stripe-signature'];

        // 1. Verify Signature
        try {
            const providerAdapter = await TenantPaymentService.getActiveProvider(tenantPrisma);
            const isValid = await providerAdapter.verifyWebhookSignature(rawBody, signature);
            if (!isValid) return res.status(400).send('Invalid webhook signature');
        } catch (sigErr) {
            console.error(`[Tenant Webhook] signature error:`, sigErr.message);
            return res.status(400).send('Invalid signature or configuration missing');
        }

        // 2. Parse payload based on provider
        let eventType, payload;

        if (providerName === 'razorpay') {
            eventType = req.body.event;
            payload = req.body.payload;

            if (eventType === 'payment.captured' || eventType === 'payment.authorized' || eventType === 'payment_link.paid') {
                const entity = payload.payment.entity;
                const paymentLink = payload.payment_link?.entity;
                const referenceId = entity.notes?.referenceId || paymentLink?.reference_id;

                if (referenceId) {
                    const invoice = await tenantPrisma.invoice.findUnique({ where: { id: referenceId } });
                    if (invoice && invoice.status !== 'paid') {
                        // Update Invoice status
                        await tenantPrisma.invoice.update({
                            where: { id: referenceId },
                            data: {
                                status: 'paid',
                                paidAt: new Date(),
                                gatewayPaymentId: entity.id
                            }
                        });

                        // Log Transaction
                        await tenantPrisma.tenantTransaction.create({
                            data: {
                                companyId: companyId,
                                type: 'inbound',
                                amount: entity.amount / 100,
                                currency: entity.currency,
                                status: 'completed',
                                provider: 'razorpay',
                                providerTransactionId: entity.id,
                                providerOrderId: entity.order_id || null,
                                referenceModel: 'Invoice',
                                referenceId: invoice.id
                            }
                        });

                        await AutomationService.trigger({
                            eventType: 'invoice_paid',
                            triggeredBy: null,
                            relatedItem: { itemId: invoice.id, itemModel: 'Invoice' },
                            description: `Invoice ${invoice.invoiceNumber || invoice.id} marked as paid via Razorpay.`
                        }, tenantPrisma);
                    }
                }
            } else if (eventType.startsWith('fund_account.validation.')) {
                const BankVerificationService = require('../../../app-registry/finance-app/finance/BankVerificationService');
                await BankVerificationService.handleValidationWebhook(tenantPrisma, req.body);
            }
        } else if (providerName === 'stripe') {
            const event = JSON.parse(rawBody);
            eventType = event.type;
            const session = event.data.object;

            if (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded') {
                const referenceId = session.client_reference_id || session.metadata?.referenceId;

                if (referenceId) {
                    const invoice = await tenantPrisma.invoice.findUnique({ where: { id: referenceId } });

                    if (invoice && invoice.status !== 'paid') {
                        await tenantPrisma.invoice.update({
                            where: { id: referenceId },
                            data: {
                                status: 'paid',
                                paidAt: new Date(),
                                gatewayPaymentId: session.id || session.payment_intent
                            }
                        });

                        // Log Transaction
                        await tenantPrisma.tenantTransaction.create({
                            data: {
                                companyId: companyId,
                                type: 'inbound',
                                amount: (session.amount_total || session.amount_received) / 100,
                                currency: session.currency,
                                status: 'completed',
                                provider: 'stripe',
                                providerTransactionId: session.id || session.payment_intent,
                                providerOrderId: session.payment_intent || null,
                                referenceModel: 'Invoice',
                                referenceId: invoice.id
                            }
                        });

                        await AutomationService.trigger({
                            eventType: 'invoice_paid',
                            triggeredBy: null,
                            relatedItem: { itemId: invoice.id, itemModel: 'Invoice' },
                            description: `Invoice ${invoice.invoiceNumber || invoice.id} marked as paid via Stripe.`
                        }, tenantPrisma);
                    }
                }
            }
        }

        res.status(200).send('Webhook processed');
    } catch (err) {
        console.error(`[Tenant Webhook] Error:`, err);
        res.status(500).send('Webhook processing failed');
    }
};

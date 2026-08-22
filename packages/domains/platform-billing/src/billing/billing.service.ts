// @ts-nocheck
import { prisma } from '@workspace/db';
import { PrismaClient } from '@workspace/db';
import { PlatformPaymentService as PaymentService } from '../platform-payment/platform-payment.service';

export class BillingService {
    // â”€â”€â”€ Helper to get PlatformSettings Instance (singleton in PostgreSQL)
    static async getPlatformSettingsInstance() {
        let settings = await prisma.platformSettings.findFirst();
        if (!settings) {
            settings = await prisma.platformSettings.create({
                data: {
                    platformName: '180workspace',
                    paymentsEnabled: false,
                    trialDays: 14,
                    maxFreeUsers: 5,
                    trialMandateAmount: 100,
                    maxAutopayRetries: 3,
                    autopayRetryIntervalDays: 3,
                    themeColor: '#4f46e5'
                }
            });
        }
        return settings;
    }

    // â”€â”€â”€ Get Default / Free Plan
    static async getOrCreateDefaultPlan(settings: any) {
        let plan = await prisma.plan.findFirst({
            where: { isActive: true, price: 0 },
            orderBy: { createdAt: 'asc' }
        });
        if (!plan) {
            plan = await prisma.plan.findFirst({
                where: { isActive: true },
                orderBy: { price: 'asc' }
            });
        }
        if (!plan) {
            plan = await prisma.plan.create({
                data: {
                    planName: 'Free Trial',
                    price: 0,
                    currency: 'INR',
                    billingCycle: 'monthly',
                    maxUsers: settings.maxFreeUsers || 10,
                    features: ['Core Platform features', 'Project Management', 'HR Module', 'Attendance'],
                    isActive: true,
                    trialDays: settings.trialDays || 14
                }
            });
        }
        return plan;
    }

    // â”€â”€â”€ Create Initial Trial Subscription (automatic start)
    static async createTrialSubscription(companyId: string, userId: string) {
        const settings = await this.getPlatformSettingsInstance();
        const plan = await this.getOrCreateDefaultPlan(settings);
        const trialDays = (plan.trialDays > 0) ? plan.trialDays : (settings.trialDays || 14);

        const now = new Date();
        const trialEndDate = new Date(now);
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        // Clean up any existing subscriptions for this company (safety check)
        await prisma.subscription.deleteMany({ where: { companyId } });

        const subscription = await prisma.subscription.create({
            data: {
                companyId,
                planId: plan.id,
                status: 'trial', // Start as 'trial' for immediate access
                mandateStatus: 'pending',
                autopayEnabled: false,
                trialStartDate: now,
                trialEndDate,
                startDate: now,
                paymentStatus: 'pending',
                amount: plan.price,
                currency: plan.currency
            }
        });

        await prisma.company.update({
            where: { id: companyId },
            data: {
                trialStartDate: now,
                trialEndDate: trialEndDate,
                subscriptionStatus: 'trial',
                accountStatus: 'active',
            }
        });

        return { subscription, trialDays };
    }

    // â”€â”€â”€ Initiate Mandate / Checkout Order
    static async initiateMandateOrder(planId: string) {
        const settings = await this.getPlatformSettingsInstance();
        const config = settings.paymentConfig as any || {};
        const providerName = config.activeProvider || 'razorpay';

        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan || !plan.isActive) throw new Error('Plan not found or inactive');

        const mandateAmount = settings.trialMandateAmount || 100; // Minor units

        // Unified call to abstracted gateway layer
        const session = await PaymentService.createCheckoutSession({
            planId: planId.toString(),
            amount: mandateAmount,
            currency: settings.currency || 'INR',
            customerDetails: { email: 'admin@company.com' },
            notes: {
                planId: planId.toString(),
                purpose: 'trial_mandate',
                trialDays: String(settings.trialDays || 14),
            }
        });

        return {
            ...session.options,
            url: session.url,
            orderId: session.providerOrderId,
            providerName,
            planName: plan.planName,
            planPrice: plan.price,
            trialDays: (plan.trialDays > 0) ? plan.trialDays : (settings.trialDays || 14),
            planId: plan.id,
        };
    }

    // â”€â”€â”€ Verify Mandate + Start Trial
    static async verifyMandate({ orderId, paymentId, signature, tokenId, planId, companyId }: any) {
        // Abstracted signature verifier (Razorpay relies on this primarily if non-webhook)
        await PaymentService.verifyPaymentSignature(orderId, paymentId, signature);

        const settings = await this.getPlatformSettingsInstance();
        const config = settings.paymentConfig as any || {};
        const providerName = config.activeProvider || 'razorpay';

        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) throw new Error('Plan not found');

        const trialDays = (plan.trialDays > 0) ? plan.trialDays : (settings.trialDays || 14);
        const now = new Date();
        const trialEndDate = new Date(now);
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        await prisma.subscription.updateMany({
            where: { companyId, status: 'mandate_pending' },
            data: { status: 'cancelled', cancelReason: 'superseded by new mandate', cancelledAt: now }
        });

        const subscription = await prisma.subscription.create({
            data: {
                companyId,
                planId: plan.id,
                status: 'trial',
                provider: providerName,
                providerSubscriptionId: tokenId || null, // Abstract token referencing
                providerOrderId: orderId,
                providerCustomerId: null,
                mandateStatus: tokenId ? 'authorized' : 'pending',
                mandateAmount: settings.trialMandateAmount || 100,
                autopayEnabled: !!tokenId,
                trialStartDate: now,
                trialEndDate,
                nextChargeDate: trialEndDate,
                startDate: now,
                paymentId,
                paymentStatus: 'paid',
                amount: plan.price,
                currency: plan.currency || 'INR'
            }
        });

        await prisma.company.update({
            where: { id: companyId },
            data: {
                trialStartDate: now,
                trialEndDate,
                subscriptionStatus: 'trial',
                accountStatus: 'active',
                autopayEnabled: !!tokenId,
                mandateStatus: tokenId ? 'authorized' : 'pending',
                nextChargeDate: trialEndDate
            }
        });

        return { subscription, plan, trialDays };
    }

    // â”€â”€â”€ Charge Recurring
    static async chargeRecurring(subscription: any) {
        if (!subscription.providerSubscriptionId) {
            throw new Error('No mandate token found for subscription abstraction layer.');
        }

        const plan = await prisma.plan.findUnique({ where: { id: subscription.planId } });
        if (!plan) throw new Error('Plan not found for subscription');

        let finalAmount = plan.price;
        if (subscription.couponApplied) {
            try {
                const result = await this.applyCoupon(prisma, subscription.couponApplied, plan.price);
                finalAmount = result.finalAmount;
            } catch { /* ignore */ }
        }

        const amountInPaise = Math.round(finalAmount * 100);
        if (amountInPaise < 100) throw new Error('Charge amount too low');

        // Rely on Payment Service Abstractor
        const transaction = await PaymentService.chargeRecurring(
            subscription.provider || 'razorpay',
            subscription.providerSubscriptionId,
            amountInPaise,
            plan.currency || 'INR',
            {
                subscriptionId: subscription.id.toString(),
                planId: subscription.planId.toString(),
                purpose: 'auto_renewal',
            }
        );

        return { transaction, plan, amountInPaise };
    }

    // â”€â”€â”€ Handle Successful Auto-Charge
    static async processRecurringSuccess(subscriptionId: string, paymentId: string, amountInPaise: number) {
        const subscription = await prisma.subscription.findUnique({
            where: { id: subscriptionId },
            include: { plan: true }
        });
        if (!subscription) throw new Error('Subscription not found');

        const now = new Date();
        const newEndDate = new Date(subscription.subscriptionEndDate || now);
        const plan = subscription.plan;
        const daysToAdd = (plan?.billingCycle === 'yearly') ? 365 : 30;
        newEndDate.setDate(newEndDate.getDate() + daysToAdd);

        const updatedSub = await prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                status: 'active',
                paymentStatus: 'paid',
                paymentId,
                autopayFailCount: 0,
                autopayLastFailedAt: null,
                subscriptionEndDate: newEndDate
            }
        });

        await prisma.paymentHistory.create({
            data: {
                paymentId: `PAY-${Date.now()}`,
                companyId: subscription.companyId,
                subscriptionId: subscription.id,
                amount: amountInPaise / 100,
                currency: subscription.currency,
                provider: subscription.provider || 'system',
                providerPaymentId: paymentId,
                status: 'success'
            }
        });

        await prisma.company.update({
            where: { id: subscription.companyId },
            data: {
                subscriptionStatus: 'active',
                mandateStatus: 'authorized',
                autopayEnabled: true,
                nextChargeDate: newEndDate
            }
        });

        return updatedSub;
    }

    // â”€â”€â”€ Handle Autopay Failure
    static async handleAutopayFailure(subscriptionId: string, paymentId: string | null = null, errorReason: string | null = null) {
        const settings = await this.getPlatformSettingsInstance();
        const maxRetries = settings.maxAutopayRetries || 3;
        const retryIntervalDays = settings.autopayRetryIntervalDays || 3;

        const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
        if (!subscription) return;

        const nextFailCount = (subscription.autopayFailCount || 0) + 1;
        const now = new Date();

        if (paymentId) {
            await prisma.paymentHistory.create({
                data: {
                    paymentId: `PAY-${Date.now()}`,
                    companyId: subscription.companyId,
                    subscriptionId: subscription.id,
                    amount: subscription.amount,
                    currency: subscription.currency,
                    provider: subscription.provider || 'system',
                    providerPaymentId: paymentId,
                    status: 'failed',
                    rawWebhookData: errorReason ? { reason: errorReason } : {}
                }
            });
        }

        if (nextFailCount >= maxRetries) {
            await prisma.subscription.update({
                where: { id: subscriptionId },
                data: {
                    autopayFailCount: nextFailCount,
                    autopayLastFailedAt: now,
                    paymentStatus: 'failed',
                    status: 'suspended',
                    autopayEnabled: false,
                    autopayPausedAt: now
                }
            });

            await prisma.company.update({
                where: { id: subscription.companyId },
                data: {
                    subscriptionStatus: 'suspended',
                    mandateStatus: 'failed',
                    autopayEnabled: false,
                    nextChargeDate: null
                }
            });
        } else {
            const nextRetry = new Date();
            nextRetry.setDate(nextRetry.getDate() + retryIntervalDays);

            await prisma.subscription.update({
                where: { id: subscriptionId },
                data: {
                    autopayFailCount: nextFailCount,
                    autopayLastFailedAt: now,
                    paymentStatus: 'failed',
                    nextChargeDate: nextRetry
                }
            });

            await prisma.company.update({
                where: { id: subscription.companyId },
                data: {
                    nextChargeDate: nextRetry
                }
            });
        }
    }

    // â”€â”€â”€ Manual Plan Activation (after trial ends or for free plans)
    static async activateManualPlan({ planId, orderId, paymentId, signature, tokenId, couponCode, providerOverride, companyId }: any) {
        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) throw new Error('Plan not found');

        // Skip payment verification if plan price is 0
        if (plan.price > 0) {
            if (!orderId || !paymentId || !signature) {
                throw new Error('Payment verification details required for paid plans');
            }
            await PaymentService.verifyPaymentSignature(orderId, paymentId, signature);
        }

        const settings = await this.getPlatformSettingsInstance();
        const config = settings.paymentConfig as any || {};
        const defaultProvider = config.activeProvider || 'razorpay';
        const providerName = providerOverride || defaultProvider;

        let finalAmount = plan.price;
        let discountAmount = 0;
        if (couponCode && plan.price > 0) {
            try {
                const result = await this.applyCoupon(prisma, couponCode, plan.price);
                finalAmount = result.finalAmount;
                discountAmount = result.discountAmount;
                await prisma.coupon.update({
                    where: { couponCode: couponCode.toUpperCase() },
                    data: { usedCount: { increment: 1 } }
                });
            } catch { /* ignore coupon errors */ }
        }

        const now = new Date();
        const subEndDate = new Date(now);

        // Determine duration: trialDays if present, else standard cycle
        const durationDays = plan.trialDays > 0 ? plan.trialDays : (plan.billingCycle === 'yearly' ? 365 : 30);
        subEndDate.setDate(subEndDate.getDate() + durationDays);

        const isTrial = plan.price === 0 && plan.trialDays > 0;

        await prisma.subscription.updateMany({
            where: { companyId, status: { in: ['trial', 'active', 'paused', 'mandate_pending'] } },
            data: { status: 'cancelled', cancelledAt: now, cancelReason: 'replaced by manual activation' }
        });

        const subscription = await prisma.subscription.create({
            data: {
                companyId,
                planId: plan.id,
                status: isTrial ? 'trial' : 'active',
                provider: plan.price > 0 ? providerName : 'none',
                providerSubscriptionId: tokenId || null,
                providerOrderId: orderId || `FREE-${Date.now()}`,
                mandateStatus: tokenId ? 'authorized' : 'pending',
                autopayEnabled: !!tokenId,
                subscriptionStartDate: now,
                subscriptionEndDate: subEndDate,
                trialStartDate: isTrial ? now : null,
                trialEndDate: isTrial ? subEndDate : null,
                startDate: now,
                renewalDate: subEndDate,
                nextChargeDate: tokenId ? subEndDate : null,
                paymentId: paymentId || `FREE-PAY-${Date.now()}`,
                paymentStatus: plan.price > 0 ? 'paid' : 'none',
                amount: finalAmount,
                currency: plan.currency || 'INR',
                couponApplied: (couponCode && plan.price > 0) ? couponCode.toUpperCase() : null,
                discountAmount,
            }
        });

        if (plan.price > 0) {
            await prisma.paymentHistory.create({
                data: {
                    paymentId: `PAY-${Date.now()}`,
                    companyId,
                    subscriptionId: subscription.id,
                    amount: finalAmount,
                    currency: plan.currency || 'INR',
                    provider: providerName,
                    providerPaymentId: paymentId,
                    status: 'success'
                }
            });
        }

        await prisma.company.update({
            where: { id: companyId },
            data: {
                subscriptionStatus: isTrial ? 'trial' : 'active',
                mandateStatus: tokenId ? 'authorized' : 'pending',
                autopayEnabled: !!tokenId,
                nextChargeDate: tokenId ? subEndDate : null,
                trialEndDate: isTrial ? subEndDate : null,
            }
        });

        return { subscription, plan, discountAmount };
    }

    // â”€â”€â”€ Cancel Autopay
    static async cancelAutopay(companyId: string) {
        const subscription = await prisma.subscription.findFirst({
            where: {
                companyId,
                status: { in: ['trial', 'active'] },
            },
            orderBy: { createdAt: 'desc' }
        });
        if (!subscription) throw new Error('No active subscription found');

        if (subscription.providerSubscriptionId) {
            try {
                await PaymentService.cancelSubscription(subscription.provider, subscription.providerSubscriptionId);
            } catch (e) { /* non fatal, local disabling suffices */ }
        }

        const updatedSub = await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                autopayEnabled: false,
                providerSubscriptionId: null, // Drop association
                mandateStatus: 'pending',
                nextChargeDate: null
            }
        });

        await prisma.company.update({
            where: { id: companyId },
            data: {
                autopayEnabled: false,
                mandateStatus: 'pending',
                nextChargeDate: null,
            }
        });

        return updatedSub;
    }

    // â”€â”€â”€ Get Current Subscription
    static async getActiveSubscription(companyId: string) {
        return prisma.subscription.findFirst({
            where: {
                companyId,
                status: { in: ['trial', 'active'] },
            },
            include: { plan: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async getCurrentSubscription(companyId: string) {
        return prisma.subscription.findFirst({
            where: { companyId },
            include: { plan: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async getPlans() {
        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' }
        });
        return plans;
    }

    static async getHistory(companyId: string) {
        const subscriptions = await prisma.subscription.findMany({
            where: { companyId },
            include: { plan: true },
            orderBy: { createdAt: 'desc' }
        });
    
        return subscriptions.map(sub => ({
            ...sub,
            _id: sub.id,
            planId: sub.plan ? {
            _id: sub.plan.id,
            planName: sub.plan.planName,
            price: sub.plan.price,
            currency: sub.plan.currency
            } : null
        }));
    }

    // â”€â”€â”€ Trial Countdown
    static getTrialCountdown(subscription: any) {
        if (!subscription) {
            return { daysLeft: 0, isExpired: true, isWarning: false, isTrialing: false, status: 'expired' };
        }

        if (subscription.status === 'active') {
            const endDate = subscription.subscriptionEndDate || subscription.renewalDate;
            if (!endDate) return { daysLeft: 999, isExpired: false, isWarning: false, isTrialing: false, status: 'active' };
            const msLeft = new Date(endDate).getTime() - new Date().getTime();
            const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
            return { daysLeft, isExpired: daysLeft === 0, isWarning: daysLeft <= 5, isTrialing: false, status: 'active' };
        }

        if (subscription.status === 'trial') {
            const msLeft = new Date(subscription.trialEndDate).getTime() - new Date().getTime();
            const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
            return { daysLeft, isExpired: daysLeft === 0, isWarning: daysLeft <= 3, isTrialing: true, status: 'trial' };
        }

        if (subscription.status === 'paused') {
            return { daysLeft: 0, isExpired: false, isWarning: true, isTrialing: false, status: 'paused' };
        }

        if (subscription.status === 'mandate_pending') {
            return { daysLeft: 0, isExpired: false, isWarning: false, isTrialing: false, status: 'mandate_pending' };
        }

        return { daysLeft: 0, isExpired: true, isWarning: false, isTrialing: false, status: subscription.status };
    }

    // â”€â”€â”€ Enforce User Limit
    static async enforceUserLimit(companyId: string) {
        const sub = await this.getActiveSubscription(companyId);
        if (!sub || !sub.plan) return { allowed: true, current: 0, max: Infinity };

        const maxUsers = sub.plan.maxUsers;
        if (!maxUsers || maxUsers <= 0) return { allowed: true, current: 0, max: Infinity };

        const current = await prisma.user.count({
            where: { companyId, isActive: true, deletedAt: null }
        });
        const allowed = current < maxUsers;

        return { allowed, current, max: maxUsers, plan: sub.plan.planName };
    }

    // â”€â”€â”€ Apply Coupon
    static async applyCoupon(couponCode: string, originalAmount: number) {
        if (!couponCode) return { discountAmount: 0, finalAmount: originalAmount, coupon: null };

        const coupon = await prisma.coupon.findUnique({
            where: { couponCode: couponCode.toUpperCase() }
        });
        if (!coupon || !coupon.isActive) throw new Error('Invalid or inactive coupon code');

        if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error('Coupon has expired');
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new Error('Coupon usage limit reached');

        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = Math.round((originalAmount * coupon.discountValue) / 100);
        } else {
            discountAmount = Math.min(coupon.discountValue, originalAmount);
        }

        return { discountAmount, finalAmount: Math.max(0, originalAmount - discountAmount), coupon };
    }

    // â”€â”€â”€ Legacy Mapping
    static async processPayment({ planId, razorpayOrderId, razorpayPaymentId, razorpaySignature, couponCode, companyId }: any) {
        return this.activateManualPlan({
            planId,
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            signature: razorpaySignature,
            couponCode,
            providerOverride: 'razorpay',
            companyId
        });
    }
}


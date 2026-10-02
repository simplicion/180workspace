import { Request, Response, NextFunction } from 'express';
import { BillingService } from '@workspace/platform-billing';
import { prisma } from '@workspace/db';
import * as crypto from 'crypto';
import { effectiveEnabledAppsFor, isPaidPlanFor } from './entitlements';

let cachedRates: any = null;
let lastRatesFetchTime = 0;

export class BillingController {
    static async getCurrencyInfo(req: Request, companyId?: string): Promise<{ currency: string, rate: number, country: string }> {
        let currency = 'USD';
        let country = 'US';
        
        if (companyId) {
            const company = await prisma.company.findUnique({ where: { id: companyId }, select: { currency: true, country: true } });
            if (company?.currency) {
                currency = company.currency;
            }
            if (company?.country) {
                country = company.country;
            }
        }

        // Fetch live exchange rates (Cache for 1 hour)
        const now = Date.now();
        if (!cachedRates || (now - lastRatesFetchTime) > 3600000) {
            try {
                const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                if (response.ok) {
                    const data = await response.json();
                    cachedRates = data.rates;
                    lastRatesFetchTime = now;
                }
            } catch (error) {
                console.error("Failed to fetch exchange rates:", error);
            }
        }

        // Default rates fallback if API fails completely on boot
        const rate = cachedRates?.[currency] || 1;

        return { currency, rate, country };
    }

    static async getBillingInfo(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = (req as any).company?.id || (req as any).user?.companyId;
            if (!companyId) return res.status(400).json({ error: 'Company ID required' });

            const [company, currentSubscription, companyConfig, teamMembersCount, activeWebsitesCount, storageAgg] = await Promise.all([
                prisma.company.findUnique({ where: { id: companyId } }),
                BillingService.getActiveSubscription(companyId),
                prisma.companyConfig.findUnique({ where: { companyId } }),
                prisma.user.count({ where: { companyId } }),
                prisma.website.count({ where: { companyId } }),
                prisma.document.aggregate({ where: { companyId }, _sum: { fileSize: true } })
            ]);

            let plan = currentSubscription?.planId 
                ? await prisma.plan.findUnique({ where: { id: currentSubscription.planId } }) 
                : null;
                
            if (!plan) {
                plan = await prisma.plan.findFirst({ where: { price: 0 } });
            }

            const companyMetadata = (company?.metadata && typeof company.metadata === 'object') ? (company.metadata as any) : {};
            const rawEnabledApps = Array.isArray(companyMetadata.enabledApps) ? companyMetadata.enabledApps : [];
            const rawEnabledModules = Array.isArray(companyMetadata.enabledModules) ? companyMetadata.enabledModules : [];

            const isPaidPlan = isPaidPlanFor(plan, currentSubscription);
            const effectiveEnabledApps = effectiveEnabledAppsFor(rawEnabledApps, isPaidPlan);

            const validAppIds = ['projects', 'communications', 'workspace-tools', 'crm', 'hr', 'finance', 'insights', 'advertising', 'social-media', 'traffic-director', 'voiceforce', 'media-editor'];
            const activeAppsCount = effectiveEnabledApps.filter((app: string) => app !== 'system' && app !== 'settings' && validAppIds.includes(app)).length;

            const storageUsedBytes = storageAgg._sum.fileSize || 0;
            
            const safeCompanyConfig = {
                ...(companyConfig ? companyConfig : {}),
                companyId,
                storageUsedBytes,
                enabledApps: effectiveEnabledApps,
                enabledModules: rawEnabledModules
            };

            const isTrial = company?.subscriptionStatus === 'trial';
            let isExpired = false;
            let currentStatus = currentSubscription?.status || company?.subscriptionStatus || 'expired';

            if (isTrial) {
                if (company?.trialEndDate && new Date() > new Date(company.trialEndDate)) {
                    isExpired = true;
                    currentStatus = 'expired';
                }
            } else if (company?.subscriptionStatus === 'active') {
                // Default active tier (e.g. Kickstarter) without an explicit record
                if (!currentSubscription) {
                    isExpired = false;
                    currentStatus = 'active';
                } else {
                    isExpired = currentSubscription.status.toLowerCase() !== 'active';
                }
            } else {
                isExpired = !currentSubscription || currentSubscription.status.toLowerCase() !== 'active';
            }

            const daysLeft = isTrial && company?.trialEndDate
                    ? Math.max(0, Math.ceil((new Date(company.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                    : currentSubscription?.subscriptionEndDate 
                        ? Math.max(0, Math.ceil((new Date(currentSubscription.subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                        : (company?.subscriptionStatus === 'active' ? 999 : 0);

            res.json({
                currentSubscription: currentSubscription 
                    ? { ...currentSubscription, plan: plan || null }
                    : { 
                        status: currentStatus, 
                        billingCycle: 'Monthly',
                        plan: plan || null,
                        createdAt: company?.createdAt 
                      },
                subscription: currentSubscription ? { ...currentSubscription, plan: plan || null } : null,
                plan: plan || null,
                companyConfig: safeCompanyConfig,
                enabledApps: effectiveEnabledApps,
                enabledModules: rawEnabledModules,
                isPaidPlan,
                teamMembersCount,
                activeAppsCount,
                activeWebsitesCount,
                isExpired,
                isWarning: isTrial ? daysLeft <= 3 : (currentSubscription ? daysLeft <= 5 : false),
                isTrialing: isTrial,
                status: currentStatus,
                daysLeft,
                paymentsEnabled: true
            });
        } catch (err) { next(err); }
    }

    static async getPlans(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = (req as any).company?.id || (req as any).user?.companyId;
            const { currency, rate, country } = await BillingController.getCurrencyInfo(req, companyId);
            const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } });
            
            const localizedPlans = plans.map(plan => ({
                ...plan,
                price: Math.round(plan.price * rate), // Base price in DB is USD
                currency: currency
            }));

            res.json({ plans: localizedPlans, currency, country });
        } catch (err) { next(err); }
    }

    static async getHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = (req as any).company?.id || (req as any).user?.companyId;
            const subscriptions = await prisma.subscription.findMany({
                where: { companyId },
                include: { plan: true },
                orderBy: { createdAt: 'desc' }
            });
            res.json({ subscriptions });
        } catch (err) { next(err); }
    }

    static async checkoutPlan(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = (req as any).company?.id || (req as any).user?.companyId;
            const { planId, couponCode, idempotencyKey } = req.body;
            
            if (idempotencyKey) {
                try {
                    await prisma.processedWebhook.create({
                        data: { eventId: idempotencyKey, provider: 'checkout_idempotency', status: 'pending' }
                    });
                } catch (e) {
                    return res.status(400).json({ error: 'Duplicate checkout request detected. Please wait or refresh the page.' });
                }
            }

            if (!planId) return res.status(400).json({ error: 'Plan ID required' });

            const targetPlan = await prisma.plan.findUnique({ where: { id: planId } });
            if (!targetPlan) return res.status(404).json({ error: 'Plan not found' });

            const company = await prisma.company.findUnique({ where: { id: companyId } });
            
            const { currency, rate } = await BillingController.getCurrencyInfo(req, companyId);
            let subTotal = targetPlan.price * rate;

            let discountAmount = 0;
            if (couponCode) {
                const coupon = await prisma.coupon.findUnique({ where: { couponCode: couponCode.toUpperCase() } });
                if (coupon && coupon.isActive && (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date()) && (!coupon.maxUses || coupon.usedCount < coupon.maxUses)) {
                    if (coupon.discountType === 'percentage') {
                        discountAmount = subTotal * (coupon.discountValue / 100);
                    } else {
                        discountAmount = coupon.discountValue * rate;
                    }
                }
            }

            const discountedTotal = Math.max(0, subTotal - discountAmount);
            const taxAmount = discountedTotal * 0.18; // 18% GST on the discounted total
            let finalPrice = Number((discountedTotal + taxAmount).toFixed(2));

            if (finalPrice <= 0) {
                // If it's a 100% discount, skip 180 Pay entirely and activate the subscription directly
                let subscriptionId = '';
                
                try {
                    await prisma.$transaction(async (tx) => {
                        // Validate and consume coupon atomically
                        if (couponCode) {
                            const activeCoupon = await tx.coupon.findUnique({ where: { couponCode: couponCode.toUpperCase() } });
                            if (!activeCoupon || !activeCoupon.isActive) throw new Error("Coupon is invalid or inactive.");
                            if (activeCoupon.expiresAt && new Date(activeCoupon.expiresAt) < new Date()) throw new Error("Coupon has expired.");
                            if (activeCoupon.maxUses && activeCoupon.usedCount >= activeCoupon.maxUses) throw new Error("Coupon usage limit reached.");
                            
                            await tx.coupon.update({
                                where: { couponCode: couponCode.toUpperCase() },
                                data: { usedCount: { increment: 1 } }
                            });
                        }

                        // Cancel existing active subscription
                        const oldSub = await tx.subscription.findFirst({
                            where: { companyId, status: { in: ['ACTIVE', 'active'] } }
                        });
                        if (oldSub) {
                            await tx.subscription.update({
                                where: { id: oldSub.id },
                                data: { status: 'CANCELLED', cancelledAt: new Date() }
                            });
                        }
                        
                        const nextMonth = new Date();
                        nextMonth.setMonth(nextMonth.getMonth() + 1);

                        // Create new subscription
                        const subscription = await tx.subscription.create({
                            data: {
                                companyId,
                                planId,
                                amount: 0,
                                status: 'ACTIVE',
                                providerSubscriptionId: `free_discount_${Date.now()}`,
                                subscriptionStartDate: new Date(),
                                subscriptionEndDate: nextMonth
                            }
                        });
                        
                        subscriptionId = subscription.id;
                    });

                    // Send email to user regarding successful activation
                    const currentUser = (req as any).user;
                    if (currentUser && currentUser.email) {
                        const EmailManagementService = require('@workspace/communications').EmailManagementService;
                        if (EmailManagementService) {
                            await EmailManagementService.sendCustomEmail(
                                currentUser.id, 
                                currentUser.email, 
                                `180workspace - ${targetPlan.planName} Activated`, 
                                `<h2>Subscription Activated</h2><p>Hi ${currentUser.name},</p><p>Your subscription to <strong>${targetPlan.planName}</strong> has been successfully activated via full discount.</p><p>Thank you for choosing 180workspace!</p>`
                            ).catch((err: any) => console.error('Failed to send subscription email:', err));
                        }
                    }

                    return res.json({ success: true, isFree: true, message: `Successfully switched to ${targetPlan.planName} via full discount.`, subscriptionId });
                } catch (txError: any) {
                    return res.status(400).json({ error: txError.message || 'Checkout failed due to concurrent usage limit.' });
                }
            }

            // 180 Pay Sovereign Checkout Session Initiation
            const sessionPayload = {
                amount: finalPrice,
                currency: (currency || 'INR').toUpperCase(),
                title: `${targetPlan.planName} Subscription`,
                description: `180 Workspace ${targetPlan.planName} for ${company?.name || 'Workspace'}`,
                metadata: {
                    companyId,
                    planId: targetPlan.id,
                    planName: targetPlan.planName,
                    couponCode: couponCode || null,
                    userId: (req as any).user?.id,
                },
                clientId: process.env.ONE_EIGHTY_CLIENT_ID || process.env.NEXT_PUBLIC_180_CLIENT_ID || '180_client_5cc136397553836e34eb37ce22d13a53',
                clientSecret: process.env.ONE_EIGHTY_CLIENT_SECRET || '180_secret_41b2bd23a7a978f197c16958ea14b4de6af9abe14ec13c9c',
            };

            const apiUrl = process.env.ONE_EIGHTY_API_URL || 'https://services.180workspace.com';
            const payUrl = process.env.NEXT_PUBLIC_180_PAY_URL || 'https://pay.180workspace.com';

            const queryParams = new URLSearchParams({
                amount: String(finalPrice),
                currency: (currency || 'INR').toUpperCase(),
                title: `${targetPlan.planName} Subscription`,
                description: `180 Workspace ${targetPlan.planName} for ${company?.name || 'Workspace'}`,
                appName: '180 Workspace'
            }).toString();

            let sessionId = `sess_180pay_${crypto.randomUUID().replace(/-/g, '')}`;
            let checkoutUrl = `${payUrl}/checkout/${sessionId}?${queryParams}`;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);
                const apiRes = await fetch(`${apiUrl}/api/v1/checkout/sessions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionPayload.clientSecret}`,
                        'x-client-id': sessionPayload.clientId,
                    },
                    body: JSON.stringify(sessionPayload),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (apiRes.ok) {
                    const sessionData = await apiRes.json();
                    if (sessionData.sessionId || sessionData.session?.id || sessionData.id) {
                        sessionId = sessionData.sessionId || sessionData.session?.id || sessionData.id;
                        checkoutUrl = sessionData.checkoutUrl || `${payUrl}/checkout/${sessionId}?${queryParams}`;
                    }
                }
            } catch (err: any) {
                console.warn(`[BillingController:checkoutPlan] 180 Pay session creation network fallback: ${err.message}`);
            }

            res.json({
                success: true,
                sessionId,
                orderId: sessionId,
                checkoutUrl,
                amount: finalPrice,
                currency: (currency || 'INR').toUpperCase(),
                providerName: '180pay',
            });
        } catch (err) { next(err); }
    }

    static async validateCoupon(req: Request, res: Response, next: NextFunction) {
        try {
            const { couponCode, planId } = req.body;
            if (!couponCode) return res.status(400).json({ error: 'Coupon code required' });

            const coupon = await prisma.coupon.findUnique({ where: { couponCode: couponCode.toUpperCase() } });
            if (!coupon) return res.status(404).json({ error: 'Invalid coupon code' });
            
            if (!coupon.isActive) return res.status(400).json({ error: 'Coupon is inactive' });
            if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return res.status(400).json({ error: 'Coupon has expired' });
            if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ error: 'Coupon usage limit reached' });

            let targetPlan = null;
            if (planId) {
                targetPlan = await prisma.plan.findUnique({ where: { id: planId } });
            }

            const { rate } = await BillingController.getCurrencyInfo(req);
            let discountAmount = 0;
            
            if (targetPlan) {
                const subTotal = targetPlan.price * rate;
                if (coupon.discountType === 'percentage') {
                    discountAmount = subTotal * (coupon.discountValue / 100);
                } else {
                    discountAmount = coupon.discountValue * rate;
                }
            }

            res.json({
                code: coupon.couponCode,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                discountAmount,
                message: 'Coupon is valid'
            });
        } catch (err) { next(err); }
    }

    static async verifyPlan(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = (req as any).company?.id || (req as any).user?.companyId;
            const { sessionId, transactionId, planId, couponCode, razorpay_subscription_id, razorpay_payment_id } = req.body;

            const providerSubId = transactionId || sessionId || razorpay_subscription_id || razorpay_payment_id;

            const targetPlan = await prisma.plan.findUnique({ where: { id: planId } });
            if (!targetPlan) return res.status(404).json({ error: 'Plan not found' });

            // Wrap verification handling in a transaction to prevent race conditions & duplicate coupon usage
            await prisma.$transaction(async (tx) => {
                let existingSub = null;
                if (providerSubId) {
                    existingSub = await tx.subscription.findFirst({
                        where: { providerSubscriptionId: providerSubId, status: { in: ['ACTIVE', 'active'] } }
                    });
                }

                if (!existingSub) {
                    // Cancel current active sub
                    const currentSub = await tx.subscription.findFirst({
                        where: { companyId, status: { in: ['ACTIVE', 'active'] } }
                    });

                    if (currentSub) {
                        await tx.subscription.update({
                            where: { id: currentSub.id },
                            data: { status: 'CANCELLED', cancelledAt: new Date() }
                        });
                    }

                    const nextMonth = new Date();
                    nextMonth.setMonth(nextMonth.getMonth() + 1);

                    // Create new 180 Pay sub
                    await tx.subscription.create({
                        data: {
                            companyId,
                            planId,
                            amount: targetPlan.price,
                            status: 'ACTIVE',
                            providerSubscriptionId: providerSubId || `180pay_${Date.now()}`,
                            subscriptionStartDate: new Date(),
                            subscriptionEndDate: nextMonth
                        }
                    });

                    // Only increment coupon if the webhook hasn't processed this event yet
                    if (couponCode) {
                        await tx.coupon.update({
                            where: { couponCode: couponCode.toUpperCase() },
                            data: { usedCount: { increment: 1 } }
                        });
                    }
                }
            });

            // Send email to user regarding successful activation
            const currentUser = (req as any).user;
            if (currentUser && currentUser.email) {
                const EmailManagementService = require('@workspace/communications').EmailManagementService;
                if (EmailManagementService) {
                    await EmailManagementService.sendCustomEmail(
                        currentUser.id, 
                        currentUser.email, 
                        `180workspace - ${targetPlan.planName} Activated`, 
                        `<h2>Subscription Activated</h2><p>Hi ${currentUser.name},</p><p>Your subscription to <strong>${targetPlan.planName}</strong> has been successfully activated via 180 Pay.</p><p>Thank you for choosing 180workspace!</p>`
                    ).catch((err: any) => console.error('Failed to send subscription email:', err));
                }
            }

            res.json({ success: true, message: `Successfully switched to ${targetPlan.planName}.` });
        } catch (err) { next(err); }
    }

    static async cancelPlan(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = (req as any).company?.id || (req as any).user?.companyId;
            if (!companyId) return res.status(400).json({ error: 'Company ID required' });

            const currentSub = await prisma.subscription.findFirst({
                where: { companyId, status: { in: ['ACTIVE', 'active'] } },
                include: { plan: true }
            });

            if (!currentSub) {
                return res.status(400).json({ error: 'No active subscription found to cancel' });
            }

            if (currentSub.plan.price === 0) {
                return res.status(400).json({ error: 'Cannot cancel the free plan' });
            }

            console.log(`[BillingController:cancelPlan] Cancelled 180 Pay subscription: ${currentSub.providerSubscriptionId || currentSub.id}`);

            // Update Database: Mark subscription as cancelled
            await prisma.subscription.update({
                where: { id: currentSub.id },
                data: { status: 'CANCELLED', cancelledAt: new Date() }
            });

            // Move the workspace onto the free plan.
            try {
                await BillingService.getActiveSubscription(companyId);
            } catch (syncErr: any) {
                console.error('[Billing] could not provision the free plan after cancellation:', syncErr?.message);
            }

            res.json({ success: true, message: 'Subscription cancelled successfully. You are now on the free Kickstart plan.' });
        } catch (err) { next(err); }
    }

    /**
     * POST /api/v1/platform-billing/webhooks/180-pay
     * Webhook verification and automated subscription fulfillment using 180 Pay HMAC-SHA256
     */
    static async handle180PayWebhook(req: Request, res: Response) {
        try {
            const signature = (req.headers['x-180-signature'] || req.headers['x-signature']) as string;
            const timestamp = req.headers['x-180-timestamp'] as string;
            const webhookSecret = process.env.ONE_EIGHTY_WEBHOOK_SECRET || 'whsec_91b1a44cd792ff88dc268110c139107af96d70ea';

            // 1. Prevent Replay Attacks: Enforce 5-minute (300s) maximum drift
            const currentTime = Math.floor(Date.now() / 1000);
            if (timestamp) {
                const tsNum = parseInt(timestamp, 10);
                if (!isNaN(tsNum) && Math.abs(currentTime - tsNum) > 300) {
                    return res.status(400).send('Webhook timestamp out of tolerance');
                }
            }

            // 2. Compute expected HMAC-SHA256 signature
            let rawBody = (req as any).rawBody;
            if (rawBody instanceof Buffer) {
                // Buffer is ready
            } else if (typeof rawBody === 'string') {
                rawBody = Buffer.from(rawBody, 'utf8');
            } else {
                rawBody = Buffer.from(JSON.stringify(req.body), 'utf8');
            }

            if (signature && webhookSecret) {
                const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
                let isValid = signature.length === expected.length && 
                    crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));

                if (!isValid && timestamp) {
                    const expectedTimestamped = crypto.createHmac('sha256', webhookSecret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex');
                    isValid = signature.length === expectedTimestamped.length && 
                        crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedTimestamped, 'hex'));
                }

                if (!isValid) {
                    return res.status(400).send('Invalid webhook HMAC signature');
                }
            }

            // 3. Process event
            const event = req.body;
            const eventType = event.event || event.type;
            const eventData = event.data || event;

            if (eventType === 'payment.captured' || eventType === 'PAYMENT_RECEIVED' || eventType === 'subscription.activated') {
                const { transactionId, orderId, sessionId, amount, customer, metadata } = eventData;
                const companyId = metadata?.companyId;
                const planId = metadata?.planId;

                console.log(`[180 Pay] Captured payment ₹${amount} for ${customer?.email || 'Customer'} (Txn: ${transactionId || orderId})`);

                if (companyId && planId) {
                    const targetPlan = await prisma.plan.findUnique({ where: { id: planId } });
                    if (targetPlan) {
                        await prisma.$transaction(async (tx) => {
                            const subId = transactionId || orderId || sessionId;
                            const existing = await tx.subscription.findFirst({
                                where: { providerSubscriptionId: subId, status: { in: ['ACTIVE', 'active'] } }
                            });
                            if (!existing) {
                                const oldSub = await tx.subscription.findFirst({
                                    where: { companyId, status: { in: ['ACTIVE', 'active'] } }
                                });
                                if (oldSub) {
                                    await tx.subscription.update({
                                        where: { id: oldSub.id },
                                        data: { status: 'CANCELLED', cancelledAt: new Date() }
                                    });
                                }
                                const nextMonth = new Date();
                                nextMonth.setMonth(nextMonth.getMonth() + 1);
                                await tx.subscription.create({
                                    data: {
                                        companyId,
                                        planId: targetPlan.id,
                                        amount: targetPlan.price,
                                        status: 'ACTIVE',
                                        providerSubscriptionId: subId || `180pay_${Date.now()}`,
                                        subscriptionStartDate: new Date(),
                                        subscriptionEndDate: nextMonth
                                    }
                                });
                            }
                        });
                    }
                }
            }

            return res.status(200).json({ received: true });
        } catch (err: any) {
            console.error('[BillingController:handle180PayWebhook] Error:', err);
            return res.status(500).json({ error: err.message });
        }
    }

}


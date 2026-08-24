import { Request, Response, NextFunction } from 'express';
import { BillingService } from '@workspace/platform-billing';
import { prisma } from '@workspace/db';
import crypto from 'crypto';

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

            const company = await prisma.company.findUnique({ where: { id: companyId } });

            const currentSubscription = await BillingService.getActiveSubscription(companyId);
            let plan = currentSubscription?.planId 
                ? await prisma.plan.findUnique({ where: { id: currentSubscription.planId } }) 
                : null;
                
            if (!plan) {
                plan = await prisma.plan.findFirst({ where: { price: 0 } });
            }

            
            const companyConfig = await prisma.companyConfig.findUnique({ where: { companyId } });
            const teamMembersCount = await prisma.user.count({ where: { companyId } });
            
            let activeAppsCount = 0;
            if (company?.metadata && typeof company.metadata === 'object' && Array.isArray((company.metadata as any).enabledApps)) {
                const enabledApps = (company.metadata as any).enabledApps;
                const validAppIds = ['projects', 'communications', 'workspace-tools', 'crm', 'hr', 'finance', 'analytics', 'advertising', 'social-media'];
                activeAppsCount = enabledApps.filter((app: string) => app !== 'system' && app !== 'settings' && validAppIds.includes(app)).length;
            } else {
                // fallback to projects if enabledApps isn't found
                activeAppsCount = await prisma.project.count({ where: { companyId } });
            }

            const activeWebsitesCount = await prisma.website.count({ where: { companyId } });

            // Real-time calculation of Storage Used
            const storageAgg = await prisma.document.aggregate({
                where: { companyId },
                _sum: { fileSize: true }
            });
            const storageUsedBytes = storageAgg._sum.fileSize || 0;
            
            if (companyConfig) {
                companyConfig.storageUsedBytes = storageUsedBytes;
            }

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
                plan: plan || null,
                companyConfig: companyConfig || null,
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
                include: { planId: true },
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
                // If it's a 100% discount, skip Razorpay entirely and activate the subscription directly
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
                                status: 'ACTIVE',
                                providerSubscriptionId: `free_discount_${Date.now()}`,
                                subscriptionStartDate: new Date(),
                                subscriptionEndDate: nextMonth
                            }
                        });
                        
                        subscriptionId = subscription.id;
                    });

                    return res.json({ success: true, isFree: true, message: `Successfully switched to ${targetPlan.planName} via full discount.`, subscriptionId });
                } catch (txError: any) {
                    return res.status(400).json({ error: txError.message || 'Checkout failed due to concurrent usage limit.' });
                }
            }

            // Convert to minor units (e.g., paise/cents)
            const amount = Math.round(finalPrice * 100);

            const Razorpay = require('razorpay');
            const rzp = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });

            // Razorpay Subscriptions ONLY support INR for this account.
            // We must convert the finalPrice to INR for the gateway.
            const inrRate = cachedRates?.['INR'] || 83; // fallback to 83 if fetch failed
            const inrFinalPrice = (finalPrice / rate) * inrRate;
            const rzpAmount = Math.max(100, Math.round(inrFinalPrice * 100)); // Ensure min 1 INR

            // Create a dynamic plan to exactly match the calculated discounted price in INR
            const dynamicPlan = await rzp.plans.create({
                period: "monthly",
                interval: 1,
                item: {
                    name: `${targetPlan.planName} Subscription`,
                    amount: rzpAmount,
                    currency: 'INR',
                    description: `Plan for ${company?.name || 'Company'}`
                }
            });

            const subscription = await rzp.subscriptions.create({
                plan_id: dynamicPlan.id,
                total_count: 120, // 10 years of monthly billing
                quantity: 1,
                customer_notify: 1,
                notes: { companyId, planId, couponCode: couponCode || '', action: 'plan_upgrade_downgrade' }
            });

            res.json({ keyId: process.env.RAZORPAY_KEY_ID, subscriptionId: subscription.id, amount: rzpAmount, currency: 'INR', providerName: 'razorpay' });
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
            const { razorpay_payment_id, razorpay_order_id, razorpay_subscription_id, razorpay_signature, planId, couponCode } = req.body;

            const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
            
            if (razorpay_subscription_id) {
                hmac.update(razorpay_payment_id + '|' + razorpay_subscription_id);
            } else {
                hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
            }
            
            const expectedSignature = hmac.digest('hex');

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ error: 'Invalid signature' });
            }

            const targetPlan = await prisma.plan.findUnique({ where: { id: planId } });
            if (!targetPlan) return res.status(404).json({ error: 'Plan not found' });

            // Wrap verification handling in a transaction to prevent race conditions & duplicate coupon usage
            await prisma.$transaction(async (tx) => {
                let existingSub = null;
                if (razorpay_subscription_id) {
                    existingSub = await tx.subscription.findFirst({
                        where: { providerSubscriptionId: razorpay_subscription_id, status: { in: ['ACTIVE', 'active'] } }
                    });
                }

                if (!existingSub) {
                    // Get current active sub
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

                    // Create new sub
                    await tx.subscription.create({
                        data: {
                            companyId,
                            planId,
                            status: 'ACTIVE',
                            providerSubscriptionId: razorpay_subscription_id || null,
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

            res.json({ success: true, message: `Successfully switched to ${targetPlan.planName}.` });
        } catch (err) { next(err); }
    }

    static async webhookHandler(req: Request, res: Response, next: NextFunction) {
        try {
            const webhookSignature = req.headers['x-razorpay-signature'] as string;
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET; // Fallback for testing

            // req.body is a Buffer because of express.raw() in the routes
            const hmac = crypto.createHmac('sha256', webhookSecret || '');
            hmac.update(req.body);
            const expectedSignature = hmac.digest('hex');

            if (expectedSignature !== webhookSignature) {
                return res.status(400).send('Invalid signature');
            }

            // Extract the unique Razorpay Event ID
            const eventId = req.headers['x-razorpay-event-id'] as string;
            
            if (eventId) {
                // Idempotency check: Have we processed this webhook already?
                const existingEvent = await prisma.processedWebhook.findUnique({
                    where: { eventId }
                });

                if (existingEvent) {
                    console.log(`[Webhook] Event ${eventId} already processed. Ignoring duplicate.`);
                    return res.status(200).json({ status: 'ignored', reason: 'duplicate' });
                }
            }

            const payloadBody = JSON.parse(req.body.toString());
            const event = payloadBody.event;
            const payload = payloadBody.payload;

            if (event === 'subscription.charged' || event === 'subscription.authenticated') {
                const sub = payload.subscription.entity;
                const razorpaySubscriptionId = sub.id;

                let localSub = await prisma.subscription.findFirst({
                    where: { providerSubscriptionId: razorpaySubscriptionId, status: { in: ['ACTIVE', 'active'] } }
                });

                // Edge Case 2: User paid on Razorpay but closed the tab before redirecting to our `/verify` endpoint.
                // In this case, localSub is undefined. We MUST recover their purchase using the notes metadata.
                if (!localSub) {
                    const companyId = sub.notes?.companyId;
                    const planId = sub.notes?.planId;
                    const couponCode = sub.notes?.couponCode;

                    if (companyId && planId) {
                        await prisma.$transaction(async (tx) => {
                            // Safely cancel their old subscription first
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

                            // Recreate the subscription they bought
                            localSub = await tx.subscription.create({
                                data: {
                                    companyId,
                                    planId,
                                    status: 'ACTIVE',
                                    providerSubscriptionId: razorpaySubscriptionId,
                                    subscriptionStartDate: new Date(),
                                    subscriptionEndDate: nextMonth
                                }
                            });

                            if (couponCode) {
                                await tx.coupon.update({
                                    where: { couponCode: couponCode.toUpperCase() },
                                    data: { usedCount: { increment: 1 } }
                                });
                            }
                        });
                        console.log(`[Webhook Recovered] Created missing subscription ${(localSub as any)?.id} for company ${companyId}`);
                    }
                } else if (event === 'subscription.charged') {
                    // Standard recurring renewal logic
                    const nextMonth = new Date(localSub.subscriptionEndDate || Date.now());
                    nextMonth.setMonth(nextMonth.getMonth() + 1);

                    await prisma.subscription.update({
                        where: { id: localSub.id },
                        data: {
                            subscriptionEndDate: nextMonth
                        }
                    });
                    console.log(`[Webhook Auto-Renew] Extended subscription ${localSub.id} for company ${localSub.companyId}`);
                }
            } else if (event === 'subscription.halted' || event === 'subscription.cancelled') {
                const sub = payload.subscription.entity;
                const razorpaySubscriptionId = sub.id;

                const localSub = await prisma.subscription.findFirst({
                    where: { providerSubscriptionId: razorpaySubscriptionId, status: { in: ['ACTIVE', 'active', 'past_due'] } }
                });

                if (localSub) {
                    const newStatus = event === 'subscription.halted' ? 'past_due' : 'cancelled';
                    await prisma.subscription.update({
                        where: { id: localSub.id },
                        data: {
                            status: newStatus,
                            cancelledAt: event === 'subscription.cancelled' ? new Date() : null,
                            cancelReason: event === 'subscription.halted' ? 'Payment halted by Razorpay (In Grace Period)' : 'Cancelled by user/Razorpay'
                        }
                    });
                    
                    if (newStatus === 'past_due') {
                        console.log(`[Webhook Dunning] Subscription ${localSub.id} for company ${localSub.companyId} marked as past_due. Grace period initiated.`);
                    } else {
                        console.log(`Cancelled subscription ${localSub.id} for company ${localSub.companyId}. Reverted to Kickstart.`);
                    }
                }
            }

            // Save the processed webhook to prevent double processing
            if (eventId) {
                await prisma.processedWebhook.create({
                    data: { eventId, provider: 'razorpay' }
                });
            }

            res.json({ status: 'ok' });
        } catch (err) { next(err); }
    }
}


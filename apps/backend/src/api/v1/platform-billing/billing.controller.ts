import { Request, Response, NextFunction } from 'express';
import { BillingService } from '@workspace/platform-billing';
import { prisma } from '@workspace/db';
import * as crypto from 'crypto';

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

            
            const [companyConfig, teamMembersCount, activeWebsitesCount, storageAgg] = await Promise.all([
                prisma.companyConfig.findUnique({ where: { companyId } }),
                prisma.user.count({ where: { companyId } }),
                prisma.website.count({ where: { companyId } }),
                prisma.document.aggregate({ where: { companyId }, _sum: { fileSize: true } })
            ]);

            const companyMetadata = (company?.metadata && typeof company.metadata === 'object') ? (company.metadata as any) : {};
            const rawEnabledApps = Array.isArray(companyMetadata.enabledApps) ? companyMetadata.enabledApps : [];
            const rawEnabledModules = Array.isArray(companyMetadata.enabledModules) ? companyMetadata.enabledModules : [];

            const isPaidPlan = Boolean(
                (plan && Number(plan.price) > 0) ||
                (currentSubscription && currentSubscription.status?.toUpperCase() === 'ACTIVE' && plan && Number(plan.price) > 0) ||
                (plan && (plan.planName?.toLowerCase().includes('limitless') || plan.planName?.toLowerCase().includes('momentum')))
            );

            const ALL_PLATFORM_APPS = [
                'system', 'settings', 'projects', 'communications', 'workspace-tools',
                'crm', 'hr', 'finance', 'insights', 'analytics', 'advertising',
                'social-media', 'traffic-director', 'voiceforce', 'media-editor', 'ai', 'storage', 'database', 'google-integrations'
            ];

            const effectiveEnabledApps = isPaidPlan
                ? Array.from(new Set([...rawEnabledApps, ...ALL_PLATFORM_APPS]))
                : rawEnabledApps;

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

            // Convert to minor units (e.g., paise/cents)
            const amount = Math.round(finalPrice * 100);

            const Razorpay = require('razorpay');
            const rzp = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });

            // Razorpay Subscriptions ONLY support INR for this account.
            // We must convert the subTotal to INR for the gateway base price.
            const inrRate = cachedRates?.['INR'] || 83; // fallback to 83 if fetch failed
            const inrSubTotal = (subTotal / rate) * inrRate; 
            const rzpBaseAmount = Math.max(100, Math.round(inrSubTotal * 100)); // Standard plan amount
            
            // Convert finalPrice to INR for the upfront/discounted amount
            const inrFinalPrice = (finalPrice / rate) * inrRate;
            const rzpUpfrontAmount = Math.max(100, Math.round(inrFinalPrice * 100)); // Discounted amount for 1st month

            const dynamicPlan = await rzp.plans.create({
                period: "monthly",
                interval: 1,
                item: {
                    name: `Sub`,
                    amount: rzpBaseAmount,
                    currency: 'INR'
                }
            });

            const subscriptionPayload: any = {
                plan_id: dynamicPlan.id,
                total_count: 12, // 1 year of monthly billing (renews 12 times)
                quantity: 1,
                customer_notify: 1
            };

            // If a discount was applied (and finalPrice > 0 since we handled 0 earlier), 
            // delay the regular billing cycle by 1 month and charge the discounted rate upfront.
            if (discountAmount > 0) {
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                subscriptionPayload.start_at = Math.floor(nextMonth.getTime() / 1000);
                
                subscriptionPayload.addons = [
                    {
                        item: {
                            name: "First Month Rate (Discount Applied)",
                            amount: rzpUpfrontAmount,
                            currency: "INR"
                        }
                    }
                ];
            }

            const subscription = await rzp.subscriptions.create(subscriptionPayload);

            res.json({ keyId: process.env.RAZORPAY_KEY_ID, subscriptionId: subscription.id, amount: discountAmount > 0 ? rzpUpfrontAmount : rzpBaseAmount, currency: 'INR', providerName: 'razorpay' });
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
                            amount: targetPlan.price,
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

            // Send email to user regarding successful activation
            const currentUser = (req as any).user;
            if (currentUser && currentUser.email) {
                const EmailManagementService = require('@workspace/communications').EmailManagementService;
                if (EmailManagementService) {
                    await EmailManagementService.sendCustomEmail(
                        currentUser.id, 
                        currentUser.email, 
                        `180workspace - ${targetPlan.planName} Activated`, 
                        `<h2>Subscription Activated</h2><p>Hi ${currentUser.name},</p><p>Your subscription to <strong>${targetPlan.planName}</strong> has been successfully activated.</p><p>Thank you for choosing 180workspace!</p>`
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

            // Cancel Razorpay Subscription if provider ID exists
            if (currentSub.providerSubscriptionId) {
                try {
                    const Razorpay = require('razorpay');
                    const rzp = new Razorpay({
                        key_id: process.env.RAZORPAY_KEY_ID,
                        key_secret: process.env.RAZORPAY_KEY_SECRET,
                    });
                    
                    // cancel_at_cycle_end=0 means cancel immediately
                    await rzp.subscriptions.cancel(currentSub.providerSubscriptionId, false);
                } catch (rzpErr) {
                    console.error('Failed to cancel Razorpay subscription:', rzpErr);
                    // We continue even if razorpay fails, because they might have already cancelled it there
                }
            }

            // Update Database: Mark subscription as cancelled
            await prisma.subscription.update({
                where: { id: currentSub.id },
                data: { status: 'CANCELLED', cancelledAt: new Date() }
            });

            // Re-sync limits/config based on the free plan (Kickstart)
            await BillingService.syncWorkspaceConfig(companyId);

            res.json({ success: true, message: 'Subscription cancelled successfully. You are now on the free Kickstart plan.' });
        } catch (err) { next(err); }
    }

}


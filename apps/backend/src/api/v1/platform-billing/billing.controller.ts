import { Request, Response, NextFunction } from 'express';
import { BillingService } from '@workspace/platform-billing';
import { prisma } from '@workspace/db';
import crypto from 'crypto';

export class BillingController {
    private static async getCurrencyInfo(req: Request): Promise<{ currency: string, rate: number, country: string }> {
        let country = 'US';
        let targetCurrency = (req.query.currency as string) || '';
        
        try {
            const cfCountry = req.headers['cf-ipcountry'];
            if (cfCountry) {
                country = cfCountry as string;
            } else {
                const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                if (ip && typeof ip === 'string' && ip !== '::1' && ip !== '127.0.0.1') {
                    const actualIp = ip.split(',')[0].trim();
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 1500);
                    const response = await fetch(`http://ip-api.com/json/${actualIp}?fields=countryCode,currency`, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.countryCode) {
                            country = data.countryCode;
                        }
                        if (data && data.currency && !targetCurrency) {
                            targetCurrency = data.currency;
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore error
        }
        
        targetCurrency = targetCurrency || (country === 'IN' ? 'INR' : 'USD');
        
        let rate = 1;
        if (targetCurrency !== 'USD') {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const response = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.rates && data.rates[targetCurrency]) {
                        rate = data.rates[targetCurrency];
                    }
                }
            } catch (e) {
                // Fallback to static rate if API fails
                if (targetCurrency === 'INR') rate = 83;
                if (targetCurrency === 'NPR') rate = 133;
                if (targetCurrency === 'EUR') rate = 0.9;
                if (targetCurrency === 'GBP') rate = 0.75;
            }
        }

        return { currency: targetCurrency, rate, country };
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
            const activeAppsCount = await prisma.project.count({ where: { companyId } });
            
            const isExpired = !currentSubscription || currentSubscription.status !== 'ACTIVE';

            res.json({
                currentSubscription: currentSubscription 
                    ? { ...currentSubscription, plan: plan || null }
                    : { 
                        status: 'active', 
                        billingCycle: 'Monthly',
                        plan: plan || null,
                        createdAt: company?.createdAt 
                      },
                plan: plan || null,
                companyConfig: companyConfig || null,
                teamMembersCount,
                activeAppsCount,
                isExpired,
                status: currentSubscription?.status || 'expired',
                daysLeft: currentSubscription?.currentPeriodEnd 
                    ? Math.max(0, Math.ceil((new Date(currentSubscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                    : 0,
                paymentsEnabled: true
            });
        } catch (err) { next(err); }
    }

    static async getPlans(req: Request, res: Response, next: NextFunction) {
        try {
            const { currency, rate, country } = await BillingController.getCurrencyInfo(req);
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
            const { planId, couponCode } = req.body;
            
            if (!planId) return res.status(400).json({ error: 'Plan ID required' });

            const targetPlan = await prisma.plan.findUnique({ where: { id: planId } });
            if (!targetPlan) return res.status(404).json({ error: 'Plan not found' });

            const company = await prisma.company.findUnique({ where: { id: companyId } });
            
            const { currency, rate } = await BillingController.getCurrencyInfo(req);
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
            let finalPrice = discountedTotal + taxAmount;

            // Enforce minimum 1 base unit of currency (e.g., 1 INR or 1 USD) for e-mandate setup
            if (finalPrice <= 0) {
                finalPrice = 1;
            }

            // Convert to minor units (e.g., paise/cents)
            const amount = Math.round(finalPrice * 100);

            const Razorpay = require('razorpay');
            const rzp = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });

            const order = await rzp.orders.create({
                amount,
                currency: currency || 'USD',
                receipt: `plan_${companyId}_${Date.now()}`,
                notes: { companyId, planId, couponCode: couponCode || '', action: 'plan_upgrade_downgrade' }
            });

            res.json({ keyId: process.env.RAZORPAY_KEY_ID, orderId: order.id, amount, currency: currency || 'USD', providerName: 'razorpay' });
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
            const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId, couponCode } = req.body;

            const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
            hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
            const expectedSignature = hmac.digest('hex');

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ error: 'Invalid signature' });
            }

            const targetPlan = await prisma.plan.findUnique({ where: { id: planId } });
            if (!targetPlan) return res.status(404).json({ error: 'Plan not found' });

            // Successfully paid, now update the subscription
            // Get current active sub
            const currentSub = await prisma.subscription.findFirst({
                where: { companyId, status: 'ACTIVE' }
            });

            if (currentSub) {
                await prisma.subscription.update({
                    where: { id: currentSub.id },
                    data: { status: 'CANCELLED', cancelledAt: new Date() }
                });
            }

            // Create new sub
            await prisma.subscription.create({
                data: {
                    companyId,
                    planId,
                    status: 'ACTIVE',
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
                }
            });

            if (couponCode) {
                await prisma.coupon.update({
                    where: { couponCode: couponCode.toUpperCase() },
                    data: { usedCount: { increment: 1 } }
                });
            }

            res.json({ success: true, message: `Successfully switched to ${targetPlan.planName}.` });
        } catch (err) { next(err); }
    }
}


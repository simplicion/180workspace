import { Request, Response, NextFunction } from 'express';
import { BillingService } from '@workspace/platform-billing';
import { prisma } from '@workspace/db';
import crypto from 'crypto';

export class BillingController {
    static async getBillingInfo(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = (req as any).company?.id || (req as any).user?.companyId;
            if (!companyId) return res.status(400).json({ error: 'Company ID required' });

            const status = await BillingService.getSubscriptionStatus(companyId);
            res.json(status);
        } catch (err) { next(err); }
    }

    static async getPlans(req: Request, res: Response, next: NextFunction) {
        try {
            const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } });
            res.json({ plans });
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

    static async checkoutStorage(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = (req as any).company?.id || (req as any).user?.companyId;
            const { gigabytes } = req.body;
            
            if (!gigabytes || gigabytes < 1) {
                return res.status(400).json({ error: 'Invalid gigabytes amount' });
            }

            const amount = gigabytes * 50 * 100; // 50 INR per GB

            const Razorpay = require('razorpay');
            const rzp = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });

            const order = await rzp.orders.create({
                amount,
                currency: 'INR',
                receipt: `storage_${companyId}_${Date.now()}`,
                notes: { companyId, gigabytes }
            });

            res.json({ orderId: order.id, amount });
        } catch (err) { next(err); }
    }

    static async verifyStorage(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = (req as any).company?.id || (req as any).user?.companyId;
            const { razorpay_payment_id, razorpay_order_id, razorpay_signature, gigabytes } = req.body;

            const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
            hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
            const expectedSignature = hmac.digest('hex');

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ error: 'Invalid signature' });
            }

            const bytesToAdd = gigabytes * 1024 * 1024 * 1024;

            await prisma.companyConfig.update({
                where: { companyId },
                data: {
                    extraStoragePurchasedBytes: { increment: bytesToAdd }
                }
            });

            res.json({ success: true, message: `Added ${gigabytes}GB of storage.` });
        } catch (err) { next(err); }
    }

    static async checkoutPlan(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = (req as any).company?.id || (req as any).user?.companyId;
            const { planId } = req.body;
            
            if (!planId) return res.status(400).json({ error: 'Plan ID required' });

            const targetPlan = await prisma.plan.findUnique({ where: { id: planId } });
            if (!targetPlan) return res.status(404).json({ error: 'Plan not found' });

            const company = await prisma.company.findUnique({ where: { id: companyId } });
            
            // Check App limits
            let metadata: any = company?.metadata || {};
            if (typeof metadata === 'string') { try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; } }
            const activeAppsCount = metadata.enabledApps ? metadata.enabledApps.length : 0;

            if (activeAppsCount > targetPlan.maxApps) {
                return res.status(400).json({ 
                    error: `Limit Exceeded`,
                    details: `You have ${activeAppsCount} apps active. The ${targetPlan.planName} plan only allows up to ${targetPlan.maxApps} apps. Please remove some apps before downgrading.`
                });
            }

            // Check User limits
            const activeUsersCount = await prisma.user.count({ where: { companyId } });
            if (activeUsersCount > targetPlan.maxUsers) {
                return res.status(400).json({ 
                    error: `Limit Exceeded`,
                    details: `You have ${activeUsersCount} team members. The ${targetPlan.planName} plan only allows up to ${targetPlan.maxUsers} users. Please remove some team members before downgrading.`
                });
            }

            const amount = targetPlan.price * 100; // Assuming Razorpay needs it in cents/paise

            const Razorpay = require('razorpay');
            const rzp = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });

            const order = await rzp.orders.create({
                amount,
                currency: targetPlan.currency || 'USD',
                receipt: `plan_${companyId}_${Date.now()}`,
                notes: { companyId, planId, action: 'plan_upgrade_downgrade' }
            });

            res.json({ orderId: order.id, amount, currency: targetPlan.currency || 'USD' });
        } catch (err) { next(err); }
    }

    static async verifyPlan(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = (req as any).company?.id || (req as any).user?.companyId;
            const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId } = req.body;

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

            res.json({ success: true, message: `Successfully switched to ${targetPlan.planName}.` });
        } catch (err) { next(err); }
    }
}


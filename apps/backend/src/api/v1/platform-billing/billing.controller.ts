import { Request, Response, NextFunction } from 'express';
import { BillingService } from '@workspace/platform-billing';
import { prisma } from '@workspace/db';
import crypto from 'crypto';

export class BillingController {
    static async getBillingInfo(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = (req as any).company?.id || (req as any).user?.companyId;
            if (!companyId) return res.status(400).json({ error: 'Company ID required' });

            const currentSubscription = await BillingService.getActiveSubscription(companyId);
            const plan = currentSubscription?.planId 
                ? await prisma.plan.findUnique({ where: { id: currentSubscription.planId } }) 
                : null;
            
            const companyConfig = await prisma.companyConfig.findUnique({ where: { companyId } });
            
            const teamMembersCount = await prisma.user.count({ where: { companyId } });
            
            const isExpired = !currentSubscription || currentSubscription.status !== 'ACTIVE';

            res.json({
                currentSubscription: currentSubscription 
                    ? { ...currentSubscription, plan: plan || null }
                    : null,
                plan: plan || null,
                companyConfig: companyConfig || null,
                teamMembersCount,
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
            
            if (!gigabytes || gigabytes < 5 || gigabytes % 5 !== 0) {
                return res.status(400).json({ error: 'Invalid gigabytes amount, must be in multiples of 5' });
            }

            const amount = (gigabytes / 5) * 50 * 100; // 50 INR per 5GB

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

    static async checkoutTeamMembers(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = (req as any).company?.id || (req as any).user?.companyId;
            const { users } = req.body;
            
            if (!users || users < 1) {
                return res.status(400).json({ error: 'Invalid users amount' });
            }

            const amount = users * 2 * 100; // $2 USD per user

            const Razorpay = require('razorpay');
            const rzp = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });

            const order = await rzp.orders.create({
                amount,
                currency: 'USD',
                receipt: `team_${companyId}_${Date.now()}`,
                notes: { companyId, users }
            });

            res.json({ orderId: order.id, amount, currency: 'USD' });
        } catch (err) { next(err); }
    }

    static async verifyTeamMembers(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = (req as any).company?.id || (req as any).user?.companyId;
            const { razorpay_payment_id, razorpay_order_id, razorpay_signature, users } = req.body;

            const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
            hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
            const expectedSignature = hmac.digest('hex');

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ error: 'Invalid signature' });
            }

            await prisma.companyConfig.update({
                where: { companyId },
                data: {
                    extraTeamMembersPurchased: { increment: users }
                }
            });

            res.json({ success: true, message: `Added ${users} team members.` });
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
            
            // App and User limits are now enforced dynamically on the frontend and middleware,
            // so we don't block plan downgrades here. Users can downgrade and their excess apps/users will be disabled.

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


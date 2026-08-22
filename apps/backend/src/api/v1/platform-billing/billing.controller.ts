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
}

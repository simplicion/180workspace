import { PlatformSubscriptionRepository } from '../repositories/platform-subscription.repository';

export class PlatformSubscriptionService {
    static async list(page: number, limit: number, status: string) {
        const [subscriptions, total] = await PlatformSubscriptionRepository.list(page, limit, status);
        return { subscriptions, total };
    }

    static async cancel(id: string, reason: string) {
        try {
            return await PlatformSubscriptionRepository.cancel(id, reason);
        } catch (err: any) {
            if (err.code === 'P2025') throw new Error('Subscription not found');
            throw err;
        }
    }

    static async forceRenew(id: string) {
        const sub = await PlatformSubscriptionRepository.findById(id);
        if (!sub) throw new Error('Subscription not found');

        const renewal = new Date();
        renewal.setMonth(renewal.getMonth() + (sub.plan?.billingCycle === 'yearly' ? 12 : 1));

        return await PlatformSubscriptionRepository.update(id, {
            status: 'active',
            renewalDate: renewal,
            paymentStatus: 'paid',
        });
    }

    static async refund(id: string) {
        try {
            return await PlatformSubscriptionRepository.update(id, {
                paymentStatus: 'refunded',
                status: 'cancelled',
            });
        } catch (err: any) {
            if (err.code === 'P2025') throw new Error('Subscription not found');
            throw err;
        }
    }

    static async getHistoryByCompany(companyId: string) {
        return await PlatformSubscriptionRepository.getHistoryByCompany(companyId);
    }
}

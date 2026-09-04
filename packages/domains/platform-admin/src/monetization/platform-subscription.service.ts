import { PlatformSubscriptionRepository } from '../repositories/platform-subscription.repository';
import { prisma } from '@workspace/db';

export class PlatformSubscriptionService {
    static async list(page: number, limit: number, status: string) {
        const [subscriptions, total] = await PlatformSubscriptionRepository.list(page, limit, status);
        
        const companyIds = Array.from(new Set(subscriptions.map(s => s.companyId).filter(Boolean)));
        const companies = companyIds.length > 0 
            ? await prisma.company.findMany({
                where: { id: { in: companyIds } },
                select: { id: true, name: true, adminEmail: true }
              })
            : [];
            
        const companyMap = new Map(companies.map(c => [c.id, c.name]));

        const enriched = subscriptions.map(s => ({
            ...s,
            companyName: companyMap.get(s.companyId) || 'Unknown Organization',
            planName: s.plan?.planName || 'Custom Tier'
        }));

        return { subscriptions: enriched, total };
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

'use strict';

exports.list = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const where = {};
        if (status) where.status = status;

        const [subscriptions, total] = await Promise.all([
            req.prisma.subscription.findMany({
                where,
                include: {
                    plan: { select: { id: true, name: true, price: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            req.prisma.subscription.count({ where }),
        ]);
        res.json({ subscriptions, total });
    } catch (err) {
        console.error('[Subscription Controller] List failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
};

exports.cancel = async (req, res) => {
    try {
        const sub = await req.prisma.subscription.update({
            where: { id: req.params.id },
            data: {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelReason: req.body.reason || 'Cancelled by super admin',
            },
        });
        res.json({ message: 'Subscription cancelled', subscription: sub });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Subscription not found' });
        console.error('[Subscription Controller] Cancel failed:', err.message);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
};

exports.forceRenew = async (req, res) => {
    try {
        const sub = await req.prisma.subscription.findUnique({
            where: { id: req.params.id },
            include: { plan: true },
        });
        if (!sub) return res.status(404).json({ error: 'Subscription not found' });

        const renewal = new Date();
        renewal.setMonth(renewal.getMonth() + (sub.plan?.billingCycle === 'yearly' ? 12 : 1));

        const updated = await req.prisma.subscription.update({
            where: { id: req.params.id },
            data: {
                status: 'active',
                renewalDate: renewal,
                paymentStatus: 'paid',
            },
        });
        res.json({ message: 'Subscription renewed', subscription: updated });
    } catch (err) {
        console.error('[Subscription Controller] Force renew failed:', err.message);
        res.status(500).json({ error: 'Failed to renew subscription' });
    }
};

exports.refund = async (req, res) => {
    try {
        const sub = await req.prisma.subscription.update({
            where: { id: req.params.id },
            data: {
                paymentStatus: 'refunded',
                status: 'cancelled',
            },
        });
        res.json({ message: 'Subscription marked as refunded', subscription: sub });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Subscription not found' });
        console.error('[Subscription Controller] Refund failed:', err.message);
        res.status(500).json({ error: 'Failed to process refund' });
    }
};

exports.getHistoryByCompany = async (req, res) => {
    try {
        const subscriptions = await req.prisma.subscription.findMany({
            where: { companyId: req.params.id },
            include: {
                plan: { select: { id: true, name: true, price: true, currency: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ subscriptions });
    } catch (err) {
        console.error('[Subscription Controller] History failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch company subscription history' });
    }
};

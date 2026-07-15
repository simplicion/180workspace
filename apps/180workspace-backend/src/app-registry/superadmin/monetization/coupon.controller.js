'use strict';

exports.list = async (req, res) => {
    try {
        const coupons = await req.prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ coupons });
    } catch (err) {
        console.error('[Coupon Controller] list error:', err);
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
};

exports.create = async (req, res) => {
    try {
        const data = { 
            ...req.body, 
            couponCode: req.body.couponCode?.toUpperCase(), 
            createdBy: req.superAdmin.id 
        };
        const coupon = await req.prisma.coupon.create({ data });
        res.status(201).json({ coupon });
    } catch (err) {
        console.error('[Coupon Controller] create error:', err);
        if (err.code === 'P2002') return res.status(400).json({ error: 'Coupon code already exists' });
        res.status(500).json({ error: err.message || 'Failed to create coupon' });
    }
};

exports.update = async (req, res) => {
    try {
        const coupon = await req.prisma.coupon.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json({ coupon });
    } catch (err) {
        console.error('[Coupon Controller] update error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Coupon not found' });
        res.status(500).json({ error: 'Failed to update coupon' });
    }
};

exports.remove = async (req, res) => {
    try {
        await req.prisma.coupon.delete({ where: { id: req.params.id } });
        res.json({ message: 'Coupon deleted' });
    } catch (err) {
        console.error('[Coupon Controller] remove error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Coupon not found' });
        res.status(500).json({ error: 'Failed to delete coupon' });
    }
};

exports.toggle = async (req, res) => {
    try {
        const coupon = await req.prisma.coupon.findUnique({ where: { id: req.params.id } });
        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
        
        const updatedCoupon = await req.prisma.coupon.update({
            where: { id: req.params.id },
            data: { isActive: !coupon.isActive }
        });
        res.json({ coupon: updatedCoupon });
    } catch (err) {
        console.error('[Coupon Controller] toggle error:', err);
        res.status(500).json({ error: 'Failed to toggle coupon' });
    }
};

exports.validate = async (req, res) => {
    try {
        const { code } = req.params;
        const coupon = await req.prisma.coupon.findUnique({ 
            where: { couponCode: code.toUpperCase() } 
        });
        
        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
        
        // Emulate isValid logic
        let valid = true;
        let reason = '';
        
        if (!coupon.isActive) {
            valid = false;
            reason = 'Coupon is not active';
        } else if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
            valid = false;
            reason = 'Coupon has expired';
        } else if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            valid = false;
            reason = 'Coupon usage limit reached';
        }

        res.json({ valid, reason, coupon: valid ? coupon : undefined });
    } catch (err) {
        console.error('[Coupon Controller] validate error:', err);
        res.status(500).json({ error: 'Validation failed' });
    }
};

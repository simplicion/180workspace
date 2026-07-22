'use strict';

// GET all assets with filtering
exports.getAssets = async (req, res, next) => {
    try {
        if (!req.prisma) {
            return res.status(500).json({ error: 'Tenant database connection missing' });
        }
        const { type, status, search } = req.query;
        let query = {};

        if (req.user && req.user.companyId) {
            query.companyId = req.user.companyId;
        }

        if (type) query.type = type;
        if (status) query.status = status;
        if (search) {
            query.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { provider: { contains: search, mode: 'insensitive' } }
            ];
        }

        const assets = await req.prisma.asset.findMany({
            where: query,
            include: {
                owner: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ assets });
    } catch (err) { next(err); }
};

// GET asset stats for dashboard
exports.getAssetStats = async (req, res, next) => {
    try {
        if (!req.prisma) {
            return res.status(500).json({ error: 'Tenant database connection missing' });
        }

        // Prisma doesn't have an exact equivalent to $group sum, so we use groupBy
        const groupStats = await req.prisma.asset.groupBy({
            by: ['type'],
            where: req.user && req.user.companyId ? { companyId: req.user.companyId } : {},
            _count: { _all: true },
            _sum: { cost: true }
        });

        const stats = groupStats.map(g => ({
            _id: g.type,
            count: g._count._all,
            totalCost: g._sum.cost || 0
        }));

        const activeIntegrationsCount = await req.prisma.asset.count({
            where: {
                type: { in: ['api', 'service'] },
                status: 'active',
                ...(req.user && req.user.companyId ? { companyId: req.user.companyId } : {})
            }
        });

        res.json({ stats, activeIntegrationsCount });
    } catch (err) { next(err); }
};

// GET single asset
exports.getAssetById = async (req, res, next) => {
    try {
        const asset = await req.prisma.asset.findFirst({
            where: { 
                id: req.params.id,
                ...(req.user && req.user.companyId ? { companyId: req.user.companyId } : {})
            },
            include: { owner: { select: { name: true } } }
        });
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        res.json({ asset });
    } catch (err) { next(err); }
};

// CREATE asset
exports.createAsset = async (req, res, next) => {
    try {
        if (!req.prisma) {
            return res.status(500).json({ error: 'Tenant database connection missing' });
        }
        
        if (!req.body.name || !req.body.type) {
            return res.status(400).json({ error: 'Asset name and type are required' });
        }

        let parsedRenewalDate = undefined;
        if (req.body.renewalDate) {
            parsedRenewalDate = new Date(req.body.renewalDate).toISOString();
        } else if (req.body.renewalDate === null) {
            parsedRenewalDate = null;
        }

        const assetData = {
            ...req.body,
            createdById: req.user.id,
            ...(req.user && req.user.companyId ? { companyId: req.user.companyId } : {})
        };

        if (parsedRenewalDate !== undefined) {
            assetData.renewalDate = parsedRenewalDate;
        }

        const asset = await req.prisma.asset.create({
            data: assetData
        });
        
        res.status(201).json({ 
            success: true,
            message: 'Asset created successfully',
            asset 
        });
    } catch (err) { 
        console.error('[Asset Controller] Create Error:', err);
        
        if (err.code === 'P2002') { // Prisma Unique constraint failed
            return res.status(400).json({ 
                error: 'The data provided violates a unique constraint.', 
            });
        }
        
        res.status(500).json({ 
            error: 'An unexpected error occurred while creating the asset. Please try again later.' 
        });
    }
};

// UPDATE asset
exports.updateAsset = async (req, res, next) => {
    try {
        let parsedRenewalDate = undefined;
        if (req.body.renewalDate) {
            parsedRenewalDate = new Date(req.body.renewalDate).toISOString();
        } else if (req.body.renewalDate === null) {
            parsedRenewalDate = null;
        }

        const updateData = { ...req.body, updatedAt: new Date() };
        if (parsedRenewalDate !== undefined) {
            updateData.renewalDate = parsedRenewalDate;
        }

        const assetInfo = await req.prisma.asset.updateMany({
            where: { 
                id: req.params.id,
                ...(req.user && req.user.companyId ? { companyId: req.user.companyId } : {})
            },
            data: updateData
        });
        if (assetInfo.count === 0) return res.status(404).json({ error: 'Asset not found' });
        
        const asset = await req.prisma.asset.findFirst({ where: { id: req.params.id } });
        res.json({ asset });
    } catch (err) { 
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Asset not found' });
        }
        next(err); 
    }
};

// DELETE asset
exports.deleteAsset = async (req, res, next) => {
    try {
        const asset = await req.prisma.asset.deleteMany({
            where: { 
                id: req.params.id,
                ...(req.user && req.user.companyId ? { companyId: req.user.companyId } : {})
            }
        });
        if (asset.count === 0) return res.status(404).json({ error: 'Asset not found' });
        res.json({ success: true, message: 'Asset deleted successfully' });
    } catch (err) { 
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Asset not found' });
        }
        next(err); 
    }
};

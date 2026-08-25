import { prisma } from '@workspace/db';
export class AssetService {
    static async getAssets(filter: any = {}) {
        let query: any = { ...filter };

        const assets = await prisma.asset.findMany({
            where: query,
            include: {
                owner: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return assets;
    }

    static async getAssetStats() {
        const groupStats = await prisma.asset.groupBy({
            by: ['type'],
            where: {},
            _count: { _all: true },
            _sum: { cost: true }
        });

        const stats = groupStats.map((g: any) => ({
            _id: g.type,
            count: g._count._all,
            totalCost: g._sum.cost || 0
        }));

        const activeIntegrationsCount = await prisma.asset.count({
            where: {
                type: { in: ['api', 'service'] },
                status: 'active'
            }
        });

        return { stats, activeIntegrationsCount };
    }

    static async getAssetById(id: string) {
        return prisma.asset.findFirst({
            where: { 
                id
            },
            include: { owner: { select: { name: true } } }
        });
    }

    static async createAsset(data: any) {
        if (!data.name || !data.type) {
            throw new Error('Asset name and type are required');
        }

        let parsedRenewalDate = undefined;
        if (data.renewalDate) {
            parsedRenewalDate = new Date(data.renewalDate).toISOString();
        } else if (data.renewalDate === null) {
            parsedRenewalDate = null;
        }

        const assetData = {
            ...data
        };

        if (parsedRenewalDate !== undefined) {
            assetData.renewalDate = parsedRenewalDate;
        }

        return prisma.asset.create({
            data: assetData
        });
    }

    static async updateAsset(id: string, data: any) {
        let parsedRenewalDate = undefined;
        if (data.renewalDate) {
            parsedRenewalDate = new Date(data.renewalDate).toISOString();
        } else if (data.renewalDate === null) {
            parsedRenewalDate = null;
        }

        const updateData = { ...data, updatedAt: new Date() };
        if (parsedRenewalDate !== undefined) {
            updateData.renewalDate = parsedRenewalDate;
        }

        const assetInfo = await prisma.asset.updateMany({
            where: { 
                id
            },
            data: updateData
        });

        if (assetInfo.count === 0) throw new Error('Asset not found');
        
        return prisma.asset.findFirst({ where: { id } });
    }

    static async deleteAsset(id: string) {
        const asset = await prisma.asset.deleteMany({
            where: { 
                id
            }
        });
        if (asset.count === 0) throw new Error('Asset not found');
        return { success: true };
    }
}

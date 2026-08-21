import { Request, Response } from 'express';
import { AssetService } from '@workspace/workspace-tools';

export const getAssets = async (req: Request | any, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        const assets = await AssetService.getAssets(companyId, req.query);
        res.json({ assets });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAssetStats = async (req: Request | any, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        const stats = await AssetService.getAssetStats(companyId);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAssetById = async (req: Request | any, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        const asset = await AssetService.getAssetById(req.params.id, companyId);
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        res.json(asset);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createAsset = async (req: Request | any, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        const data = {
            ...req.body,
            companyId,
            createdById: req.user?.id
        };
        const asset = await AssetService.createAsset(data);
        res.status(201).json(asset);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const updateAsset = async (req: Request | any, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        const asset = await AssetService.updateAsset(req.params.id, companyId, req.body);
        res.json(asset);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const deleteAsset = async (req: Request | any, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        await AssetService.deleteAsset(req.params.id, companyId);
        res.json({ message: 'Asset deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

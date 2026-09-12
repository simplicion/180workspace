import { Request, Response, NextFunction } from 'express';
import { AssetService } from '@workspace/workspace-tools';

export const getAssets = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).companyId || (req as any).user?.companyId || (req.query?.companyId as string);
        const assets = await AssetService.getAssets({ ...req.query, companyId });
        res.json({ assets });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAssetStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).companyId || (req as any).user?.companyId || (req.query?.companyId as string);
        const stats = await AssetService.getAssetStats(companyId);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAssetById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const asset = await AssetService.getAssetById(req.params.id);
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        res.json(asset);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createAsset = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const asset = await AssetService.createAsset(req.body);
        res.status(201).json(asset);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const updateAsset = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const asset = await AssetService.updateAsset(req.params.id, req.body);
        res.json(asset);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const deleteAsset = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await AssetService.deleteAsset(req.params.id);
        res.json({ message: 'Asset deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

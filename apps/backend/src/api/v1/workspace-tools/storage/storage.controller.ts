import { Request, Response, NextFunction } from 'express';
import { StorageService } from '@workspace/workspace-tools';
import { R2Service } from '@workspace/integrations';
export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const companyId = (req as any).user.companyId;

        let taggedUsers: any[] = [];
        try {
            if (req.body.taggedUsers) {
                taggedUsers = typeof req.body.taggedUsers === 'string' ? JSON.parse(req.body.taggedUsers) : req.body.taggedUsers;
            }
        } catch (e) {
            console.error('Error parsing taggedUsers in uploadFile:', e);
        }

        const { name, relatedId, relatedModel, description, tags, isConfidential, folder } = req.body;

        let tagList: any[] = [];
        try {
            if (tags) {
                tagList = typeof tags === 'string' ? JSON.parse(tags) : tags;
            }
        } catch (e) {
            console.error('Error parsing tags in uploadFile:', e);
        }

        const result = await StorageService.uploadFile({
            userId,
            companyId,
            file: req.file,
            storageResult: (req as any).storageResult,
            taggedUsers,
            name,
            relatedId,
            relatedModel,
            description,
            tags: tagList,
            isConfidential,
            folder
        });

        res.status(201).json(result);
    } catch (err) { next(err); }
};

export const addFileLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const companyId = (req as any).user.companyId;
        const { name, fileUrl, folder, relatedId, relatedModel, description, tags, isConfidential, category } = req.body;
        if (!fileUrl) return res.status(400).json({ error: 'File URL is required' });

        const doc = await StorageService.addFileLink({
            userId,
            companyId,
            name,
            fileUrl,
            folder,
            relatedId,
            relatedModel,
            description,
            tags,
            isConfidential,
            category
        });
        res.status(201).json({ document: doc });
    } catch (err) { next(err); }
};

export const getFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user.companyId;
        const { folder, relatedId, relatedModel, tags, search } = req.query;

        const files = await StorageService.getFiles({
            companyId,
            folder,
            relatedId,
            relatedModel,
            tags,
            search,
            authUser: (req as any).user
        });
        res.json({ files });
    } catch (err) { next(err); }
};

export const deleteFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await StorageService.deleteFile({
            id: req.params.id,
            companyId: (req as any).user.companyId
        });
        res.json(result);
    } catch (err) { next(err); }
};

export const signFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const doc = await StorageService.signFile({
            id: req.params.id,
            userId: (req as any).user.id,
            userName: (req as any).user.name
        });
        res.json({ message: 'Document signed successfully', document: doc });
    } catch (err) { next(err); }
};

export const attachExistingFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { documentId, relatedId, relatedModel } = req.body;
        if (!documentId || !relatedId || !relatedModel) {
            return res.status(400).json({ error: 'Missing required fields: documentId, relatedId, relatedModel' });
        }

        const newDoc = await StorageService.attachExistingFile({
            userId: (req as any).user.id,
            companyId: (req as any).user.companyId,
            documentId,
            relatedId,
            relatedModel
        });
        res.status(201).json({ success: true, document: newDoc });
    } catch (err) { next(err); }
};

export const getPresignedUrl = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { key, contentType } = req.query;
        if (!key || !contentType) {
            return res.status(400).json({ error: 'Missing key or contentType' });
        }
        const url = await R2Service.getPresignedUploadUrl(key as string, contentType as string);
        const publicUrl = `${process.env.REELS_CDN_URL || 'https://pub-fe44d8a6e623474c9fa7a81b855fb631.r2.dev'}/${key}`;
        res.json({ url, key, publicUrl });
    } catch (err) {
        next(err);
    }
};

import { Request, Response, NextFunction } from 'express';
import { StorageService } from '@workspace/workspace-tools';
import { R2Service } from '@workspace/integrations';
export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;

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

        const { replaceUrl } = req.body;
        if (replaceUrl && typeof replaceUrl === 'string') {
            try {
                const { prisma } = require('@workspace/db');
                await prisma.document.updateMany({
                    where: { fileUrl: replaceUrl },
                    data: { deletedAt: new Date() }
                });
            } catch (e) {
                console.error('Error deleting replaced file:', e);
            }
        }

        const result = await StorageService.uploadFile({
            userId,
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

        const companyId = (req as any).user?.companyId;
        if (result?.document && companyId) {
            setImmediate(async () => {
                try {
                    const { centralRagIndexer } = await import('@workspace/rag');
                    await centralRagIndexer.indexUploadedFile({
                        id: result.document.id,
                        companyId,
                        name: result.document.name,
                        fileUrl: result.document.fileUrl,
                        fileType: result.document.fileType,
                        buffer: req.file?.buffer,
                        textContent: req.body?.textContent || result.document.description,
                        category: result.document.category || 'Storage'
                    });
                } catch (e: any) {
                    console.warn('[CentralRagIndexer] File upload indexing warning:', e.message);
                }
            });
        }

        res.status(201).json({
            ...result
        });
    } catch (err) { next(err); }
};

export const addFileLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const { name, fileUrl, folder, relatedId, relatedModel, description, tags, isConfidential, category } = req.body;
        if (!fileUrl) return res.status(400).json({ error: 'File URL is required' });

        const doc = await StorageService.addFileLink({
            userId,
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
        const { folder, relatedId, relatedModel, tags, search } = req.query;

        const files = await StorageService.getFiles({
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
            id: req.params.id
        });
        setImmediate(async () => {
            try {
                const { centralRagIndexer } = await import('@workspace/rag');
                await centralRagIndexer.removeDocumentChunks(req.params.id);
            } catch (err: any) {
                console.warn('[CentralRagIndexer] File deletion chunk cleanup warning:', err.message);
            }
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

export const getStorageStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { prisma } = require('@workspace/db');
        const companyId = (req as any).user?.companyId;
        const docWhere: any = { deletedAt: null };
        const articleWhere: any = {};
        if (companyId) {
            docWhere.companyId = companyId;
            articleWhere.companyId = companyId;
        }

        const agg = await prisma.document.aggregate({
            where: docWhere,
            _sum: { fileSize: true },
            _count: { id: true }
        });
        const articlesCount = prisma.knowledgeArticle ? await prisma.knowledgeArticle.count({ where: articleWhere }) : 0;
        const usedBytes = Number(agg._sum.fileSize || 0) + (articlesCount * 24 * 1024); // ~24KB per AST doc
        const totalQuotaBytes = 10 * 1024 * 1024 * 1024; // 10 GB
        res.json({
            usedBytes,
            totalQuotaBytes,
            totalFiles: (agg._count.id || 0) + articlesCount,
            usagePercent: Math.min(100, Number(((usedBytes / totalQuotaBytes) * 100).toFixed(2))),
            storageProvider: 'Cloudflare R2 & Edge Vault'
        });
    } catch (err) {
        next(err);
    }
};


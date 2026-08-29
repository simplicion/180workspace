import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '@workspace/workspace-tools';

export const getAllDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search, category } = req.query;
        const documents = await DocumentService.getAllDocuments(search as string, category as string);
        res.json({ success: true, documents });
    } catch (error) {
  next(error);
}
};

export const getDocumentsList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search, category } = req.query;

        const documents = await DocumentService.getDocumentsList(search as string, category as string);
        res.json({ success: true, article: documents, documents }); 
    } catch (error) {
  next(error);
}
};

export const getDocumentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const document = await DocumentService.getDocumentById(id);

        if (!document) return res.status(404).json({ success: false, message: "Document not found" });

        res.json({ success: true, article: document, document }); 
    } catch (error) {
  next(error);
}
};

export const createDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id;
        const data = req.body;

        const document = await DocumentService.createDocument(userId, data);

        res.json({ success: true, article: document, document });
    } catch (error) {
  next(error);
}
};

export const updateDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id;
        const { id } = req.params;
        const data = req.body;

        const document = await DocumentService.updateDocument(userId, id, data);

        res.json({ success: true, article: document, document });
    } catch (error: any) {
  next(error);
}
};

export const lockDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id;
        const { id } = req.params;

        const result = await DocumentService.lockDocument(userId, id);
        res.json({ success: true, message: result.message });
    } catch (error: any) {
  next(error);
}
};

export const unlockDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id;
        const { id } = req.params;

        const result = await DocumentService.unlockDocument(userId, id);
        res.json({ success: true, message: result.message });
    } catch (error: any) {
  next(error);
}
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const result = await DocumentService.deleteDocument(id);
        res.json({ success: true, message: result.message });
    } catch (error: any) {
  next(error);
}
};

export const createLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { relatedModel, relatedId } = req.body;

        const link = await DocumentService.createLink(id, relatedModel, relatedId);
        res.json({ success: true, link });
    } catch (error: any) {
  next(error);
}
};

export const getLinksForEntity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { relatedModel, relatedId } = req.query;

        const links = await DocumentService.getLinksForEntity(relatedModel as string, relatedId as string);
        res.json({ success: true, links });
    } catch (error) {
  next(error);
}
};

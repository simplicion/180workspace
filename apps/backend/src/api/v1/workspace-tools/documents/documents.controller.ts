import { Request, Response, NextFunction } from 'express';
import { DocumentService, DocumentApprovalService, AIDocumentService } from '@workspace/workspace-tools';

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
        const documents = await (DocumentService as any).getDocumentsList(search as string, category as string);
        res.json({ success: true, article: documents, documents }); 
    } catch (error) {
        next(error);
    }
};

export const getDocumentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const document = await DocumentService.getDocumentById(id as string);

        if (!document) return res.status(404).json({ success: false, message: "Document not found" });

        res.json({ success: true, article: document, document }); 
    } catch (error) {
        next(error);
    }
};

async function triggerLakehouseAutoIndex(document: any, companyId: string) {
    if (!document || !companyId) return;
    const docId = document.id || document._id;
    if (!docId) return;

    setImmediate(async () => {
        try {
            const { centralRagIndexer } = await import('@workspace/rag');
            await centralRagIndexer.indexDocument({
                id: docId,
                companyId,
                title: document.title || document.name || 'Workspace Document',
                content: document.content || document.body || document.blocks,
                category: document.category || document.documentType || 'General'
            });
        } catch (err: any) {
            console.warn('[LakehouseAutoIndexer] Central RAG auto-indexing warning:', err.message);
        }
    });
}

export const createDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        const companyId = (req as any).user?.companyId;
        const data = req.body;

        const document = await DocumentService.createDocument(userId, data);
        if (companyId) {
            triggerLakehouseAutoIndex(document, companyId);
        }
        res.json({ success: true, article: document, document, data: document });
    } catch (error: any) {
        require('fs').appendFileSync('document_debug.log', new Date().toISOString() + ' ERROR: ' + error.stack + '\n');
        next(error);
    }
};

export const updateDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        const companyId = (req as any).user?.companyId;
        const { id } = req.params;
        const data = req.body;

        const document = await DocumentService.updateDocument(userId, id as string, data);
        if (companyId) {
            triggerLakehouseAutoIndex(document, companyId);
        }
        res.json({ success: true, article: document, document, data: document });
    } catch (error: any) {
        require('fs').appendFileSync('document_debug.log', new Date().toISOString() + ' ERROR: ' + error.stack + '\n');
        next(error);
    }
};

export const generateShareLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const shareToken = await DocumentService.generateShareLink(id as string);
        res.json({ success: true, shareToken, shareUrl: `/f/document/${shareToken}` });
    } catch (error) {
        next(error);
    }
};

export const dispatchDocumentShare = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        const { id } = req.params;
        const result = await DocumentService.dispatchDocumentShares(id as string, userId, req.body);
        res.json(result);
    } catch (error: any) {
        next(error);
    }
};

export const getDocumentByToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.params;
        const userContext = (req as any).user ? {
            userId: (req as any).user.id || (req as any).user._id,
            email: (req as any).user.email
        } : (req.query.email ? { email: String(req.query.email) } : undefined);

        const document = await DocumentService.getDocumentByToken(token as string, userContext);
        if (!document) {
            return res.status(404).json({ success: false, message: "Document not found" });
        }
        res.json({ success: true, document });
    } catch (error) {
        next(error);
    }
};

export const signDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.params;
        const result = await DocumentService.signDocumentByToken(
            token as string,
            req.body,
            req.ip,
            req.headers['user-agent'] as string
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const approveDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        const { id } = req.params;
        const result = await DocumentApprovalService.approveDocument(id as string, userId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const convertToInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        const { id } = req.params;
        const result = await DocumentApprovalService.convertToInvoice(id as string, userId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const lockDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id;
        const { id } = req.params;

        const result = await (DocumentService as any).lockDocument(userId, id as string);
        res.json({ success: true, message: (result as any)?.message || 'Locked' });
    } catch (error: any) {
        next(error);
    }
};

export const unlockDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id;
        const { id } = req.params;

        const result = await (DocumentService as any).unlockDocument(userId, id as string);
        res.json({ success: true, message: (result as any)?.message || 'Unlocked' });
    } catch (error: any) {
        next(error);
    }
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const result = await DocumentService.deleteDocument(id as string);
        
        setImmediate(async () => {
            try {
                const { centralRagIndexer } = await import('@workspace/rag');
                await centralRagIndexer.removeDocumentChunks(id as string);
            } catch (err: any) {
                console.warn('[CentralRagIndexer] Error removing chunks for deleted document:', err.message);
            }
        });

        res.json({ success: true, message: (result as any)?.message || 'Deleted' });
    } catch (error: any) {
        next(error);
    }
};

export const createLink = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { relatedModel, relatedId } = req.body;

        const link = await (DocumentService as any).createLink(id as string, relatedModel, relatedId);
        res.json({ success: true, link });
    } catch (error: any) {
        next(error);
    }
};

export const recordPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        const { id } = req.params;
        const result = await DocumentApprovalService.recordPayment(id as string, req.body, userId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const sendPaymentReminder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        const { id } = req.params;
        const result = await DocumentApprovalService.sendPaymentReminder(id as string, userId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getLinksForEntity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { relatedModel, relatedId } = req.query;
        const links = await (DocumentService as any).getLinksForEntity(relatedModel as string, relatedId as string);
        res.json({ success: true, links });
    } catch (error) {
        next(error);
    }
};

export const recordDecision = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        const { id } = req.params;
        const result = await DocumentService.recordDecision(id as string, req.body, userId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const recordDecisionByToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.params;
        const ip = req.ip || req.headers['x-forwarded-for'] as string;
        const userAgent = req.headers['user-agent'] as string;
        const result = await DocumentService.recordDecisionByToken(token as string, req.body, ip, userAgent);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const generateDocumentAI = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?._id;
        const companyId = (req as any).user?.companyId;
        const { prompt, documentType, clientId, employeeId, existingBlocks, mode } = req.body;

        const result = await AIDocumentService.generateFromPrompt({
            prompt,
            documentType,
            clientId,
            employeeId,
            companyId,
            userId,
            existingBlocks,
            mode
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getAIConfigStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as any).user?.companyId;
        const status = await AIDocumentService.getAIStatus(companyId);
        res.json(status);
    } catch (error) {
        next(error);
    }
};



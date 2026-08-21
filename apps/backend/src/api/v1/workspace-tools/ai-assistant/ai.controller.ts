import { Request, Response, NextFunction } from 'express';
import { redis } from '@workspace/backend-common';
// Using backend-common for redis if needed, but the original code had it in system-configs. We will use the common redis client.
import { aiAssistantService } from '@workspace/workspace-tools';

export const getDashboardInsights = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const insight = await aiAssistantService.getDashboardInsights((req as any).user, redis);
        res.json({ insight });
    } catch (err) { next(err); }
};

export const getProjectInsights = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const insight = await aiAssistantService.getProjectInsights((req as any).user, req.params.id, redis);
        res.json({ insight });
    } catch (err: any) {
        if (err.message === 'Project not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const getChatSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sessions = await aiAssistantService.getChatSessions((req as any).user.id);
        res.json({ sessions });
    } catch (err) { next(err); }
};

export const getChatSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const session = await aiAssistantService.getChatSession((req as any).user.id, req.params.id);
        res.json({ session });
    } catch (err: any) {
        if (err.message === 'Session not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const deleteChatSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await aiAssistantService.deleteChatSession((req as any).user.id, req.params.id);
        res.json(result);
    } catch (err: any) {
        if (err.message === 'Session not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const chatWithAI = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.body.stream === true) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const result = await aiAssistantService.chatWithAI((req as any).user, {
                message: req.body.message,
                history: req.body.history,
                sessionId: req.body.sessionId,
                isLegalMode: req.body.isLegalMode,
                fileContext: req.body.fileContext,
                stream: true
            }, (chunk: any) => {
                res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
            });

            if (result && result.sessionId) {
                res.write(`data: ${JSON.stringify({ sessionId: result.sessionId })}\n\n`);
            }
            res.write(`data: [DONE]\n\n`);
            return res.end();
        }

        const result = await aiAssistantService.chatWithAI((req as any).user, {
            message: req.body.message,
            history: req.body.history,
            sessionId: req.body.sessionId,
            isLegalMode: req.body.isLegalMode,
            fileContext: req.body.fileContext,
            stream: false
        });

        res.json(result);
    } catch (err) { next(err); }
};

export const analyzeDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const serverPort = process.env.PORT || 4000;
        const reply = await aiAssistantService.analyzeDocumentText(
            (req as any).user,
            req.body.documentId,
            req.body.message,
            req.body.summarizeOnly,
            req.body.history,
            serverPort
        );
        res.json({ reply });
    } catch (err: any) {
        if (err.message === 'Document not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const generateEmailDraft = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const draft = await aiAssistantService.generateEmailDraft((req as any).user, req.body);
        res.json({ draft });
    } catch (err) { next(err); }
};

export const processMeetingTranscript = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await aiAssistantService.processMeetingTranscript((req as any).user, req.file, req.body.text);
        res.json(result);
    } catch (err: any) {
        if (err.message === 'No transcript provided.') {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
};

export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await aiAssistantService.uploadDocument((req as any).user, req.file);
        res.json({ success: true, ...result });
    } catch (err: any) {
        if (err.message === 'No file uploaded') {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
};

export const searchEntities = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const results = await aiAssistantService.searchEntities((req as any).user, req.query.type as string, req.query.query as string);
        res.json({ results });
    } catch (err) { next(err); }
};

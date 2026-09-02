import { Request, Response, NextFunction } from 'express';
import { AIChatService } from '@workspace/ai';

export const getChatSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sessions = await AIChatService.getChatSessions((req as any).user.id);
        return res.json({ sessions });
    } catch (err) {
        next(err);
    }
};

export const getChatSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const session = await AIChatService.getChatSession((req as any).user.id, req.params.id);
        return res.json({ session });
    } catch (err: any) {
        if (err.message === 'Session not found') {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const deleteChatSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await AIChatService.deleteChatSession((req as any).user.id, req.params.id);
        return res.json(result);
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

            await AIChatService.chatWithAI((req as any).user, {
                message: req.body.message || req.body.prompt,
                history: req.body.history,
                sessionId: req.body.sessionId,
                isLegalMode: req.body.isLegalMode,
                fileContext: req.body.fileContext,
                stream: true
            }, (chunk: any) => {
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            });

            res.write(`data: [DONE]\n\n`);
            return res.end();
        }

        const result = await AIChatService.chatWithAI((req as any).user, {
            message: req.body.message || req.body.prompt,
            history: req.body.history,
            sessionId: req.body.sessionId,
            isLegalMode: req.body.isLegalMode,
            fileContext: req.body.fileContext,
            stream: false
        });

        return res.json(result);
    } catch (err) {
        next(err);
    }
};

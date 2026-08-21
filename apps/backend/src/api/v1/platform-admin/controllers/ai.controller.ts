import { Request, Response, NextFunction } from 'express';
// @ts-ignore
const { redis } = require('../../../../system-configs/config/redis.ts');
const { aiAssistantService } = require('@workspace/workspace-tools');

export const getChatSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sessions = await aiAssistantService.getChatSessions((req as any).user.id);
        return res.json({ sessions });
    } catch (err) {
        next(err);
    }
};

export const getChatSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const session = await aiAssistantService.getChatSession((req as any).user.id, req.params.id);
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
        const result = await aiAssistantService.deleteChatSession((req as any).user.id, req.params.id);
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
            
            await aiAssistantService.chatWithAI((req as any).user, { 
                message: req.body.message, 
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

        const result = await aiAssistantService.chatWithAI((req as any).user, { 
            message: req.body.message, 
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

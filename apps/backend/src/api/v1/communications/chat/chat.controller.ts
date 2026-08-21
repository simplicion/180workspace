import { Request, Response, NextFunction } from 'express';
import { ChatService } from '@workspace/communications';

export const getChats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chats = await ChatService.getChats((req as any).user);
        res.json({ chats });
    } catch (err) { next(err); }
};

export const createOrGetChat = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chat = await ChatService.createOrGetChat((req as any).user, req.body);
        res.status(201).json({ chat });
    } catch (err: any) { 
        if (err.message.includes('not found') || err.message.includes('disabled by admin') || err.message.includes('Only admins')) {
            return res.status(err.message.includes('not found') ? 404 : 403).json({ error: err.message });
        }
        next(err); 
    }
};

export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const messages = await ChatService.getMessages(req.params.chatId, req.query);
        res.json({ messages });
    } catch (err) { next(err); }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const message = await ChatService.sendMessage((req as any).user, req.params.chatId, req.body);
        res.status(201).json({ message });
    } catch (err) { next(err); }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ChatService.markAsRead((req as any).user, req.params.chatId);
        res.json(result);
    } catch (err) { next(err); }
};

export const reactToMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reactions = await ChatService.reactToMessage((req as any).user, req.body.messageId, req.body.emoji);
        res.json({ reactions });
    } catch (err: any) { 
        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        next(err); 
    }
};

export const deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ChatService.deleteMessage((req as any).user, req.params.msgId);
        res.json(result);
    } catch (err: any) { 
        if (err.message === 'Not found') return res.status(404).json({ error: err.message });
        if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
        next(err); 
    }
};

export const addMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chat = await ChatService.addMembers((req as any).user, req.params.chatId, req.body.memberIds);
        res.json({ chat });
    } catch (err: any) { 
        if (err.message.includes('not found')) return res.status(404).json({ error: err.message });
        if (err.message.includes('Only group admins')) return res.status(403).json({ error: err.message });
        next(err); 
    }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ChatService.removeMember((req as any).user, req.params.chatId, req.params.memberId);
        res.json(result);
    } catch (err: any) { 
        if (err.message.includes('not found')) return res.status(404).json({ error: err.message });
        if (err.message.includes('Only group admins')) return res.status(403).json({ error: err.message });
        next(err); 
    }
};

export const getChatSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await ChatService.getChatSettings((req as any).user);
        res.json(settings);
    } catch (err) { next(err); }
};

export const updateChatSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await ChatService.updateChatSettings((req as any).user, req.body.employeeClientChatAllowed);
        res.json(settings);
    } catch (err: any) { 
        if (err.message === 'Admin only') return res.status(403).json({ error: err.message });
        next(err); 
    }
};

export const pinMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pinnedMessages = await ChatService.pinMessage(req.params.chatId, req.body.messageId);
        res.json({ pinnedMessages });
    } catch (err: any) { 
        if (err.message === 'Chat not found') return res.status(404).json({ error: err.message });
        next(err); 
    }
};

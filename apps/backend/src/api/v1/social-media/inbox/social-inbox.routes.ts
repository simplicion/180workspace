import { Router, Request, Response } from 'express';
import { SocialInboxService } from '@workspace/social-media';

const router = Router();

// List conversations
router.get('/conversations', async (req: Request, res: Response) => {
    try {
        const { projectId, platform, isRead, search } = req.query;
        const conversations = await SocialInboxService.listConversations({
            projectId: projectId as string,
            platform: platform as string,
            isRead: isRead !== undefined ? isRead === 'true' : undefined,
            search: search as string
        });
        res.json({ success: true, conversations });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get conversation details & messages
router.get('/conversations/:id', async (req: Request, res: Response) => {
    try {
        const conversation = await SocialInboxService.getConversation(req.params.id);
        res.json({ success: true, conversation });
    } catch (error: any) {
        res.status(404).json({ success: false, error: error.message });
    }
});

// Send message / reply
router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
        const { content, senderType } = req.body;
        const message = await SocialInboxService.sendMessage(req.params.id, content, senderType);
        res.status(201).json({ success: true, message });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Generate AI Smart Replies based on Brand Voice
router.get('/conversations/:id/ai-suggestions', async (req: Request, res: Response) => {
    try {
        const suggestions = await SocialInboxService.generateAiSmartReplies(req.params.id);
        res.json({ success: true, ...suggestions });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// 1-Click "Convert to CRM Lead"
router.post('/conversations/:id/convert-to-lead', async (req: Request, res: Response) => {
    try {
        const result = await SocialInboxService.convertToCrmLead(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

export default router;

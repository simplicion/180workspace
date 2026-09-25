import { Router, Request, Response } from 'express';
import { SocialInboxService, AiReplyAllService } from '@workspace/social-media';
import { prisma, requestContext } from '@workspace/db';

const router = Router();

function getCompanyId(req: Request): string {
    const fromContext = requestContext.getStore()?.companyId;
    if (fromContext) return String(fromContext);
    const fromUser = (req as any).user?.companyId;
    if (fromUser) return String(fromUser);
    throw new Error('Authentication / Company context required');
}

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
        const conversation = await SocialInboxService.getConversation(String(req.params.id));
        res.json({ success: true, conversation });
    } catch (error: any) {
        res.status(404).json({ success: false, error: error.message });
    }
});

// Send message / reply
router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
        const { content, senderType } = req.body;
        const message = await SocialInboxService.sendMessage(String(req.params.id), content, senderType);
        res.status(201).json({ success: true, message });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Generate AI Smart Replies based on Brand Voice
router.get('/conversations/:id/ai-suggestions', async (req: Request, res: Response) => {
    try {
        const suggestions = await SocialInboxService.generateAiSmartReplies(String(req.params.id));
        res.json({ success: true, ...suggestions });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// 1-Click "Convert to CRM Lead"
router.post('/conversations/:id/convert-to-lead', async (req: Request, res: Response) => {
    try {
        const result = await SocialInboxService.convertToCrmLead(String(req.params.id));
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/social-media/inbox/ai-reply-all/suggestions
 * Generates brand-voice aligned draft responses for all unread conversations in batch
 */
router.post('/ai-reply-all/suggestions', async (req: Request, res: Response) => {
    try {
        const companyId = getCompanyId(req);
        const { projectId, platform, limit } = req.body || {};
        const suggestions = await AiReplyAllService.generateBatchSuggestions(companyId, {
            projectId,
            platform,
            limit: limit ? parseInt(String(limit), 10) : 20,
        });
        res.json({ success: true, count: suggestions.length, suggestions });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/social-media/inbox/ai-reply-all/dispatch
 * Dispatches approved batch AI replies with rate-limiting & telemetry
 */
router.post('/ai-reply-all/dispatch', async (req: Request, res: Response) => {
    try {
        const companyId = getCompanyId(req);
        const { replies } = req.body;
        if (!Array.isArray(replies)) {
            return res.status(400).json({ success: false, error: 'Replies array required' });
        }
        const result = await AiReplyAllService.executeBatchReply(companyId, replies);
        res.json({ success: true, ...result });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/social-media/inbox/conversations/:id/toggle-agent
 * Toggles autonomous AI Engagement Agent for this conversation thread
 */
router.post('/conversations/:id/toggle-agent', async (req: Request, res: Response) => {
    try {
        const companyId = getCompanyId(req);
        const conv = await (prisma as any).socialConversation.findUnique({ where: { id: req.params.id } });
        if (!conv || conv.companyId !== companyId) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        const updated = await (prisma as any).socialConversation.update({
            where: { id: req.params.id },
            data: {
                aiAgentActive: req.body.active !== undefined ? Boolean(req.body.active) : !conv.aiAgentActive,
                isHumanTakeover: false, // Reset human takeover when agent is manually toggled
            },
        });
        res.json({ success: true, aiAgentActive: updated.aiAgentActive, isHumanTakeover: updated.isHumanTakeover });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/social-media/inbox/conversations/:id/takeover
 * Human team member takeover: pauses AI agent for this conversation
 */
router.post('/conversations/:id/takeover', async (req: Request, res: Response) => {
    try {
        const companyId = getCompanyId(req);
        const conv = await (prisma as any).socialConversation.findUnique({ where: { id: req.params.id } });
        if (!conv || conv.companyId !== companyId) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        const updated = await (prisma as any).socialConversation.update({
            where: { id: req.params.id },
            data: {
                isHumanTakeover: true,
            },
        });
        res.json({ success: true, isHumanTakeover: updated.isHumanTakeover });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

export default router;

import { Router, Request, Response } from 'express';
import { ClientReviewService } from '@workspace/social-media';

const router = Router();

// Create a tokenized review session (Agency Authenticated)
router.post('/sessions', async (req: Request, res: Response) => {
    try {
        const session = await ClientReviewService.createReviewSession(req.body);
        res.status(201).json({ success: true, session });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Public: View review session & posts by token (NO AUTH REQUIRED)
router.get('/public/:token', async (req: Request, res: Response) => {
    try {
        const result = await ClientReviewService.getReviewSessionByToken(req.params.token);
        res.json({ success: true, ...result });
    } catch (error: any) {
        res.status(404).json({ success: false, error: error.message });
    }
});

// Public: Post comment/feedback (NO AUTH REQUIRED)
router.post('/public/:token/comments', async (req: Request, res: Response) => {
    try {
        const { postId, commentText, authorName, authorType } = req.body;
        const { session } = await ClientReviewService.getReviewSessionByToken(req.params.token);
        const comment = await ClientReviewService.addPostComment(session.id, postId, commentText, authorName, authorType);
        res.status(201).json({ success: true, comment });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Public: 1-Click Batch Approval of Entire Calendar (NO AUTH REQUIRED)
router.post('/public/:token/approve-batch', async (req: Request, res: Response) => {
    try {
        const { clientNotes } = req.body;
        const result = await ClientReviewService.batchApproveSession(req.params.token, clientNotes);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

export const publicReviewRouter = Router();

// Public handlers supported at root of publicReviewRouter
publicReviewRouter.get('/:token', async (req: Request, res: Response) => {
    try {
        const result = await ClientReviewService.getReviewSessionByToken(req.params.token);
        res.json({ success: true, ...result });
    } catch (error: any) {
        res.status(404).json({ success: false, error: error.message });
    }
});

publicReviewRouter.post('/:token/comments', async (req: Request, res: Response) => {
    try {
        const { postId, commentText, authorName, authorType } = req.body;
        const { session } = await ClientReviewService.getReviewSessionByToken(req.params.token);
        const comment = await ClientReviewService.addPostComment(session.id, postId, commentText, authorName, authorType);
        res.status(201).json({ success: true, comment });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

publicReviewRouter.post('/:token/approve-batch', async (req: Request, res: Response) => {
    try {
        const { clientNotes } = req.body;
        const result = await ClientReviewService.batchApproveSession(req.params.token, clientNotes);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

export default router;

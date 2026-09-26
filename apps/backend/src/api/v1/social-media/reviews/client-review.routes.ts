import { Router, Request, Response } from 'express';
import { ClientReviewService } from '@workspace/social-media';
import { sendRouteError } from '../route-errors';

const router = Router();

// Agency (authenticated): list review sessions of the caller's company, optionally for one project / client.
router.get('/sessions', async (req: Request, res: Response) => {
    try {
        const { projectId, clientId } = req.query;
        const sessions = await ClientReviewService.listSessions({
            projectId: typeof projectId === 'string' ? projectId : undefined,
            clientId: typeof clientId === 'string' ? clientId : undefined,
        });
        res.json({ success: true, sessions });
    } catch (error: any) {
        sendRouteError(res, error, 'reviews');
    }
});

// Create a tokenized review session (Agency Authenticated)
router.post('/sessions', async (req: Request, res: Response) => {
    try {
        const session = await ClientReviewService.createReviewSession(req.body);
        res.status(201).json({ success: true, session });
    } catch (error: any) {
        sendRouteError(res, error, 'reviews');
    }
});

// Agency: withdraw a review link immediately.
router.post('/sessions/:id/revoke', async (req: Request, res: Response) => {
    try {
        const session = await ClientReviewService.revokeSession(String(req.params.id), (req as any).user?.id);
        res.json({ success: true, session });
    } catch (error: any) {
        sendRouteError(res, error, 'reviews');
    }
});

/**
 * Public (token) handlers, shared by the authenticated router (`/public/:token…`) and the unauthenticated
 * `publicReviewRouter`. Expired / revoked links answer 410 with REVIEW_LINK_EXPIRED / REVIEW_LINK_REVOKED.
 */
const viewSession = async (req: Request, res: Response) => {
    try {
        const result = await ClientReviewService.getReviewSessionByToken(String(req.params.token));
        res.json({ success: true, ...result });
    } catch (error: any) {
        sendRouteError(res, error, 'reviews');
    }
};

const commentOnPost = async (req: Request, res: Response) => {
    try {
        const { postId, commentText, authorName } = req.body || {};
        // authorType is ignored on purpose: a token holder always comments as the client.
        const comment = await ClientReviewService.addPostComment(String(req.params.token), postId, commentText, authorName);
        res.status(201).json({ success: true, comment });
    } catch (error: any) {
        sendRouteError(res, error, 'reviews');
    }
};

const approveBatch = async (req: Request, res: Response) => {
    try {
        const { clientNotes, seenVersions } = req.body || {};
        const result = await ClientReviewService.batchApproveSession(String(req.params.token), clientNotes, seenVersions);
        res.json(result);
    } catch (error: any) {
        sendRouteError(res, error, 'reviews');
    }
};

router.get('/public/:token', viewSession);
router.post('/public/:token/comments', commentOnPost);
router.post('/public/:token/approve-batch', approveBatch);

export const publicReviewRouter = Router();
publicReviewRouter.get('/:token', viewSession);
publicReviewRouter.post('/:token/comments', commentOnPost);
publicReviewRouter.post('/:token/approve-batch', approveBatch);

export default router;

import { Router, Request, Response } from 'express';
import { SocialAccountService, SocialOAuthService, isPublishError, toPublicAccount } from '@workspace/social-media';
import { prisma } from '@workspace/db';
import { requireRole } from '../../../../system-configs/middleware/auth/rbac';
import { sendRouteError } from '../route-errors';

const router = Router();

/** OAuth credentials of connected channels never leave the server (tokens live only in the encrypted vault). */
const publicAccount = (a: any) => toPublicAccount(a);

/** Typed errors keep their status/code; anything else is logged and answered with a generic 500 (route-errors.ts). */
const sendError = (res: Response, error: any) => sendRouteError(res, error, 'accounts');

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// List connected social accounts
router.get('/', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.query;
        const accounts = await SocialAccountService.listAccounts(projectId as string);
        res.json({ success: true, accounts: accounts.map(publicAccount) });
    } catch (error: any) {
        sendError(res, error);
    }
});

/**
 * Start OAuth: GET /oauth/:platform/authorize?projectId&redirectUri&client=mobile|web → { url }.
 * The client opens `url` in the system browser; the provider returns to /oauth/:platform/callback (public route).
 */
router.get('/oauth/:platform/authorize', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const result = await SocialOAuthService.start({
            platform: String(req.params.platform),
            companyId: user?.companyId,
            userId: user?.id,
            projectId: (req.query.projectId as string) || null,
            redirectUri: String(req.query.redirectUri || ''),
            client: String(req.query.client || 'web'),
        });
        res.json({ success: true, url: result.url, expiresAt: result.expiresAt });
    } catch (error: any) {
        sendError(res, error);
    }
});

/** Meta pages / Instagram accounts and LinkedIn member vs. organisation picker (after status=select). */
router.get('/oauth/selections/:id', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const selection = await SocialOAuthService.getSelection(String(req.params.id), user?.companyId, user?.id);
        res.json({ success: true, ...selection });
    } catch (error: any) {
        sendError(res, error);
    }
});

router.post('/oauth/selections/:id', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const ids = Array.isArray(req.body?.candidateIds) ? req.body.candidateIds.map(String) : [];
        const accounts = await SocialOAuthService.completeSelection(String(req.params.id), user?.companyId, user?.id, ids);
        res.status(201).json({ success: true, accounts: accounts.map(publicAccount) });
    } catch (error: any) {
        sendError(res, error);
    }
});

// Connect an account with an externally obtained token (legacy / admin). Tokens go to the encrypted vault.
// Company admins only: any member could otherwise attach an arbitrary (or someone else's) token to the workspace.
// Normal users connect through OAuth (/oauth/:platform/authorize). The web ConnectedAccountsManager still posts a
// placeholder token here; that flow is replaced by real OAuth in Phase 3 (PRODUCTION_GAP_AUDIT.md).
router.post('/connect', requireRole('admin'), async (req: Request, res: Response) => {
    try {
        // Tenant scoping: an account may only be attached to a project / client of the caller's own company.
        const companyId = (req as any).user?.companyId;
        const { projectId, clientId } = req.body || {};
        if (projectId && !(await (prisma as any).project.findFirst({ where: { id: String(projectId), companyId }, select: { id: true } }))) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        if (clientId && !(await (prisma as any).client.findFirst({ where: { id: String(clientId), companyId }, select: { id: true } }))) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }
        const account = await SocialAccountService.connectAccount(req.body);
        res.status(201).json({ success: true, account: publicAccount(account) });
    } catch (error: any) {
        sendError(res, error);
    }
});

// Disconnect an account (also destroys its stored tokens)
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const result = await SocialAccountService.disconnectAccount(String(req.params.id));
        res.json(result);
    } catch (error: any) {
        sendError(res, error);
    }
});

/**
 * PUBLIC router (no JWT: the provider redirects the user's browser here). Mounted before `protect` at
 * /api/v1/social-media/accounts/oauth. Trust comes from the HMAC-signed, one-time `state`.
 */
export const oauthCallbackRouter = Router();

oauthCallbackRouter.get('/:platform/callback', async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    try {
        const { redirectTo } = await SocialOAuthService.callback(String(req.params.platform), req.query as Record<string, any>);
        res.status(302)
            .setHeader('Location', redirectTo)
            .type('html')
            .send(`<!doctype html><meta charset="utf-8"><title>Returning to 180</title><p>Connected. <a href="${escapeHtml(redirectTo)}">Return to the app</a>.</p>`);
    } catch (error: any) {
        const status = isPublishError(error) ? error.httpStatus : 500;
        const msg = isPublishError(error) ? error.message : 'Could not complete the connection.';
        res.status(status).type('html').send(`<!doctype html><meta charset="utf-8"><title>Connection failed</title><p>${escapeHtml(msg)}</p><p>Close this window and start the connection again from the app.</p>`);
    }
});

export default router;

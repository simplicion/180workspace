/**
 * Autopilot calendar endpoints (WS2). Mounted at /api/v1/social-media/projects/:id/autopilot.
 *
 *   POST /calendar                    start a multi-agent calendar job        -> 202 {jobId, calendarId, status}
 *   GET  /jobs/:jobId                 job status/progress                     -> 200 {status, stage, progress, error?}
 *   POST /pieces/:pieceId/regenerate  rewrite one piece with an instruction   -> 200 {piece, usage}
 *
 * Tenant = the authenticated user's company; every lookup is scoped to (companyId, projectId).
 * See docs/social-studio-mobile/AUTOPILOT_API.md.
 */
import { Router, Request, Response } from 'express';
import type { AutopilotCalendarService } from '@workspace/social-media';

// Loaded on first request so importing this router (e.g. in tests with an injected service) does not boot
// the whole social-media domain.
const defaultService = (): AutopilotCalendarService => require('@workspace/social-media').getAutopilotCalendarService();

function sendError(res: Response, err: any) {
    if (err?.name === 'AutopilotError' || (err?.code && err?.statusCode)) {
        return res.status(err.statusCode).json({ success: false, code: err.code, error: err.message, ...(err.details ? { details: err.details } : {}) });
    }
    console.error('[autopilot.routes] unexpected error', err);
    return res.status(500).json({ success: false, code: 'INTERNAL', error: 'Unexpected error' });
}

const companyOf = (req: Request) => (req as any).user?.companyId || (req as any).companyId;

export function createAutopilotRouter(getService: () => AutopilotCalendarService = defaultService) {
    const router = Router({ mergeParams: true });

    router.post('/calendar', async (req: Request, res: Response) => {
        try {
            const companyId = companyOf(req);
            if (!companyId) return res.status(401).json({ success: false, code: 'UNAUTHORIZED', error: 'Company context required' });
            const result = await getService().start({
                companyId,
                userId: (req as any).user?.id || '',
                projectId: String(req.params.id),
                body: req.body || {},
            });
            res.status(202).json({ success: true, ...result });
        } catch (err) {
            sendError(res, err);
        }
    });

    router.get('/jobs/:jobId', async (req: Request, res: Response) => {
        try {
            const companyId = companyOf(req);
            if (!companyId) return res.status(401).json({ success: false, code: 'UNAUTHORIZED', error: 'Company context required' });
            const job = await getService().getJob({ companyId, projectId: String(req.params.id), jobId: String(req.params.jobId) });
            res.json({ success: true, ...job });
        } catch (err) {
            sendError(res, err);
        }
    });

    router.post('/pieces/:pieceId/regenerate', async (req: Request, res: Response) => {
        try {
            const companyId = companyOf(req);
            if (!companyId) return res.status(401).json({ success: false, code: 'UNAUTHORIZED', error: 'Company context required' });
            const result = await getService().regeneratePiece({
                companyId,
                projectId: String(req.params.id),
                pieceId: String(req.params.pieceId),
                instruction: req.body?.instruction,
            });
            res.json({ success: true, ...result });
        } catch (err) {
            sendError(res, err);
        }
    });

    return router;
}

export default createAutopilotRouter();

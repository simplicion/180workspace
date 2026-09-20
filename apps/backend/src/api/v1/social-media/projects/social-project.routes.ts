import { Router, Request, Response } from 'express';
import * as SocialMediaModule from '@workspace/social-media';

const router = Router();

function getService(): typeof SocialMediaModule.SocialProjectService {
    return SocialMediaModule.SocialProjectService || 
           (SocialMediaModule as any).default?.SocialProjectService || 
           require('@workspace/social-media').SocialProjectService;
}

// List social media projects
router.get('/', async (req: Request, res: Response) => {
    try {
        const { search, status, clientId, limit, offset } = req.query;
        const companyId = (req as any).user?.companyId || (req as any).companyId;
        const service = getService();
        const result = await service.listProjects({
            search: search as string,
            status: status as string,
            clientId: clientId as string,
            limit: limit ? parseInt(limit as string) : 50,
            offset: offset ? parseInt(offset as string) : 0,
            companyId
        });
        res.json({ success: true, ...result });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Create social media project
router.post('/', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const companyId = user?.companyId || (req as any).companyId;
        const service = getService();
        const project = await service.createProject(req.body, user?.id || 'system_user', companyId);
        res.status(201).json({ success: true, project });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get project details
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).companyId;
        const service = getService();
        const project = await service.getProjectById(req.params.id, companyId);
        res.json({ success: true, project });
    } catch (error: any) {
        res.status(404).json({ success: false, error: error.message });
    }
});

// Update project settings & metadata
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).companyId;
        const service = getService();
        const project = await service.updateProjectSettings(req.params.id, req.body, companyId);
        res.json({ success: true, project });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get project dashboard metrics & attention items
router.get('/:id/dashboard', async (req: Request, res: Response) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).companyId;
        const service = getService();
        const dashboard = await service.getProjectDashboardMetrics(req.params.id, companyId);
        res.json({ success: true, dashboard });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get project chronological activity feed
router.get('/:id/activity', async (req: Request, res: Response) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 25;
        const companyId = (req as any).user?.companyId || (req as any).companyId;
        const service = getService();
        const activity = await service.getProjectActivityFeed(req.params.id, limit, companyId);
        res.json({ success: true, activity });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Link social account to project
router.post('/:id/accounts', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.body;
        if (!accountId) return res.status(400).json({ success: false, error: 'accountId is required' });
        const companyId = (req as any).user?.companyId || (req as any).companyId;
        const service = getService();
        const result = await service.linkSocialAccount(req.params.id, accountId, companyId);
        res.json({ success: true, result });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Unlink social account from project
router.delete('/:id/accounts/:accId', async (req: Request, res: Response) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).companyId;
        const service = getService();
        const result = await service.unlinkSocialAccount(req.params.id, req.params.accId, companyId);
        res.json({ success: true, result });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete social media project
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).companyId;
        const service = getService();
        const result = await service.deleteProject(req.params.id, companyId);
        res.json({ success: true, result });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

export default router;


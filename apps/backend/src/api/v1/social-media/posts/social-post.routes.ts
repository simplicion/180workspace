import { Router, Request, Response } from 'express';
import { SocialPostService, EditingTaskService } from '@workspace/social-media';
import { requireDesktopDevice } from '../../desktop/desktop-device';

const router = Router();

// List posts
router.get('/', async (req: Request, res: Response) => {
    try {
        const { projectId, clientId, status, calendarId, isEvergreen, limit, offset } = req.query;
        const posts = await SocialPostService.listPosts({
            projectId: projectId as string,
            clientId: clientId as string,
            status: status as string,
            calendarId: calendarId as string,
            isEvergreen: isEvergreen === 'true' ? true : isEvergreen === 'false' ? false : undefined,
            limit: limit ? parseInt(limit as string) : 50,
            offset: offset ? parseInt(offset as string) : 0
        });
        res.json({ success: true, posts });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get post by ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const post = await SocialPostService.getPost(req.params.id);
        res.json({ success: true, post });
    } catch (error: any) {
        res.status(404).json({ success: false, error: error.message });
    }
});

// Create post
router.post('/', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const post = await SocialPostService.createPost(req.body, user?.id);
        res.status(201).json({ success: true, post });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Update post
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const post = await SocialPostService.updatePost(req.params.id, req.body, user?.id);
        res.json({ success: true, post });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Submit source footage / external drive links
router.post('/:id/footage', async (req: Request, res: Response) => {
    try {
        const result = await SocialPostService.submitFootage(req.params.id, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Assign video editor from content item
router.post('/:id/assign-editor', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { assigneeId, deadline, priority, editingInstructions, sourceMediaUrls, projectId, clientId } = req.body;
        const task = await EditingTaskService.createEditingTask({
            socialPostId: req.params.id,
            projectId,
            clientId,
            assigneeId,
            deadline,
            priority,
            editingInstructions,
            sourceMediaUrls
        }, user?.id || 'system_user');
        res.status(201).json({ success: true, task });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Editor submits rendered deliverable
router.post('/tasks/:taskId/submit-deliverable', async (req: Request, res: Response) => {
    try {
        const { deliverableUrl, thumbnailUrl, notes } = req.body;
        if (!deliverableUrl) return res.status(400).json({ success: false, error: 'deliverableUrl is required' });
        const result = await EditingTaskService.submitEditorDeliverable(req.params.taskId, deliverableUrl, thumbnailUrl, notes);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get 180 Media Studio launch context
router.get('/:id/studio-launch-context', async (req: Request, res: Response) => {
    try {
        const context = await EditingTaskService.buildMediaStudioLaunchContext(undefined, req.params.id);
        res.json({ success: true, context });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Validate publishing readiness
router.get('/:id/validate-publish', async (req: Request, res: Response) => {
    try {
        const validation = await SocialPostService.validatePublishingReadiness(req.params.id);
        res.json({ success: true, ...validation });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Sync video rendered from 180 Media Studio
router.post('/sync-studio-render', requireDesktopDevice, async (req: Request, res: Response) => {
    try {
        const { calendarPieceId, finalVideoUrl, thumbnailUrl } = req.body;
        if (!calendarPieceId || !finalVideoUrl) {
            return res.status(400).json({ success: false, error: 'calendarPieceId and finalVideoUrl are required' });
        }
        const result = await SocialPostService.syncVideoFromStudio(calendarPieceId, finalVideoUrl, thumbnailUrl);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Publish now
router.post('/:id/publish', async (req: Request, res: Response) => {
    try {
        const result = await SocialPostService.publishPostNow(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Retry single failed platform variant
router.post('/:id/retry-variant', async (req: Request, res: Response) => {
    try {
        const { platform } = req.body;
        if (!platform) return res.status(400).json({ success: false, error: 'platform is required' });
        const result = await SocialPostService.retryFailedVariant(req.params.id, platform);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Repurpose post
router.post('/:id/repurpose', async (req: Request, res: Response) => {
    try {
        const result = await SocialPostService.repurposePost(req.params.id, req.body);
        res.status(201).json({ success: true, post: result });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

export default router;

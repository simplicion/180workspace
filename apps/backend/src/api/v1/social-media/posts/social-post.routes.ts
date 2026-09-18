import { Router, Request, Response } from 'express';
import { SocialPostService } from '@workspace/social-media';

const router = Router();

// List posts
router.get('/', async (req: Request, res: Response) => {
    try {
        const { projectId, clientId, status, calendarId, limit, offset } = req.query;
        const posts = await SocialPostService.listPosts({
            projectId: projectId as string,
            clientId: clientId as string,
            status: status as string,
            calendarId: calendarId as string,
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
        const post = await SocialPostService.updatePost(req.params.id, req.body);
        res.json({ success: true, post });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Sync video rendered from 180 Media Studio
router.post('/sync-studio-render', async (req: Request, res: Response) => {
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

export default router;

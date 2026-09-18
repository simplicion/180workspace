import { Router, Request, Response } from 'express';
import { BrandVoiceService } from '@workspace/social-media';

const router = Router();

// Get Brand Voice Profile for a Project
router.get('/:projectId', async (req: Request, res: Response) => {
    try {
        const profile = await BrandVoiceService.getBrandVoice(req.params.projectId);
        res.json({ success: true, profile });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Upsert Brand Voice Profile for a Project
router.post('/:projectId', async (req: Request, res: Response) => {
    try {
        const profile = await BrandVoiceService.upsertBrandVoice(req.params.projectId, req.body);
        res.json({ success: true, profile });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

export default router;

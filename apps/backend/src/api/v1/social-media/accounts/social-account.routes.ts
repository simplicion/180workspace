import { Router, Request, Response } from 'express';
import { SocialAccountService } from '@workspace/social-media';

const router = Router();

// List connected social accounts
router.get('/', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.query;
        const accounts = await SocialAccountService.listAccounts(projectId as string);
        res.json({ success: true, accounts });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Connect an account
router.post('/connect', async (req: Request, res: Response) => {
    try {
        const account = await SocialAccountService.connectAccount(req.body);
        res.status(201).json({ success: true, account });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Disconnect an account
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const result = await SocialAccountService.disconnectAccount(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
});

export default router;

import { Request, Response } from 'express';
import { GigsService } from './gigs.service';

export class GigsController {
  /**
   * GET /api/v1/pitch/gigs
   */
  static async listGigs(req: Request, res: Response): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const status = req.query.status as string | undefined;
      const query = req.query.q as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const result = await GigsService.listGigs({
        category,
        status,
        query,
        limit,
        offset,
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list gigs' });
    }
  }

  /**
   * GET /api/v1/pitch/gigs/:id
   */
  static async getGig(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const gig = await GigsService.getGigById(id);

      if (!gig) {
        res.status(404).json({ error: 'Gig not found' });
        return;
      }

      res.json({ success: true, gig });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch gig' });
    }
  }

  /**
   * POST /api/v1/pitch/gigs
   */
  static async createGig(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id || req.body?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: login required to post a gig' });
        return;
      }

      const { title, description, category, budget, currency, location } = req.body;
      const gig = await GigsService.createGig({
        title,
        description,
        category,
        budget,
        currency,
        location,
        userId,
      });

      res.status(201).json({ success: true, gig });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create gig' });
    }
  }

  /**
   * POST /api/v1/pitch/gigs/:id/apply
   */
  static async applyToGig(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const applicantId = user?.id || req.body?.applicantId;
      if (!applicantId) {
        res.status(401).json({ error: 'Unauthorized: login required to apply' });
        return;
      }

      const id = req.params.id as string;
      const { pitchReelId, note } = req.body;
      const result = await GigsService.applyToGig(id, applicantId, pitchReelId, note);

      res.json({ success: true, application: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to apply' });
    }
  }
}

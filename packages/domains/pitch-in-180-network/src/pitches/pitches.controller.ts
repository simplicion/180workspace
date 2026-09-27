import { Request, Response } from 'express';
import { PitchesService } from './pitches.service';

export class PitchesController {
  /**
   * POST /api/v1/pitch/posts
   * Create pitch post (enforces duration <= 180s)
   */
  static async createPitch(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id || (req.body && req.body.userId);
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: authentication required' });
        return;
      }

      const {
        title,
        description,
        videoUrl,
        hlsMasterUrl,
        thumbnailUrl,
        duration,
        category,
        tags,
      } = req.body;

      const pitch = await PitchesService.createPitch({
        title,
        description,
        videoUrl,
        hlsMasterUrl,
        thumbnailUrl,
        duration: Number(duration),
        category,
        tags: Array.isArray(tags) ? tags : [],
        userId,
        companyId: user?.companyId || null,
      });

      res.status(201).json({
        success: true,
        pitch,
      });
    } catch (err: any) {
      const isValidation = err.message && (
        err.message.includes('180 seconds') ||
        err.message.includes('required') ||
        err.message.includes('duration')
      );
      res.status(isValidation ? 400 : 500).json({ error: err.message || 'Failed to create pitch' });
    }
  }

  /**
   * GET /api/v1/pitch/posts/feed
   * Cursor-paginated vertical pitch reels feed
   */
  static async getFeed(req: Request, res: Response): Promise<void> {
    try {
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const category = req.query.category as string | undefined;
      const userId = req.query.userId as string | undefined;

      const result = await PitchesService.getFeed({
        cursor,
        limit,
        category,
        userId,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch pitch feed' });
    }
  }

  /**
   * GET /api/v1/pitch/posts/:id
   */
  static async getPitch(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const currentUserId = (req as any).user?.id;
      const pitch = await PitchesService.getPitchById(id, currentUserId);

      if (!pitch) {
        res.status(404).json({ error: 'Pitch reel not found' });
        return;
      }

      res.json({ success: true, pitch });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch pitch' });
    }
  }

  /**
   * POST /api/v1/pitch/posts/:id/upvote
   */
  static async toggleUpvote(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id || req.body?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: login required to upvote' });
        return;
      }

      const id = req.params.id as string;
      const result = await PitchesService.toggleUpvote(id, userId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to toggle upvote' });
    }
  }

  /**
   * GET /api/v1/pitch/posts/:id/comments
   */
  static async getComments(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const comments = await PitchesService.getComments(id, limit);
      res.json({ success: true, comments });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch comments' });
    }
  }

  /**
   * POST /api/v1/pitch/posts/:id/comments
   */
  static async addComment(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id || req.body?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: login required to comment' });
        return;
      }

      const id = req.params.id as string;
      const { content } = req.body;
      const comment = await PitchesService.addComment(id, userId, content);
      res.status(201).json({ success: true, comment });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to post comment' });
    }
  }

  /**
   * POST /api/v1/pitch/posts/:id/view
   */
  static async recordView(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const updated = await PitchesService.recordView(id);
      res.json({ success: true, views: updated.views });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to record view' });
    }
  }
}

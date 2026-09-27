import { Request, Response } from 'express';
import { ResourcesService } from './resources.service';

export class ResourcesController {
  /**
   * GET /api/v1/pitch/resources
   */
  static async listResources(req: Request, res: Response): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const query = req.query.q as string | undefined;
      const sortBy = (req.query.sort as any) || 'upvotes';
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const result = await ResourcesService.listResources({
        category,
        query,
        sortBy,
        limit,
        offset,
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list resources' });
    }
  }

  /**
   * POST /api/v1/pitch/resources
   */
  static async createResource(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id || req.body?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: login required to submit a resource' });
        return;
      }

      const { title, description, url, category, tags } = req.body;
      const resource = await ResourcesService.createResource({
        title,
        description,
        url,
        category,
        tags: Array.isArray(tags) ? tags : [],
        userId,
      });

      res.status(201).json({ success: true, resource });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to submit resource' });
    }
  }

  /**
   * POST /api/v1/pitch/resources/:id/vote
   */
  static async upvoteResource(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await ResourcesService.upvoteResource(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to upvote resource' });
    }
  }
}

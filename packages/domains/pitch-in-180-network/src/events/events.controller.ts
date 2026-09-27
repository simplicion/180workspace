import { Request, Response } from 'express';
import { EventsService } from './events.service';

export class EventsController {
  /**
   * GET /api/v1/pitch/events
   */
  static async listEvents(req: Request, res: Response): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const upcoming = req.query.upcoming !== 'false';
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const events = await EventsService.listEvents({
        category,
        upcomingOnly: upcoming,
        limit,
      });

      res.json({ success: true, events });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list events' });
    }
  }

  /**
   * POST /api/v1/pitch/events
   */
  static async createEvent(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id || req.body?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: login required to host an event' });
        return;
      }

      const { title, description, eventDate, location, meetingUrl, category } = req.body;
      const event = await EventsService.createEvent({
        title,
        description,
        eventDate,
        location,
        meetingUrl,
        category,
        userId,
      });

      res.status(201).json({ success: true, event });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create event' });
    }
  }

  /**
   * POST /api/v1/pitch/events/:id/rsvp
   */
  static async rsvpEvent(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id || req.body?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: login required to RSVP' });
        return;
      }

      const id = req.params.id as string;
      const result = await EventsService.rsvpEvent(id, userId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to RSVP' });
    }
  }
}

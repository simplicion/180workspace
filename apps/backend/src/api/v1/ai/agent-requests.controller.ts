import { Request, Response } from 'express';
import { prisma } from '@workspace/db';

export class AgentRequestsController {
  /**
   * GET /api/v1/ai/requests
   * List all agent requests with status filter, search, and queue metrics
   */
  static async getRequests(req: Request, res: Response) {
    try {
      const companyId = (req as any).user?.companyId;
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Company context required' });
      }

      const { status, type, voiceAgentId, search, page = '1', limit = '20' } = req.query;
      const take = Math.min(Number(limit) || 20, 100);
      const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

      const where: any = { companyId };

      if (status && status !== 'all') {
        where.status = String(status);
      }
      if (type && type !== 'all') {
        where.type = String(type);
      }
      if (voiceAgentId && voiceAgentId !== 'all') {
        where.voiceAgentId = String(voiceAgentId);
      }
      if (search) {
        const queryStr = String(search).trim();
        where.OR = [
          { customerName: { contains: queryStr, mode: 'insensitive' } },
          { topic: { contains: queryStr, mode: 'insensitive' } },
          { customerPhone: { contains: queryStr, mode: 'insensitive' } },
          { customerEmail: { contains: queryStr, mode: 'insensitive' } },
          { voiceAgentName: { contains: queryStr, mode: 'insensitive' } }
        ];
      }

      const [requests, total, counts] = await Promise.all([
        (prisma as any).agentRequest.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          include: {
            voiceAgent: { select: { id: true, name: true, language: true } },
            calendarEvent: { select: { id: true, title: true, startDate: true, endDate: true, location: true } },
            resolvedBy: { select: { id: true, name: true, email: true } }
          }
        }),
        (prisma as any).agentRequest.count({ where }),
        Promise.all([
          (prisma as any).agentRequest.count({ where: { companyId } }),
          (prisma as any).agentRequest.count({ where: { companyId, status: 'pending' } }),
          (prisma as any).agentRequest.count({ where: { companyId, status: 'auto_scheduled' } }),
          (prisma as any).agentRequest.count({ where: { companyId, status: 'confirmed' } }),
          (prisma as any).agentRequest.count({ where: { companyId, status: 'needs_review' } }),
          (prisma as any).agentRequest.count({ where: { companyId, status: 'rejected' } })
        ])
      ]);

      const [allCount, pendingCount, autoScheduledCount, confirmedCount, needsReviewCount, rejectedCount] = counts;

      return res.json({
        success: true,
        data: requests,
        pagination: {
          total,
          page: Number(page) || 1,
          limit: take,
          totalPages: Math.ceil(total / take)
        },
        counts: {
          all: allCount,
          pending: pendingCount,
          auto_scheduled: autoScheduledCount,
          confirmed: confirmedCount,
          needs_review: needsReviewCount,
          rejected: rejectedCount
        }
      });
    } catch (err: any) {
      console.error('[AgentRequestsController.getRequests] Error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch agent requests' });
    }
  }

  /**
   * GET /api/v1/ai/requests/:id
   * Fetch single agent request ticket
   */
  static async getRequestById(req: Request, res: Response) {
    try {
      const companyId = (req as any).user?.companyId;
      const { id } = req.params;

      const request = await (prisma as any).agentRequest.findFirst({
        where: { id, companyId },
        include: {
          voiceAgent: true,
          calendarEvent: true,
          resolvedBy: { select: { id: true, name: true, email: true } }
        }
      });

      if (!request) {
        return res.status(404).json({ success: false, error: 'Agent request not found' });
      }

      return res.json({ success: true, data: request });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch agent request' });
    }
  }

  /**
   * POST /api/v1/ai/requests
   * Create an agent request ticket
   */
  static async createRequest(req: Request, res: Response) {
    try {
      const companyId = (req as any).user?.companyId;
      if (!companyId) return res.status(400).json({ success: false, error: 'Company context required' });

      const {
        customerName,
        customerPhone,
        customerEmail,
        topic,
        requestedTimeRaw,
        scheduledStart,
        scheduledEnd,
        locationOrPlatform = 'google_meet',
        voiceAgentId,
        voiceAgentName,
        callSessionId,
        type = 'schedule_meeting',
        priority = 'medium',
        status = 'pending',
        notes
      } = req.body;

      if (!customerName || !topic) {
        return res.status(400).json({ success: false, error: 'customerName and topic are required' });
      }

      const request = await (prisma as any).agentRequest.create({
        data: {
          companyId,
          voiceAgentId: voiceAgentId || null,
          voiceAgentName: voiceAgentName || null,
          callSessionId: callSessionId || null,
          type,
          priority,
          status,
          customerName,
          customerPhone: customerPhone || null,
          customerEmail: customerEmail || null,
          topic,
          requestedTimeRaw: requestedTimeRaw || null,
          scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
          scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
          locationOrPlatform,
          notes: notes || null
        }
      });

      return res.status(201).json({ success: true, data: request });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to create agent request' });
    }
  }

  /**
   * POST /api/v1/ai/requests/:id/approve
   * 1-Click approval: confirms meeting and commits to 180 Calendar
   */
  static async approveRequest(req: Request, res: Response) {
    try {
      const companyId = (req as any).user?.companyId;
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { notes } = req.body;

      const request = await (prisma as any).agentRequest.findFirst({
        where: { id, companyId },
        include: { calendarEvent: true }
      });

      if (!request) {
        return res.status(404).json({ success: false, error: 'Agent request not found' });
      }

      let calendarEventId = request.calendarEventId;

      // Ensure CalendarEvent is created in 180 Calendar if not already
      if (!calendarEventId) {
        const start = request.scheduledStart || new Date(Date.now() + 24 * 60 * 60 * 1000);
        const end = request.scheduledEnd || new Date(start.getTime() + 30 * 60 * 1000);

        const event = await (prisma as any).calendarEvent.create({
          data: {
            companyId,
            title: `${request.topic} - ${request.customerName}`,
            description: request.notes || `Meeting with ${request.customerName} (Requested via ${request.voiceAgentName || 'Voice AI'})`,
            startDate: start,
            endDate: end,
            startTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            endTime: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            location: request.locationOrPlatform === 'phone' ? 'Phone Call' : 'Google Meet',
            externalAttendees: request.customerEmail ? [request.customerEmail] : []
          }
        }).catch(() => null);

        calendarEventId = event?.id || null;
      }

      const updated = await (prisma as any).agentRequest.update({
        where: { id: request.id },
        data: {
          status: 'confirmed',
          calendarEventId,
          resolvedById: userId || null,
          resolvedAt: new Date(),
          resolutionNotes: notes || 'Approved & locked into calendar via Orbit AI'
        },
        include: {
          calendarEvent: true,
          resolvedBy: { select: { id: true, name: true, email: true } }
        }
      });

      return res.json({
        success: true,
        message: `Meeting request for ${request.customerName} has been approved and confirmed in 180 Calendar.`,
        data: updated
      });
    } catch (err: any) {
      console.error('[AgentRequestsController.approveRequest] Error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to approve agent request' });
    }
  }

  /**
   * POST /api/v1/ai/requests/:id/reschedule
   * Reschedule meeting slot and synchronize CalendarEvent
   */
  static async rescheduleRequest(req: Request, res: Response) {
    try {
      const companyId = (req as any).user?.companyId;
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { newStart, newEnd, notes } = req.body;

      if (!newStart) {
        return res.status(400).json({ success: false, error: 'newStart is required to reschedule' });
      }

      const request = await (prisma as any).agentRequest.findFirst({
        where: { id, companyId },
        include: { calendarEvent: true }
      });

      if (!request) {
        return res.status(404).json({ success: false, error: 'Agent request not found' });
      }

      const startDate = new Date(newStart);
      const endDate = newEnd ? new Date(newEnd) : new Date(startDate.getTime() + 30 * 60 * 1000);

      // Update linked CalendarEvent
      if (request.calendarEventId) {
        await (prisma as any).calendarEvent.update({
          where: { id: request.calendarEventId },
          data: {
            startDate,
            endDate,
            startTime: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            endTime: endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        }).catch(() => {});
      } else {
        const event = await (prisma as any).calendarEvent.create({
          data: {
            companyId,
            title: `${request.topic} - ${request.customerName}`,
            description: request.notes || `Rescheduled meeting with ${request.customerName}`,
            startDate,
            endDate,
            startTime: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            endTime: endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            location: request.locationOrPlatform === 'phone' ? 'Phone Call' : 'Google Meet',
            externalAttendees: request.customerEmail ? [request.customerEmail] : []
          }
        }).catch(() => null);
        request.calendarEventId = event?.id || null;
      }

      const updated = await (prisma as any).agentRequest.update({
        where: { id: request.id },
        data: {
          scheduledStart: startDate,
          scheduledEnd: endDate,
          status: 'confirmed',
          calendarEventId: request.calendarEventId,
          resolvedById: userId || null,
          resolvedAt: new Date(),
          resolutionNotes: notes || `Rescheduled to ${startDate.toLocaleString()}`
        },
        include: {
          calendarEvent: true,
          resolvedBy: { select: { id: true, name: true, email: true } }
        }
      });

      return res.json({
        success: true,
        message: `Meeting for ${request.customerName} has been rescheduled to ${startDate.toLocaleString()}.`,
        data: updated
      });
    } catch (err: any) {
      console.error('[AgentRequestsController.rescheduleRequest] Error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to reschedule agent request' });
    }
  }

  /**
   * POST /api/v1/ai/requests/:id/reject
   * Dismiss or reject request with reason
   */
  static async rejectRequest(req: Request, res: Response) {
    try {
      const companyId = (req as any).user?.companyId;
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { reason, resolutionNotes } = req.body;

      const request = await (prisma as any).agentRequest.findFirst({
        where: { id, companyId }
      });

      if (!request) {
        return res.status(404).json({ success: false, error: 'Agent request not found' });
      }

      // If a calendar event was provisionally created, delete it
      if (request.calendarEventId) {
        await (prisma as any).calendarEvent.delete({
          where: { id: request.calendarEventId }
        }).catch(() => {});
      }

      const updated = await (prisma as any).agentRequest.update({
        where: { id: request.id },
        data: {
          status: 'rejected',
          calendarEventId: null,
          resolvedById: userId || null,
          resolvedAt: new Date(),
          resolutionNotes: reason || resolutionNotes || 'Rejected by administrator'
        },
        include: {
          resolvedBy: { select: { id: true, name: true, email: true } }
        }
      });

      return res.json({
        success: true,
        message: `Agent request for ${request.customerName} has been rejected.`,
        data: updated
      });
    } catch (err: any) {
      console.error('[AgentRequestsController.rejectRequest] Error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to reject agent request' });
    }
  }
}

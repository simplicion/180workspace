import { prisma } from '@workspace/db';

export interface CreateEventInput {
  title: string;
  description: string;
  eventDate: Date | string;
  location?: string;
  meetingUrl?: string;
  category?: string;
  userId: string;
}

export interface ListEventsOptions {
  category?: string;
  upcomingOnly?: boolean;
  limit?: number;
}

export class EventsService {
  /**
   * List pitch events, webinars, and demo days.
   */
  static async listEvents(options: ListEventsOptions = {}) {
    const limit = Math.min(Math.max(options.limit || 20, 1), 50);
    const where: any = {};

    if (options.upcomingOnly !== false) {
      where.eventDate = { gte: new Date() };
    }

    if (options.category && options.category !== 'all') {
      where.category = options.category.toLowerCase();
    }

    return await prisma.pitchinEvent.findMany({
      where,
      take: limit,
      orderBy: { eventDate: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            photoUrl: true,
          },
        },
      },
    });
  }

  /**
   * Create a new pitch event.
   */
  static async createEvent(input: CreateEventInput) {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Event title is required');
    }

    const eventDate = new Date(input.eventDate);
    if (isNaN(eventDate.getTime())) {
      throw new Error('Valid event date is required');
    }

    return await prisma.pitchinEvent.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || '',
        eventDate,
        location: input.location?.trim() || 'Virtual',
        meetingUrl: input.meetingUrl?.trim() || '',
        category: (input.category || 'pitch_day').toLowerCase(),
        userId: input.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            photoUrl: true,
          },
        },
      },
    });
  }

  /**
   * Toggle RSVP to an event.
   */
  static async rsvpEvent(eventId: string, userId: string) {
    const existing = await prisma.pitchinEventRsvp.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (existing) {
      await prisma.pitchinEventRsvp.delete({
        where: { id: existing.id },
      });

      const updated = await prisma.pitchinEvent.update({
        where: { id: eventId },
        data: { rsvpsCount: { decrement: 1 } },
        select: { rsvpsCount: true },
      });

      return { rsvpd: false, rsvpsCount: Math.max(0, updated.rsvpsCount) };
    } else {
      await prisma.pitchinEventRsvp.create({
        data: {
          eventId,
          userId,
        },
      });

      const updated = await prisma.pitchinEvent.update({
        where: { id: eventId },
        data: { rsvpsCount: { increment: 1 } },
        select: { rsvpsCount: true },
      });

      return { rsvpd: true, rsvpsCount: updated.rsvpsCount };
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { CalendarService } from '@workspace/workspace-tools';
// Using backend-common for email service if required, or importing it from communications
import * as EmailService from '@workspace/communications';
import { AutomationService } from '@workspace/communications';

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { year, month } = req.query;
        let filter: any = {};
        
        if (year && month) {
            const y = parseInt(year as string, 10);
            const m = parseInt(month as string, 10);
            const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
            const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

            filter = {
                startDate: { lte: monthEnd },
                OR: [
                    { endDate: { gte: monthStart } },
                    { endDate: null }
                ],
            };
        }
        
        const events = await CalendarService.getEvents(filter);
        res.json({ events });
    } catch (err) { next(err); }
};

export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { attendees, meeting, ...restBody } = req.body;
        
        const flattenedData = { ...restBody };
        if (meeting) {
            Object.assign(flattenedData, meeting);
        }
        
        flattenedData.createdById = (req as any).user.id;
        
        const createData: any = {
            ...flattenedData,
        };
        
        if (attendees && Array.isArray(attendees) && attendees.length > 0) {
            createData.attendees = {
                connect: attendees.map((id: string) => ({ id }))
            };
        }

        const event = await CalendarService.createEvent(createData);

        if (event.type === 'meeting' && event.attendees?.length > 0) {
            for (const attendee of event.attendees) {
                await AutomationService.trigger({
                    eventType: 'meeting_scheduled',
                    triggeredBy: (req as any).user.id,
                    targetUser: attendee.id,
                    relatedItem: { itemId: event.id, itemModel: 'CalendarEvent' },
                    description: `You have been invited to meeting: ${event.title}`,
                    metadata: {
                        meetingTitle: event.title,
                        startTime: event.startTime,
                        platform: event.platform,
                        meetingLink: event.meetingLink
                    }
                });
            }
        }

        res.status(201).json({ event });
    } catch (err) { next(err); }
};

export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const eventToUpdate = await CalendarService.getEventById(req.params.id);
        if (!eventToUpdate) return res.status(404).json({ error: 'Not found' });
        
        const isAdmin = (req as any).user.role === 'BMSP_SUPER_ADMIN' || (req as any).user.role === 'BMSP_ADMIN';
        if (!isAdmin && eventToUpdate.createdById !== (req as any).user.id) {
            return res.status(403).json({ error: 'Not authorized to update this event' });
        }

        const { attendees, meeting, ...restBody } = req.body;
        
        const flattenedData = { ...restBody };
        if (meeting) {
            Object.assign(flattenedData, meeting);
        }
        
        const updateData: any = {
            ...flattenedData
        };
        
        if (attendees && Array.isArray(attendees)) {
            updateData.attendees = {
                set: attendees.map((id: string) => ({ id }))
            };
        }
        
        const event = await CalendarService.updateEvent(req.params.id, updateData);
        res.json({ event });
    } catch (err: any) { 
        if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
        next(err); 
    }
};

export const resendInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const event = await CalendarService.getEventById(req.params.id);
        
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (event.type !== 'meeting') return res.status(400).json({ error: 'Not a meeting event' });
        
        const isAdmin = (req as any).user.role === 'BMSP_SUPER_ADMIN' || (req as any).user.role === 'BMSP_ADMIN';
        if (!isAdmin && event.createdById !== (req as any).user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const creator = await CalendarService.getUser((req as any).user.id);
        
        await CalendarService.sendMeetingInvites(EmailService, event, creator, process.env.CLIENT_URL);
        res.json({ message: 'Invites resent successfully' });
    } catch (err) { next(err); }
};

export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const eventToDelete = await CalendarService.getEventById(req.params.id);
        if (!eventToDelete) return res.status(404).json({ error: 'Not found' });
        
        const isAdmin = (req as any).user.role === 'BMSP_SUPER_ADMIN' || (req as any).user.role === 'BMSP_ADMIN';
        if (!isAdmin && eventToDelete.createdById !== (req as any).user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this event' });
        }

        await CalendarService.deleteEvent(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err: any) { 
        if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
        next(err); 
    }
};

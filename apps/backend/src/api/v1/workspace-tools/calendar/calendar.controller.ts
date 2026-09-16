import { Request, Response, NextFunction } from 'express';
import { CalendarService } from '@workspace/workspace-tools';
// Using backend-common for email service if required, or importing it from communications
import * as EmailService from '@workspace/communications';
import { AutomationService } from '@workspace/automations';
import { logAction } from '../../../../system-configs/utils/audit';

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { year, month } = req.query;
        const companyId = (req as any).user?.companyId;
        let filter: any = {};
        
        if (companyId) {
            filter.companyId = companyId;
        }

        if (year && month) {
            const y = parseInt(year as string, 10);
            const m = parseInt(month as string, 10);
            const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
            const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

            filter.startDate = { lte: monthEnd };
            filter.OR = [
                { endDate: { gte: monthStart } },
                { endDate: null }
            ];
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
        
        if (createData.startDate) createData.startDate = new Date(createData.startDate);
        if (createData.endDate) createData.endDate = new Date(createData.endDate);

        const actualAttendees = attendees || meeting?.attendees;
        delete createData.attendees;
        if (actualAttendees && Array.isArray(actualAttendees) && actualAttendees.length > 0) {
            createData.attendees = {
                connect: actualAttendees.map((id: string) => ({ id }))
            };
        }

        const actualClients = meeting?.clientIds;
        delete createData.clientIds;
        if (actualClients && Array.isArray(actualClients) && actualClients.length > 0) {
            createData.clients = {
                connect: actualClients.map((id: string) => ({ id }))
            };
        }

        const event = await CalendarService.createEvent(createData);
        let smtpWarning: string | undefined = undefined;

        if (event.type === 'meeting') {
            const hasAttendees = event.attendees?.length > 0;
            const hasClients = event.clients?.length > 0;

            if (hasAttendees || hasClients) {
                try {
                    const isSmtpConfigured = await EmailService.verifyConfig('work');
                    if (!isSmtpConfigured) {
                        smtpWarning = "Email is not configured. We haven't sent the meeting invitation.";
                    } else {
                        const creator = await CalendarService.getUser((req as any).user.id);
                        await CalendarService.sendMeetingInvites(EmailService, event, creator, process.env.CLIENT_URL as string);
                    }
                } catch (e) {
                    smtpWarning = "Email is not configured. We haven't sent the meeting invitation.";
                }
            }

            if (hasAttendees) {
                for (const attendee of event.attendees) {
                    await AutomationService.trigger({
                        eventType: 'meeting_scheduled',
                        triggeredBy: (req as any).user.id,
                        targetUser: attendee.id,
                        relatedItem: { itemId: event.id, itemModel: 'CalendarEvent' },
                        description: `You have been invited to meeting: ${event.title}`,
                        metadata: {
                            meetingTitle: event.title,
                            startTime: event.startDate,
                            platform: event.platform,
                            meetingLink: event.meetingLink
                        }
                    });
                }
            }
        }

        await logAction((req as any).user.id, 'CREATE', 'CalendarEvent', event.id, { title: event.title, type: event.type }, req);

        res.status(201).json({ event, warning: smtpWarning });
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
        
        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
        if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

        const actualAttendees = attendees || meeting?.attendees;
        delete updateData.attendees;
        if (actualAttendees && Array.isArray(actualAttendees)) {
            updateData.attendees = {
                set: actualAttendees.map((id: string) => ({ id }))
            };
        }
        
        const actualClients = meeting?.clientIds;
        delete updateData.clientIds;
        if (actualClients && Array.isArray(actualClients)) {
            updateData.clients = {
                set: actualClients.map((id: string) => ({ id }))
            };
        }
        
        const event = await CalendarService.updateEvent(req.params.id, updateData);
        await logAction((req as any).user.id, 'UPDATE', 'CalendarEvent', event.id, { title: event.title, type: event.type }, req);
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
        const id = req.params.id as string;
        const eventToDelete = await CalendarService.getEventById(id);
        if (!eventToDelete) return res.status(404).json({ error: 'Not found' });
        
        const isAdmin = (req as any).user.role === 'BMSP_SUPER_ADMIN' || (req as any).user.role === 'BMSP_ADMIN';
        if (!isAdmin && eventToDelete.createdById !== (req as any).user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this event' });
        }

        await CalendarService.deleteEvent(id);
        await logAction((req as any).user.id, 'DELETE', 'CalendarEvent', id, { title: eventToDelete.title }, req);
        res.json({ message: 'Deleted' });
    } catch (err: any) { 
        if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
        next(err); 
    }
};

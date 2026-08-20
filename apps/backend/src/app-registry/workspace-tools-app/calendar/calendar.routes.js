const { prisma } = require('@workspace/db');
'use strict';
const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const { requireAdmin } = require('../../../system-configs/middleware/auth/rbac.js');
const EmailService = require('../../communications-app/emails/email.service');

// â”€â”€ Helper: send meeting invite emails â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function sendMeetingInvites(event, creator, req) {
    if (event.type !== 'meeting') return;

    const { startTime, endTime, platform, meetingLink, location, agenda, attendees, externalAttendees, notes } = event;

    // Collect all email addresses
    const emailTargets = [];

    // Internal attendees (User objects already populated)
    if (attendees && attendees.length) {
        attendees.forEach(u => {
            if (u && u.email) emailTargets.push({ email: u.email, name: u.name });
        });
    }

    // External attendees
    if (externalAttendees && externalAttendees.length) {
        externalAttendees.forEach(email => emailTargets.push({ email, name: email }));
    }

    if (!emailTargets.length) return;

    const platformLabels = {
        google_meet: 'ðŸŸ¢ Google Meet',
        zoom: 'ðŸ”µ Zoom',
        teams: 'ðŸŸ£ Microsoft Teams',
        platform_meeting: 'ðŸ¢ Platform Meeting (Platform Native)',
        in_person: 'ðŸ¢ In Person',
        phone: 'ðŸ“ž Phone Call',
        others: 'ðŸ“… Meeting',
    };

    const platformLabel = platformLabels[platform] || 'Meeting';
    const dateStr = new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = startTime ? `${startTime}${endTime ? ' â€“ ' + endTime : ''}` : 'All Day';
    const linkLine = meetingLink ? `<p><strong>Join:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : '';
    const locationLine = location ? `<p><strong>Location:</strong> ${location}</p>` : '';
    const agendaLine = agenda ? `<p><strong>Agenda:</strong></p><pre style="background:#f9fafb;padding:12px;border-radius:8px;font-size:13px;">${agenda}</pre>` : '';
    const notesLine = notes ? `<p><strong>Notes:</strong> ${notes}</p>` : '';
    const callerName = creator?.name || 'Your Admin';

    const config = await prisma.companyConfig.findFirst();
    const companyName = config?.companyName || 'Your Company';

    // Send to all targets
    for (const target of emailTargets) {
        try {
            await EmailService.notify(target, 'meeting_scheduled', {
                meetingTitle: event.title,
                startTime: startTime ? `${dateStr} ${startTime}` : dateStr,
                ctaUrl: meetingLink || `${process.env.CLIENT_URL}/dashboard/calendar`
            });
        } catch (e) {
            console.error(`Failed to send meeting invite to ${target.email}:`, e.message);
        }
    }
}

// GET /api/calendar - list all events (with optional month/year filter)
router.get('/', protect, async (req, res, next) => {
    try {
        const { year, month } = req.query;
        let filter = {};
        if (year && month) {
            // Get the full calendar month bounds (UTC midnight to end of last day)
            const y = parseInt(year, 10);
            const m = parseInt(month, 10);
            const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
            const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)); // last day of month

            // Fetch any event that overlaps this month:
            // startDate <= monthEnd AND (endDate >= monthStart OR startDate >= monthStart)
            filter = {
                startDate: { lte: monthEnd },
                OR: [
                    { endDate: { gte: monthStart } },
                    { endDate: null }
                ],
            };
        }
        
        const events = await prisma.calendarEvent.findMany({
            where: filter,
            include: {
                createdBy: { select: { name: true } },
                attendees: { select: { id: true, name: true, email: true, photoUrl: true, role: true } }
            },
            orderBy: { startDate: 'asc' }
        });
        res.json({ events });
    } catch (err) { next(err); }
});

// POST /api/calendar - create event (admin only)
router.post('/', protect, requireAdmin, async (req, res, next) => {
    try {
        const AutomationService = require('../../../platform-core/platform-communications/services/automation.service');
        const { attendees, meeting, ...restBody } = req.body;
        
        // Prisma: meeting fields are flattened. We expect the client might still send `meeting: { ... }` or flattened fields.
        const flattenedData = { ...restBody };
        if (meeting) {
            Object.assign(flattenedData, meeting);
        }
        
        flattenedData.createdById = req.user.id;
        
        const createData = {
            ...flattenedData,
        };
        
        if (attendees && Array.isArray(attendees) && attendees.length > 0) {
            createData.attendees = {
                connect: attendees.map(id => ({ id }))
            };
        }

        const event = await prisma.calendarEvent.create({
            data: createData,
            include: { attendees: true }
        });

        // Trigger meeting automation
        if (event.type === 'meeting' && event.attendees?.length > 0) {
            for (const attendee of event.attendees) {
                await AutomationService.trigger({
                    eventType: 'meeting_scheduled',
                    triggeredBy: req.user.id,
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
});

// PUT /api/calendar/:id - update event (creator or admin)
router.put('/:id', protect, async (req, res, next) => {
    try {
        const eventToUpdate = await prisma.calendarEvent.findUnique({ where: { id: req.params.id } });
        if (!eventToUpdate) return res.status(404).json({ error: 'Not found' });
        
        const isAdmin = req.user.role === 'BMSP_SUPER_ADMIN' || req.user.role === 'BMSP_ADMIN';
        if (!isAdmin && eventToUpdate.createdById !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this event' });
        }

        const { attendees, meeting, ...restBody } = req.body;
        
        const flattenedData = { ...restBody };
        if (meeting) {
            Object.assign(flattenedData, meeting);
        }
        
        const updateData = {
            ...flattenedData
        };
        
        if (attendees && Array.isArray(attendees)) {
            updateData.attendees = {
                set: attendees.map(id => ({ id }))
            };
        }
        
        const event = await prisma.calendarEvent.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                attendees: { select: { id: true, name: true, email: true, photoUrl: true, role: true } }
            }
        });
        res.json({ event });
    } catch (err) { 
        if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
        next(err); 
    }
});

// POST /api/calendar/:id/resend-invite - resend meeting invites (creator or admin)
router.post('/:id/resend-invite', protect, async (req, res, next) => {
    try {
        const event = await prisma.calendarEvent.findUnique({
            where: { id: req.params.id },
            include: {
                attendees: { select: { id: true, name: true, email: true } }
            }
        });
        
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (event.type !== 'meeting') return res.status(400).json({ error: 'Not a meeting event' });
        
        const isAdmin = req.user.role === 'BMSP_SUPER_ADMIN' || req.user.role === 'BMSP_ADMIN';
        if (!isAdmin && event.createdById !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const creator = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { name: true, email: true }
        });
        
        await sendMeetingInvites(event, creator, req);
        res.json({ message: 'Invites resent successfully' });
    } catch (err) { next(err); }
});

// DELETE /api/calendar/:id - delete event (creator or admin)
router.delete('/:id', protect, async (req, res, next) => {
    try {
        const eventToDelete = await prisma.calendarEvent.findUnique({ where: { id: req.params.id } });
        if (!eventToDelete) return res.status(404).json({ error: 'Not found' });
        
        const isAdmin = req.user.role === 'BMSP_SUPER_ADMIN' || req.user.role === 'BMSP_ADMIN';
        if (!isAdmin && eventToDelete.createdById !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this event' });
        }

        await prisma.calendarEvent.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Deleted' });
    } catch (err) { 
        if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
        next(err); 
    }
});

module.exports = router;

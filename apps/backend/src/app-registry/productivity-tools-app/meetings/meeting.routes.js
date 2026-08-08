'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../../../system-configs/middleware/auth/auth.js');
const meetingAIController = require('./meeting-ai.controller');
const { randomUUID } = require('crypto');

/**
 * @desc    Create a new instant meeting room
 * @route   POST /api/meeting
 * @access  Protected
 */
router.post('/', protect, async (req, res) => {
    try {
        const { title } = req.body;
        const companyId = req.user.companyId;
        const userId = req.user.id;

        // Generate a company-scoped room ID that passes validate
        const roomId = `room-${companyId}-${randomUUID().slice(0, 8)}`;

        const log = await req.prisma.meetingLog.create({
            data: {
                roomId,
                companyId,
                createdById: userId,
                status: 'active',
                participants: [],
                ...(title ? { title } : {}),
            }
        });

        res.status(201).json({ meeting: { _id: log.id, roomId, title, startedAt: log.startTime, status: log.status } });
    } catch (err) {
        console.error('[Meeting] Create error:', err);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
});

/**
 * @desc    List recent meetings for the company
 * @route   GET /api/meeting
 * @access  Protected
 */
router.get('/', protect, async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const meetings = await req.prisma.meetingLog.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { createdBy: { select: { name: true } } }
        });

        res.json({ meetings });
    } catch (err) {
        console.error('[Meeting] List error:', err);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
});

/**
 * @desc    Validate access to a meeting room
 * @route   GET /api/meeting/validate/:roomId
 * @access  Protected (Company Aware)
 */
router.get('/validate/:roomId', protect, async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.id;
        const companyId = req.user.companyId;

        // 1. Room ID Company Validation
        // Supported formats:
        //   room-{companyId}-{short}           (from meeting page)
        //   ims-{companyId}-meeting-{ts}       (from calendar)
        //   v-{companyId}-meeting-{ts}         (from chat video call)
        let roomCompanyId = null;
        if (roomId.startsWith('room-')) {
            // room-{companyId}-{short} — companyId could be UUID with dashes
            const afterPrefix = roomId.slice('room-'.length);
            // Last segment is the short id (8 chars), rest is companyId
            const lastDash = afterPrefix.lastIndexOf('-');
            roomCompanyId = lastDash > 0 ? afterPrefix.slice(0, lastDash) : null;
        } else if (roomId.startsWith('ims-')) {
            // ims-{companyId}-meeting-{ts}
            const afterPrefix = roomId.slice('ims-'.length);
            const meetingIdx = afterPrefix.indexOf('-meeting-');
            roomCompanyId = meetingIdx > 0 ? afterPrefix.slice(0, meetingIdx) : null;
        } else if (roomId.startsWith('v-')) {
            // v-{companyId}-meeting-{ts}
            const afterPrefix = roomId.slice('v-'.length);
            const meetingIdx = afterPrefix.indexOf('-meeting-');
            roomCompanyId = meetingIdx > 0 ? afterPrefix.slice(0, meetingIdx) : null;
        }

        if (roomCompanyId) {
            if (roomCompanyId !== companyId.toString()) {
                return res.status(403).json({ error: 'Security Alert: Access denied to external company room' });
            }
        } else {
            console.warn(`[Meeting] Room ID ${roomId} has unrecognized format`);
        }

        // 2. Check if it's a scheduled meeting
        const event = await req.prisma.calendarEvent.findFirst({
            where: { roomId: roomId },
            include: { attendees: { select: { id: true } } }
        });

        if (event) {
            const isAttendee = event.attendees?.some(a => a.id === userId);
            const isCreator = event.createdById === userId;

            if (!isAttendee && !isCreator) {
                return res.status(403).json({ error: 'You are not invited to this scheduled meeting' });
            }

            return res.json({
                success: true,
                type: 'scheduled',
                title: event.title,
                meetingId: event.id
            });
        }

        // 3. Ad-hoc/Personal calls and check meeting log
        const config = await req.prisma.companyConfig.findFirst();
        
        let log = await req.prisma.meetingLog.findFirst({
            where: { roomId: roomId, companyId },
            include: { createdBy: { select: { id: true, name: true } } }
        });

        let isCreator = false;
        if (event) {
            isCreator = event.createdById === userId;
        } else if (log) {
            isCreator = log.createdById === userId;
        } else {
            isCreator = true; // brand new ad-hoc meeting they are about to create
        }

        return res.json({
            success: true,
            type: event ? 'scheduled' : 'adhoc',
            title: event?.title || log?.title || (config?.companyName || 'Platform') + ' Native Call',
            meetingId: event?.id,
            isCreator
        });

    } catch (err) {
        console.error('[Meeting Routes] Validation error:', err);
        res.status(500).json({ error: 'Failed to validate room access' });
    }
});

/**
 * @desc    Log joining a meeting
 * @route   POST /api/meeting/log/join
 */
router.post('/log/join', protect, async (req, res) => {
    try {
        const { roomId, meetingId } = req.body;
        const userId = req.user.id;
        const companyId = req.user.companyId;

        let log = await req.prisma.meetingLog.findFirst({
            where: { roomId, status: 'active' }
        });

        if (!log) {
            log = await req.prisma.meetingLog.create({
                data: {
                    meetingId: meetingId || null,
                    roomId,
                    companyId,
                    createdById: userId,
                    status: 'active',
                    participants: []
                }
            });
        }

        const participants = Array.isArray(log.participants) ? log.participants : [];
        const existingParticipant = participants.find(p => p.userId === userId && !p.leaveTime);

        if (!existingParticipant) {
            participants.push({
                userId,
                joinTime: new Date().toISOString()
            });
            await req.prisma.meetingLog.update({
                where: { id: log.id },
                data: { participants }
            });
        }

        res.json({ success: true, logId: log.id });
    } catch (err) {
        console.error('[Meeting Routes] Join log error:', err);
        res.status(500).json({ error: 'Failed to log join event' });
    }
});

/**
 * @desc    Log leaving a meeting
 * @route   POST /api/meeting/log/leave
 */
router.post('/log/leave', protect, async (req, res) => {
    try {
        const { roomId } = req.body;
        const userId = req.user.id;

        const log = await req.prisma.meetingLog.findFirst({
            where: { roomId, status: 'active' }
        });
        
        if (!log) return res.status(404).json({ error: 'Active meeting log not found' });

        const participants = Array.isArray(log.participants) ? [...log.participants] : [];
        const participant = participants.find(p => p.userId === userId && !p.leaveTime);

        if (participant) {
            const leaveTime = new Date();
            participant.leaveTime = leaveTime.toISOString();
            participant.duration = Math.round((leaveTime - new Date(participant.joinTime)) / 1000);
        }

        const activeParticipants = participants.filter(p => !p.leaveTime);
        const updates = { participants };
        
        if (activeParticipants.length === 0) {
            updates.status = 'completed';
            updates.endTime = new Date();
        }

        await req.prisma.meetingLog.update({
            where: { id: log.id },
            data: updates
        });

        res.json({ success: true });
    } catch (err) {
        console.error('[Meeting Routes] Leave log error:', err);
        res.status(500).json({ error: 'Failed to log leave event' });
    }
});

/**
 * @desc    Process meeting transcript with AI
 * @route   POST /api/meeting/ai/process
 */
router.post('/ai/process', protect, (req, res, next) => meetingAIController.processTranscript(req, res, next));

/**
 * @desc    Get meeting summary from Google Sheets
 * @route   GET /api/meeting/ai/summary/:roomId
 */
router.get('/ai/summary/:roomId', protect, (req, res, next) => meetingAIController.getSummary(req, res, next));

/**
 * @desc    Save a new transcript line to the database
 * @route   POST /api/meeting/transcript
 */
router.post('/transcript', protect, (req, res, next) => meetingAIController.saveTranscript(req, res, next));

/**
 * @desc    Get all transcripts for a meeting log
 * @route   GET /api/meeting/transcript/:meetingLogId
 */
router.get('/transcript/:meetingLogId', protect, (req, res, next) => meetingAIController.getTranscripts(req, res, next));

/**
 * @desc    Chat with AI about the meeting
 * @route   POST /api/meeting/ai-chat
 */
router.post('/ai-chat', protect, (req, res, next) => meetingAIController.chatWithMeetingAI(req, res, next));

/**
 * @desc    Get a single meeting log with participants
 * @route   GET /api/meeting/log/:meetingLogId
 */
router.get('/log/:meetingLogId', protect, async (req, res, next) => {
    try {
        const { meetingLogId } = req.params;
        const companyId = req.user.companyId;

        const log = await req.prisma.meetingLog.findFirst({
            where: { id: meetingLogId, companyId },
            include: { createdBy: { select: { name: true } } }
        });

        if (!log) return res.status(404).json({ error: 'Meeting log not found' });

        res.json({ log });
    } catch (err) {
        console.error('[Meeting Routes] Get log error:', err);
        res.status(500).json({ error: 'Failed to fetch meeting log' });
    }
});

/**
 * @desc    Get meeting details by roomId
 * @route   GET /api/meeting/room/:roomId/details
 */
router.get('/room/:roomId/details', protect, async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const companyId = req.user.companyId;

        // Fetch the latest meeting log for this room
        const log = await req.prisma.meetingLog.findFirst({
            where: { roomId, companyId },
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { name: true, email: true } } }
        });

        if (!log) return res.status(404).json({ error: 'Meeting details not found' });

        res.json({ log });
    } catch (err) {
        console.error('[Meeting Routes] Get room details error:', err);
        res.status(500).json({ error: 'Failed to fetch room details' });
    }
});

/**
 * @desc    Delete a meeting
 * @route   DELETE /api/meeting/:roomId
 * @access  Protected
 */
router.delete('/:roomId', protect, async (req, res) => {
    try {
        const { roomId } = req.params;
        const companyId = req.user.companyId;

        const log = await req.prisma.meetingLog.findFirst({
            where: { roomId, companyId }
        });

        if (!log) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        await req.prisma.meetingLog.delete({
            where: { id: log.id }
        });

        res.json({ success: true, message: 'Meeting deleted successfully' });
    } catch (err) {
        console.error('[Meeting] Delete error:', err);
        res.status(500).json({ error: 'Failed to delete meeting' });
    }
});

module.exports = router;

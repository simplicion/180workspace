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
 * @access  Protected (Tenant Aware)
 */
router.get('/validate/:roomId', protect, async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.id;
        const companyId = req.user.companyId;

        // 1. Strict Room ID Prefix Validation
        const roomParts = roomId.split('-');
        if (roomParts[0] === 'room' && roomParts[1]) {
            const roomCompanyId = roomParts[1];
            if (roomCompanyId !== companyId.toString()) {
                return res.status(403).json({ error: 'Security Alert: Access denied to external company room' });
            }
        } else {
            // For now, allow rooms without prefix for migration, but ideally enforce room-ID-
            console.warn(`[Meeting] Room ID ${roomId} lacks company prefix`);
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

        // 3. Ad-hoc/Personal calls
        const config = await req.prisma.companyConfig.findFirst();
        return res.json({
            success: true,
            type: 'adhoc',
            title: (config?.companyName || 'Platform') + ' Native Call'
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

module.exports = router;

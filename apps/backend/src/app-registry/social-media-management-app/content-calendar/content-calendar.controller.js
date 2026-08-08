'use strict';

const aiContentService = require('../../productivity-tools-app/ai-assistant/ai-content.service');

// LIST calendars
exports.listCalendars = async (req, res, next) => {
    try {
        const ContentCalendar = req.prisma.contentCalendar;

        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const calendars = await ContentCalendar.findMany({
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit
        });

        // Map _id for backwards compatibility
        const mappedCalendars = calendars.map(c => ({
            ...c,
            _id: c.id
        }));

        res.json({ calendars: mappedCalendars });
    } catch (err) { next(err); }
};

// GET single calendar
exports.getCalendar = async (req, res, next) => {
    try {
        const ContentCalendar = req.prisma.contentCalendar;
        const CalendarContentPiece = req.prisma.calendarContentPiece;

        const calendar = await ContentCalendar.findUnique({ where: { id: req.params.id } });
        if (!calendar) return res.status(404).json({ error: 'Calendar not found' });

        const pieces = await CalendarContentPiece.findMany({
            where: { calendarId: calendar.id },
            orderBy: { dateScheduled: 'asc' }
        });

        // Map _id for compatibility
        const mappedCalendar = { ...calendar, _id: calendar.id };
        const mappedPieces = pieces.map(p => ({ ...p, _id: p.id }));

        res.json({ calendar: mappedCalendar, pieces: mappedPieces });
    } catch (err) { next(err); }
};

// CREATE calendar (Triggers AI Generation)
exports.createCalendar = async (req, res, next) => {
    try {
        const ContentCalendar = req.prisma.contentCalendar;
        const CalendarContentPiece = req.prisma.calendarContentPiece;
        const AiRequestLog = req.prisma.aiRequestLog;

        const startTime = Date.now();

        // 1. Call AI Service to generate calendar data based on req.body
        const aiResponse = await aiContentService.generateContentCalendar(req.user.companyId, req.body, req.user);

        if (!aiResponse.success) {
            return res.status(400).json({ error: aiResponse.error || 'AI generation failed' });
        }

        const generatedPieces = aiResponse.data;
        const meta = aiResponse.meta || {};

        // 2. Save Calendar Metadata
        const calendar = await ContentCalendar.create({ data: {
            userId: req.user.id,
            brandName: req.body.brandName || req.body.brand_name || 'Brand',
            industry: req.body.industry || 'General',
            subdomain: req.body.subdomain || 'company',
            targetAudience: req.body.targetAudience || req.body.target_audience || 'General Audience',
            platforms: req.body.platforms || [],
            calendarDuration: req.body.durationWords || req.body.calendar_duration || '1 month',
            frequency: req.body.frequency || 'Weekly',
            startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
            timezone: req.body.timezone || 'UTC',
            contentPillars: req.body.contentPillars || req.body.content_pillars || [],
            tone: req.body.brandVoice || req.body.brand_voice || 'Professional',
            engagementGoal: req.body.engagementGoal || req.body.engagement_goal || 'Growth',
            hashtagStrategy: req.body.hashtagStrategy || req.body.hashtag_strategy || 'Mixed',
            competitors: req.body.competitors || [],
            status: 'active',
            totalPieces: generatedPieces.length,
            reelsCount: generatedPieces.filter(p => ['reel', 'video', 'tiktok', 'short'].includes(p.contentType?.toLowerCase())).length,
            postsCount: generatedPieces.filter(p => ['post', 'image', 'text'].includes(p.contentType?.toLowerCase())).length,
            carouselsCount: generatedPieces.filter(p => p.contentType?.toLowerCase() === 'carousel').length,
            metadata: { aiProviderUsed: meta.provider }
        } });

        // 3. Save Calendar Pieces
        const piecesToInsert = generatedPieces.map((piece, index) => ({
            calendarId: calendar.id,
            dateScheduled: piece.dateScheduled ? new Date(piece.dateScheduled) : new Date(),
            platform: piece.platform || 'General',
            contentType: piece.contentType || 'Post',
            pillar: piece.pillar || 'General',
            headline: piece.headline || '',
            adCopyFull: piece.adCopyFull || '',
            videoScriptOrHooks: piece.videoScriptOrHooks || '',
            visualAssetsBrief: piece.visualAssetsBrief || '',
            hashtags: piece.hashtags || [],
            callToAction: piece.callToAction || '',
            engagementTarget: piece.engagementTarget || {},
            weekNumber: Math.floor(index / 7) + 1,
            viralScore: 5
        }));

        if (piecesToInsert.length > 0) {
            await CalendarContentPiece.createMany({
                data: piecesToInsert
            });
        }

        // 4. Log AI Request
        await AiRequestLog.create({ data: {
            calendarId: calendar.id,
            userId: req.user.id,
            inputParameters: req.body,
            aiResponseTimeMs: meta.durationMs || 0,
            totalPiecesGenerated: piecesToInsert.length,
            qualityScore: 0
        } });

        res.status(201).json({
            status: 'success',
            calendar_id: calendar.id,
            message: 'Calendar generated successfully',
            total_pieces: piecesToInsert.length,
            preview_url: `/dashboard/content-calendar/${calendar.id}`
        });

    } catch (err) { next(err); }
};

// UPDATE calendar
exports.updateCalendar = async (req, res, next) => {
    try {
        const ContentCalendar = req.prisma.contentCalendar;
        
        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData._id;

        const calendar = await ContentCalendar.update({ 
            where: { id: req.params.id }, 
            data: updateData 
        });

        res.json({ calendar: { ...calendar, _id: calendar.id } });
    } catch (err) { next(err); }
};

// DELETE calendar
exports.deleteCalendar = async (req, res, next) => {
    try {
        const ContentCalendar = req.prisma.contentCalendar;
        const CalendarContentPiece = req.prisma.calendarContentPiece;
        
        await ContentCalendar.delete({ where: { id: req.params.id } });

        // Delete associated pieces
        await CalendarContentPiece.deleteMany({ where: { calendarId: req.params.id } });

        res.json({ success: true, message: 'Calendar deleted successfully' });
    } catch (err) { next(err); }
};

// GET pieces
exports.getCalendarPieces = async (req, res, next) => {
    try {
        const CalendarContentPiece = req.prisma.calendarContentPiece;
        const pieces = await CalendarContentPiece.findMany({ 
            where: { calendarId: req.params.id }, 
            orderBy: { dateScheduled: 'asc' } 
        });
        
        const mappedPieces = pieces.map(p => ({ ...p, _id: p.id }));
        res.json({ pieces: mappedPieces });
    } catch (err) { next(err); }
};

// UPDATE piece
exports.updateCalendarPiece = async (req, res, next) => {
    try {
        const CalendarContentPiece = req.prisma.calendarContentPiece;
        
        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData._id;

        const piece = await CalendarContentPiece.update({
            where: { id: req.params.pieceId },
            data: updateData
        });

        res.json({ piece: { ...piece, _id: piece.id } });
    } catch (err) { next(err); }
};

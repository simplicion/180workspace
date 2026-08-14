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

        const mappedCalendars = calendars.map(c => {
            let meta = c.metadata || {};
            if (typeof meta === 'string') {
                try { meta = JSON.parse(meta); } catch(e) { meta = {}; }
            }
            return {
                platforms: [],
                contentPillars: [],
                ...c,
                ...meta,
                _id: c.id
            };
        });

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

        // Map _id and metadata for compatibility
        let meta = calendar.metadata || {};
        if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch(e) { meta = {}; }
        }
        const mappedCalendar = { 
            platforms: [], 
            contentPillars: [], 
            ...calendar, 
            ...meta, 
            _id: calendar.id 
        };
        const mappedPieces = pieces.map(p => {
            let tags = [];
            if (p.hashtagsResearched) {
                if (typeof p.hashtagsResearched === 'string') {
                    try { tags = JSON.parse(p.hashtagsResearched); } catch(e) { tags = p.hashtagsResearched.split(',').map(s=>s.trim()); }
                } else if (Array.isArray(p.hashtagsResearched)) {
                    tags = p.hashtagsResearched;
                }
            }
            return {
                ...p,
                _id: p.id,
                hashtags: tags,
                engagementTarget: {
                    estimatedImpressions: p.engagementTargetEstimatedImpressions || 0,
                    estimatedEngagementPercent: p.engagementTargetEstimatedEngagementPercent || 0
                }
            };
        });

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
            companyId: req.user.companyId,
            name: req.body.name || `${req.body.brandName || req.body.brand_name || 'Brand'} Content Calendar`,
            startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
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
            metadata: { 
                aiProviderUsed: meta.provider,
                userId: req.user.id,
                brandName: req.body.brandName || req.body.brand_name || 'Brand',
                industry: req.body.industry || 'General',
                subdomain: req.body.subdomain || 'company',
                targetAudience: req.body.targetAudience || req.body.target_audience || 'General Audience',
                platforms: req.body.platforms || [],
                calendarDuration: req.body.durationWords || req.body.calendar_duration || '1 month',
                frequency: req.body.frequency || 'Weekly',
                timezone: req.body.timezone || 'UTC'
            }
        } });

        // 3. Save Calendar Pieces
        const piecesToInsert = generatedPieces.map((piece, index) => {
            const et = piece.engagementTarget || {};
            return {
                calendarId: calendar.id,
                dateScheduled: piece.dateScheduled ? new Date(piece.dateScheduled) : new Date(),
                platform: piece.platform || 'General',
                contentType: piece.contentType || 'Post',
                pillar: piece.pillar || 'General',
                headline: piece.headline || '',
                adCopyFull: piece.adCopyFull || '',
                videoScriptOrHooks: piece.videoScriptOrHooks || '',
                visualAssetsBrief: piece.visualAssetsBrief || '',
                hashtagsResearched: piece.hashtags ? (Array.isArray(piece.hashtags) ? piece.hashtags.join(', ') : String(piece.hashtags)) : '',
                callToAction: piece.callToAction || '',
                engagementTargetEstimatedImpressions: et.estimatedImpressions ? String(et.estimatedImpressions) : '',
                engagementTargetEstimatedEngagementPercent: et.estimatedEngagementPercent ? parseFloat(et.estimatedEngagementPercent) || 0 : 0,
                engagementTargetEstimatedShares: et.estimatedShares ? String(et.estimatedShares) : '',
                weekNumber: Math.floor(index / 7) + 1,
                viralScore: 5
            };
        });

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
        
        const mappedPieces = pieces.map(p => {
            let tags = [];
            if (p.hashtagsResearched) {
                if (typeof p.hashtagsResearched === 'string') {
                    try { tags = JSON.parse(p.hashtagsResearched); } catch(e) { tags = p.hashtagsResearched.split(',').map(s=>s.trim()); }
                } else if (Array.isArray(p.hashtagsResearched)) {
                    tags = p.hashtagsResearched;
                }
            }
            return {
                ...p,
                _id: p.id,
                hashtags: tags,
                engagementTarget: {
                    estimatedImpressions: p.engagementTargetEstimatedImpressions || 0,
                    estimatedEngagementPercent: p.engagementTargetEstimatedEngagementPercent || 0
                }
            };
        });
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

        if (updateData.hashtags !== undefined) {
            updateData.hashtagsResearched = JSON.stringify(updateData.hashtags);
            delete updateData.hashtags;
        }

        if (updateData.engagementTarget) {
            updateData.engagementTargetEstimatedImpressions = parseInt(updateData.engagementTarget.estimatedImpressions) || 0;
            updateData.engagementTargetEstimatedEngagementPercent = parseFloat(updateData.engagementTarget.estimatedEngagementPercent) || 0;
            delete updateData.engagementTarget;
        }

        // Convert date string back to Date object if needed
        if (updateData.dateScheduled) {
            updateData.dateScheduled = new Date(updateData.dateScheduled);
        }

        const piece = await CalendarContentPiece.update({
            where: { id: req.params.pieceId },
            data: updateData
        });

        // Remap for response
        let tags = [];
        if (piece.hashtagsResearched) {
            if (typeof piece.hashtagsResearched === 'string') {
                try { tags = JSON.parse(piece.hashtagsResearched); } catch(e) { tags = piece.hashtagsResearched.split(',').map(s=>s.trim()); }
            } else if (Array.isArray(piece.hashtagsResearched)) {
                tags = piece.hashtagsResearched;
            }
        }
        
        const mappedPiece = {
            ...piece,
            _id: piece.id,
            hashtags: tags,
            engagementTarget: {
                estimatedImpressions: piece.engagementTargetEstimatedImpressions || 0,
                estimatedEngagementPercent: piece.engagementTargetEstimatedEngagementPercent || 0
            }
        };

        res.json({ piece: mappedPiece });
    } catch (err) { next(err); }
};

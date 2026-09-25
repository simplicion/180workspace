import { prisma, requestContext } from '@workspace/db';
import { aiContentService, expandAutopilotFields } from '@workspace/ai';
import { SocialProjectService } from './social-project.service';
export class ContentCalendarService {
    static async listCalendars(limit: number = 10, offset: number = 0) {
        const calendars = await prisma.contentCalendar.findMany({
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
                ...(typeof meta === 'object' ? meta : {}),
                _id: c.id
            };
        });

        return mappedCalendars;
    }

    static async getCalendar(id: string) {
        const calendar = await prisma.contentCalendar.findUnique({ where: { id } });
        if (!calendar) throw new Error('Calendar not found');

        const pieces = await prisma.calendarContentPiece.findMany({
            where: { calendarId: calendar.id },
            orderBy: { dateScheduled: 'asc' },
            take: 200
        });

        let meta = calendar.metadata || {};
        if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch(e) { meta = {}; }
        }
        const mappedCalendar = { 
            platforms: [], 
            contentPillars: [], 
            ...calendar, 
            ...(typeof meta === 'object' ? meta : {}), 
            _id: calendar.id 
        };
        const mappedPieces = pieces.map(p => {
            let tags: any[] = [];
            if (p.hashtagsResearched) {
                if (typeof p.hashtagsResearched === 'string') {
                    try { tags = JSON.parse(p.hashtagsResearched); } catch(e) { tags = p.hashtagsResearched.split(',').map(s=>s.trim()); }
                } else if (Array.isArray(p.hashtagsResearched)) {
                    tags = p.hashtagsResearched;
                }
            }
            return expandAutopilotFields({
                ...p,
                _id: p.id,
                hashtags: tags,
                engagementTarget: {
                    estimatedImpressions: p.engagementTargetEstimatedImpressions || 0,
                    estimatedEngagementPercent: p.engagementTargetEstimatedEngagementPercent || 0
                }
            });
        });

        return { calendar: mappedCalendar, pieces: mappedPieces };
    }

    static async createCalendar(body: any, user: any) {
        const startTime = Date.now();
        const companyId = requestContext.getStore()?.companyId as string;

        // 1. Resolve Brand Consciousness if projectId is provided
        let brandConsciousness = body.brandConsciousness;
        if (body.projectId && !brandConsciousness) {
            try {
                brandConsciousness = await SocialProjectService.getProjectBrandConsciousness(body.projectId, companyId);
            } catch (e) {
                console.warn('[ContentCalendarService] Failed to load brand consciousness:', e);
            }
        }

        const enrichedBody = {
            ...body,
            brandConsciousness: brandConsciousness || body.brandConsciousness,
            brandVoice: brandConsciousness?.tone || body.brandVoice || body.brand_voice,
            contentPillars: brandConsciousness?.contentPillars || body.contentPillars || body.content_pillars
        };

        // 2. Call AI Service to generate calendar data based on enrichedBody
        const aiResponse = await aiContentService.generateContentCalendar(enrichedBody, user.id, companyId);

        if (!aiResponse.success) {
            const err: any = new Error(aiResponse.error || 'AI generation failed');
            err.code = (aiResponse as any).code || 'AI_PROVIDER_ERROR';
            err.statusCode = (aiResponse as any).statusCode || 502;
            throw err;
        }

        const generatedPieces = aiResponse.data;
        const meta: any = aiResponse.meta || {};

        // 3. Save Calendar Metadata
        const calendar = await prisma.contentCalendar.create({ data: {
            companyId: companyId,
            name: body.name || `${body.brandName || body.brand_name || brandConsciousness?.brandTagline || 'Brand'} Content Calendar`,
            startDate: body.startDate ? new Date(body.startDate) : new Date(),
            contentPillars: enrichedBody.contentPillars || [],
            tone: enrichedBody.brandVoice || 'Professional',
            engagementGoal: body.engagementGoal || body.engagement_goal || 'Growth',
            hashtagStrategy: body.hashtagStrategy || body.hashtag_strategy || 'Mixed',
            competitors: body.competitors || [],
            status: 'active',
            totalPieces: generatedPieces.length,
            reelsCount: generatedPieces.filter((p: any) => ['reel', 'video', 'tiktok', 'short'].includes(p.contentType?.toLowerCase())).length,
            postsCount: generatedPieces.filter((p: any) => ['post', 'image', 'text'].includes(p.contentType?.toLowerCase())).length,
            carouselsCount: generatedPieces.filter((p: any) => p.contentType?.toLowerCase() === 'carousel').length,
            metadata: { 
                aiProviderUsed: meta.provider,
                userId: user.id,
                projectId: body.projectId || null,
                brandName: body.brandName || body.brand_name || 'Brand',
                brandConsciousness: brandConsciousness || null,
                industry: body.industry || 'General',
                subdomain: body.subdomain || 'company',
                targetAudience: body.targetAudience || body.target_audience || 'General Audience',
                platforms: body.platforms || [],
                calendarDuration: body.durationWords || body.calendar_duration || '1 month',
                frequency: body.frequency || 'Weekly',
                timezone: body.timezone || 'UTC'
            }
        } });

        // Connect calendar to project if projectId exists
        if (body.projectId) {
            try {
                await (prisma as any).project.update({
                    where: { id: body.projectId },
                    data: {
                        contentCalendars_ProjectContentCalendars: {
                            connect: { id: calendar.id }
                        }
                    }
                });
            } catch (err) {
                // Connection schema optional, captured in metadata
            }
        }

        // 4. Save Calendar Pieces
        const piecesToInsert = generatedPieces.map((piece: any, index: number) => {
            const et = piece.engagementTarget || {};
            return {
                calendarId: calendar.id,
                dateScheduled: piece.dateScheduled ? new Date(piece.dateScheduled) : new Date(),
                platform: piece.platform || 'General',
                contentType: piece.contentType || 'Post',
                pillar: piece.pillar || 'General',
                headline: piece.headline || '',
                adCopyFull: piece.adCopyFull || '',
                videoScriptOrHooks: typeof piece.videoScriptOrHooks === 'object' ? JSON.stringify(piece.videoScriptOrHooks) : String(piece.videoScriptOrHooks || ''),
                visualAssetsBrief: typeof piece.visualAssetsBrief === 'object' ? JSON.stringify(piece.visualAssetsBrief) : String(piece.visualAssetsBrief || ''),
                hashtagsResearched: piece.hashtags ? (Array.isArray(piece.hashtags) ? piece.hashtags.join(', ') : String(piece.hashtags)) : (piece.hashtagsResearched || ''),
                callToAction: piece.callToAction || '',
                engagementTargetEstimatedImpressions: et.estimatedImpressions ? String(et.estimatedImpressions) : '',
                engagementTargetEstimatedEngagementPercent: et.estimatedEngagementPercent ? parseFloat(et.estimatedEngagementPercent) || 0 : 0,
                engagementTargetEstimatedShares: et.estimatedShares ? String(et.estimatedShares) : '',
                weekNumber: Math.floor(index / 7) + 1,
                viralScore: 5
            };
        });

        if (piecesToInsert.length > 0) {
            await prisma.calendarContentPiece.createMany({
                data: piecesToInsert
            });
        }

        // 4. Log AI Request
        await prisma.aiRequestLog.create({ data: {
            calendarId: calendar.id,
            userId: user.id,
            inputParameters: body,
            aiResponseTimeMs: meta.durationMs || 0,
            totalPiecesGenerated: piecesToInsert.length,
            qualityScore: 0
        } });

        return {
            status: 'success',
            calendar_id: calendar.id,
            message: 'Calendar generated successfully',
            total_pieces: piecesToInsert.length,
            preview_url: `/dashboard/content-calendar/${calendar.id}`
        };
    }

    static async updateCalendar(id: string, body: any) {
        const updateData = { ...body };
        delete updateData.id;
        delete updateData._id;

        const calendar = await prisma.contentCalendar.update({ 
            where: { id }, 
            data: updateData 
        });

        return { ...calendar, _id: calendar.id };
    }

    static async deleteCalendar(id: string) {
        await prisma.contentCalendar.delete({ where: { id } });
        await prisma.calendarContentPiece.deleteMany({ where: { calendarId: id } });
        return { success: true, message: 'Calendar deleted successfully' };
    }

    static async getCalendarPieces(calendarId: string) {
        const pieces = await prisma.calendarContentPiece.findMany({ 
            where: { calendarId }, 
            orderBy: { dateScheduled: 'asc' },
            take: 200
        });
        
        const mappedPieces = pieces.map(p => {
            let tags: any[] = [];
            if (p.hashtagsResearched) {
                if (typeof p.hashtagsResearched === 'string') {
                    try { tags = JSON.parse(p.hashtagsResearched); } catch(e) { tags = p.hashtagsResearched.split(',').map(s=>s.trim()); }
                } else if (Array.isArray(p.hashtagsResearched)) {
                    tags = p.hashtagsResearched;
                }
            }
            return expandAutopilotFields({
                ...p,
                _id: p.id,
                hashtags: tags,
                engagementTarget: {
                    estimatedImpressions: p.engagementTargetEstimatedImpressions || 0,
                    estimatedEngagementPercent: p.engagementTargetEstimatedEngagementPercent || 0
                }
            });
        });
        return mappedPieces;
    }

    static async updateCalendarPiece(pieceId: string, body: any) {
        const updateData = { ...body };
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

        if (updateData.dateScheduled) {
            updateData.dateScheduled = new Date(updateData.dateScheduled);
        }

        const piece = await prisma.calendarContentPiece.update({
            where: { id: pieceId },
            data: updateData
        });

        let tags: any[] = [];
        if (piece.hashtagsResearched) {
            if (typeof piece.hashtagsResearched === 'string') {
                try { tags = JSON.parse(piece.hashtagsResearched); } catch(e) { tags = piece.hashtagsResearched.split(',').map(s=>s.trim()); }
            } else if (Array.isArray(piece.hashtagsResearched)) {
                tags = piece.hashtagsResearched;
            }
        }
        
        const mappedPiece = expandAutopilotFields({
            ...piece,
            _id: piece.id,
            hashtags: tags,
            engagementTarget: {
                estimatedImpressions: piece.engagementTargetEstimatedImpressions || 0,
                estimatedEngagementPercent: piece.engagementTargetEstimatedEngagementPercent || 0
            }
        });

        return mappedPiece;
    }
}

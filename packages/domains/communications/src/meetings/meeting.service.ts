import { prisma as db, requestContext } from '@workspace/db';
import { randomUUID } from 'crypto';

export class MeetingService {
    static async createMeeting(user: any, data: any) {
        const { title } = data;
        const companyId = requestContext.getStore()?.companyId as string;
        const userId = user.id;

        const roomId = `room-${companyId}-${randomUUID().slice(0, 8)}`;

        const log = await db.meetingLog.create({
            data: {

                roomId,
                companyId,
                createdById: userId,
                status: 'active',
                participants: [],
                ...(title ? { title } : {}),
            }
        });

        return { _id: log.id, roomId, title, startedAt: log.startTime, status: log.status };
    }

    static async listRecentMeetings(user: any) {
        const companyId = requestContext.getStore()?.companyId as string;

        const meetings = await db.meetingLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { createdBy: { select: { name: true } } }
        });

        return meetings;
    }

    static async validateRoomAccess(user: any, roomId: string) {
        const userId = user.id;
        const companyId = requestContext.getStore()?.companyId as string;

        let roomCompanyId = null;
        if (roomId.startsWith('room-')) {
            const afterPrefix = roomId.slice('room-'.length);
            const lastDash = afterPrefix.lastIndexOf('-');
            roomCompanyId = lastDash > 0 ? afterPrefix.slice(0, lastDash) : null;
        } else if (roomId.startsWith('ims-') || roomId.startsWith('v-')) {
            const prefixLen = roomId.startsWith('ims-') ? 'ims-'.length : 'v-'.length;
            const afterPrefix = roomId.slice(prefixLen);
            const meetingIdx = afterPrefix.indexOf('-meeting-');
            roomCompanyId = meetingIdx > 0 ? afterPrefix.slice(0, meetingIdx) : null;
        }

        if (roomCompanyId && roomCompanyId !== companyId.toString()) {
            throw new Error('Security Alert: Access denied to external company room');
        }

        const event = await db.calendarEvent.findFirst({
            where: { roomId: roomId },
            include: { attendees: { select: { id: true } } }
        });

        if (event) {
            const isAttendee = event.attendees?.some((a: any) => a.id === userId);
            const isCreator = event.createdById === userId;

            if (!isAttendee && !isCreator) {
                throw new Error('You are not invited to this scheduled meeting');
            }

            return { success: true, type: 'scheduled', title: event.title, meetingId: event.id };
        }

        const company = await db.company.findFirst({ where: { id: companyId } });
        
        let log = await db.meetingLog.findFirst({
            where: { roomId: roomId },
            include: { createdBy: { select: { id: true, name: true } } }
        });

        let isCreator = false;
        if (log) {
            isCreator = log.createdById === userId;
        } else {
            isCreator = true;
        }

        return {
            success: true,
            type: 'adhoc',
            title: log?.title || (company?.name || 'Platform') + ' Native Call',
            isCreator
        };
    }

    static async logJoin(user: any, data: any) {
        const { roomId, meetingId } = data;
        const userId = user.id;
        const companyId = requestContext.getStore()?.companyId as string;

        let log = await db.meetingLog.findFirst({
            where: { roomId, status: 'active' }
        });

        if (!log) {
            log = await db.meetingLog.create({
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

        const participants = Array.isArray(log.participants) ? log.participants as any[] : [];
        const existingParticipant = participants.find(p => p.userId === userId && !p.leaveTime);

        if (!existingParticipant) {
            participants.push({
                userId,
                joinTime: new Date().toISOString()
            });
            await db.meetingLog.update({
                where: { id: log.id },
                data: { participants }
            });
        }

        return { success: true, logId: log.id };
    }

    static async logLeave(user: any, data: any) {
        const { roomId } = data;
        const userId = user.id;

        const log = await db.meetingLog.findFirst({
            where: { roomId, status: 'active' }
        });
        
        if (!log) throw new Error('Active meeting log not found');

        const participants = Array.isArray(log.participants) ? [...(log.participants as any[])] : [];
        const participant = participants.find(p => p.userId === userId && !p.leaveTime);

        if (participant) {
            const leaveTime = new Date();
            participant.leaveTime = leaveTime.toISOString();
            participant.duration = Math.round((leaveTime.getTime() - new Date(participant.joinTime).getTime()) / 1000);
        }

        const activeParticipants = participants.filter(p => !p.leaveTime);
        const updates: any = { participants };
        
        if (activeParticipants.length === 0) {
            updates.status = 'completed';
            updates.endTime = new Date();
        }

        await db.meetingLog.update({
            where: { id: log.id },
            data: updates
        });

        return { success: true };
    }

    static async getLog(user: any, meetingLogId: string) {
        const companyId = requestContext.getStore()?.companyId as string;

        const log = await db.meetingLog.findFirst({
            where: { id: meetingLogId },
            include: { createdBy: { select: { name: true } } }
        });

        if (!log) throw new Error('Meeting log not found');
        return log;
    }

    static async getRoomDetails(user: any, roomId: string) {
        const companyId = requestContext.getStore()?.companyId as string;

        const log = await db.meetingLog.findFirst({
            where: { roomId },
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { name: true, email: true } } }
        });

        if (!log) throw new Error('Meeting details not found');
        return log;
    }

    static async deleteMeeting(user: any, roomId: string) {
        const companyId = requestContext.getStore()?.companyId as string;

        const log = await db.meetingLog.findFirst({
            where: { roomId }
        });

        if (!log) throw new Error('Meeting not found');

        await db.meetingLog.delete({
            where: { id: log.id }
        });

        return { success: true, message: 'Meeting deleted successfully' };
    }

    static async processTranscript(user: any, AIService: any, googleSheetsService: any, data: any) {
        const { roomId, transcript, title, participants } = data;
        const companyId = requestContext.getStore()?.companyId as string;

        if (!transcript || transcript.length < 10) {
            throw new Error('Transcript is too short to process.');
        }

        const settings = await db.settings.findFirst();
        if (!settings) throw new Error('Company settings not found');

        const ps = await db.platformSettings.findFirst();
        const platformName = ps?.platformName || 'System';

        const prompt = `
            Analyze the following meeting transcript for a professional company.
            Meeting Title: ${title || platformName + ' Meeting'}
            Participants: ${(participants || []).join(', ')}
            
            TRANSCRIPT:
            ${transcript}
            
            Provide the analysis in strict JSON format:
            {
                "summary": {
                    "agenda": "Short string describing the agenda",
                    "highlights": ["Point 1", "Point 2"],
                    "decisions": ["Decision 1"],
                    "keywords": ["Keyword1", "Keyword2"]
                },
                "actionItems": [
                    {
                        "title": "Task title (incorporate relevant keywords)",
                        "description": "Task description based on transcript context",
                        "priority": "low|medium|high|critical",
                        "keywords": ["Keyword1"]
                    }
                ]
            }
        `;

        const aiResultStr = await AIService.getInsights(prompt, settings);
        let aiData;
        try {
            const jsonMatch = aiResultStr.match(/\{[\s\S]*\}/);
            aiData = JSON.parse(jsonMatch ? jsonMatch[0] : aiResultStr);
        } catch (err) {
            console.error('AI JSON Parse failed:', aiResultStr);
            throw new Error('Failed to parse AI output');
        }

        if (googleSheetsService && googleSheetsService.appendMeetingSummary) {
            await googleSheetsService.appendMeetingSummary(settings, {
                roomId,
                title,
                date: new Date().toISOString(),
                participants,
                summary: aiData.summary,
                actionItems: aiData.actionItems,
                companyId: companyId.toString()
            });
        }

        if (aiData.actionItems && aiData.actionItems.length > 0) {
            await this.createMeetingTasks(user, aiData.actionItems, title);
        }

        return { message: 'Meeting processed successfully', data: aiData };
    }

    static async createMeetingTasks(user: any, actionItems: any[], meetingTitle: string) {
        try {
            let project = await db.project.findFirst({ 
                where: { name: 'Meeting Notes' } 
            });

            if (!project) {
                project = await db.project.findFirst({ 
                    orderBy: { createdAt: 'desc' } 
                });
            }

            if (!project) {
                console.warn('[MeetingAI] No project found to associate meeting tasks with.');
                return;
            }

            const taskPromises = actionItems.map((item: any) => {
                return db.task.create({ data: {
                    title: item.title,
                    description: `[From Meeting: ${meetingTitle}]\n${item.description}`,
                    priority: item.priority || 'medium',
                    projectId: project.id,
                    creatorId: user.id,
                    status: 'todo'
                } });
            });

            await Promise.all(taskPromises);
        } catch (err) {
            console.error('[MeetingAI] Failed to create meeting tasks:', err);
        }
    }

    static async getSummary(user: any, googleSheetsService: any, roomId: string) {
        const settings = await db.settings.findFirst();
        if (!settings) throw new Error('Settings not found');

        const result = await googleSheetsService.getMeetingSummaryByRoomId(settings, roomId);
        if (!result) throw new Error('Meeting summary not found');

        const companyId = requestContext.getStore()?.companyId as string;
        if (result.roomId.includes('-') && !result.roomId.includes(companyId)) {
            throw new Error('Access denied: Meeting record belongs to another company');
        }

        return result;
    }

    static async saveTranscript(user: any, data: any) {
        const { meetingLogId, text } = data;

        const log = await db.meetingLog.findFirst({
            where: { id: meetingLogId }
        });

        if (!log) throw new Error('Meeting not found');

        const transcript = await db.meetingTranscript.create({
            data: {
                meetingLogId,
                userId: user.id,
                userName: user.name || 'Unknown',
                text,
                isAi: false
            }
        });

        return { success: true, transcript };
    }

    static async getTranscripts(user: any, meetingLogId: string) {
        const log = await db.meetingLog.findFirst({
            where: { id: meetingLogId }
        });

        if (!log) throw new Error('Meeting not found');

        const transcripts = await db.meetingTranscript.findMany({
            where: { meetingLogId },
            orderBy: { timestamp: 'asc' }
        });

        return { transcripts };
    }

    static async chatWithMeetingAI(user: any, AIService: any, data: any) {
        const { meetingLogId, message } = data;

        const settings = await db.settings.findFirst();
        if (!settings) throw new Error('Settings not found');

        const transcripts = await db.meetingTranscript.findMany({
            where: { meetingLogId },
            orderBy: { timestamp: 'asc' }
        });

        const transcriptText = transcripts.map((t: any) => `${t.userName} (${t.timestamp.toISOString()}): ${t.text}`).join('\n');

        const prompt = `
            You are a helpful AI assistant representing a meeting. 
            Below is the live transcript of the meeting so far. 
            Answer the user's question based strictly on this transcript. If the answer is not in the transcript, say so.
            
            TRANSCRIPT:
            ${transcriptText || '(No transcription available yet)'}
            
            USER'S QUESTION:
            ${message}
        `;

        const aiResponse = await AIService.getInsights(prompt, settings);
        return { reply: aiResponse };
    }
}

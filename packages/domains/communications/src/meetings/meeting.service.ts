// @ts-nocheck
export class MeetingService {
    static async processTranscript(db: any, globalDb: any, user: any, AIService: any, googleSheetsService: any, data: any) {
        const { roomId, transcript, title, participants } = data;
        const companyId = user.companyId;

        if (!db) {
            throw new Error('Company database not connected');
        }

        if (!transcript || transcript.length < 10) {
            throw new Error('Transcript is too short to process.');
        }

        const settings = await db.settings.findFirst();

        if (!settings) {
            throw new Error('Company settings not found');
        }

        const ps = await globalDb.platformSettings.findFirst();
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

        // 1. Store in Google Sheets (Company-specific)
        await googleSheetsService.appendMeetingSummary(settings, {
            roomId,
            title,
            date: new Date().toISOString(),
            participants,
            summary: aiData.summary,
            actionItems: aiData.actionItems,
            companyId: companyId.toString()
        });

        // 2. Extract Tasks and save to System (Company-specific)
        if (aiData.actionItems && aiData.actionItems.length > 0) {
            await this.createMeetingTasks(user, db, aiData.actionItems, title);
        }

        return {
            message: 'Meeting processed successfully',
            data: aiData
        };
    }

    static async createMeetingTasks(user: any, db: any, actionItems: any[], meetingTitle: string) {
        try {
            let project = await db.project.findFirst({ where: {
                name: 'Meeting Notes'
            } });

            if (!project) {
                // Fallback to most recent project
                project = await db.project.findFirst({ orderBy: { createdAt: 'desc' } });
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
                    creatorId: user.id, // Task creatorId
                    status: 'todo'
                } });
            });

            await Promise.all(taskPromises);
        } catch (err) {
            console.error('[MeetingAI] Failed to create meeting tasks:', err);
        }
    }

    static async getSummary(db: any, user: any, googleSheetsService: any, roomId: string) {
        if (!db) throw new Error('Company DB not connected');

        const settings = await db.settings.findFirst();
        if (!settings) throw new Error('Settings not found');

        const result = await googleSheetsService.getMeetingSummaryByRoomId(settings, roomId);

        if (!result) {
            throw new Error('Meeting summary not found');
        }

        const companyId = user.companyId.toString();
        if (result.roomId.includes('-') && !result.roomId.includes(companyId)) {
            throw new Error('Access denied: Meeting record belongs to another company');
        }

        return result;
    }

    static async saveTranscript(db: any, user: any, data: any) {
        const { meetingLogId, text } = data;
        if (!db) throw new Error('Company DB not connected');

        const log = await db.meetingLog.findFirst({
            where: { id: meetingLogId, companyId: user.companyId }
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

    static async getTranscripts(db: any, user: any, meetingLogId: string) {
        if (!db) throw new Error('Company DB not connected');

        const log = await db.meetingLog.findFirst({
            where: { id: meetingLogId, companyId: user.companyId }
        });

        if (!log) throw new Error('Meeting not found');

        const transcripts = await db.meetingTranscript.findMany({
            where: { meetingLogId },
            orderBy: { timestamp: 'asc' }
        });

        return { transcripts };
    }

    static async chatWithMeetingAI(db: any, user: any, AIService: any, data: any) {
        const { meetingLogId, message } = data;
        if (!db) throw new Error('Company DB not connected');

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

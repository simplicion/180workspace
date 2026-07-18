'use strict';

const AIService = require('../ai-assistant/ai.service');
const googleSheetsService = require('../../../platform-core/platform-integrations/services/google-sheets.service');

/**
 * Controller for Meeting AI features
 * Handles processing with multi-tenancy awareness
 */
class MeetingAIController {
    /**
     * Process a meeting transcript to generate summary and tasks
     */
    async processTranscript(req, res, next) {
        try {
            const { roomId, transcript, title, participants } = req.body;
            const prisma = req.prisma;
            const companyId = req.user.companyId;

            if (!prisma) {
                return res.status(403).json({ error: 'Tenant database not connected' });
            }

            if (!transcript || transcript.length < 10) {
                return res.status(400).json({ error: 'Transcript is too short to process.' });
            }

            // Fetch tenant settings for Google Sheets and AI provider
            const Settings = prisma.settings;
            const settings = await Settings.findFirst();

            if (!settings) {
                return res.status(404).json({ error: 'Company settings not found' });
            }

            const { prisma: globalPrisma } = require('@workspace/db');
            const ps = await globalPrisma.platformSettings.findFirst();
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
                return res.status(500).json({ error: 'Failed to parse AI output' });
            }

            // 1. Store in Google Sheets (Tenant-specific)
            await googleSheetsService.appendMeetingSummary(settings, {
                roomId,
                title,
                date: new Date().toISOString(),
                participants,
                summary: aiData.summary,
                actionItems: aiData.actionItems,
                companyId: companyId.toString()
            });

            // 2. Extract Tasks and save to System (Tenant-specific)
            if (aiData.actionItems && aiData.actionItems.length > 0) {
                await this.createMeetingTasks(req.user, prisma, aiData.actionItems, title);
            }

            return res.json({
                message: 'Meeting processed successfully',
                data: aiData
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Helper to create tasks from meeting action items
     */
    async createMeetingTasks(user, prisma, actionItems, meetingTitle) {
        try {
            const Project = prisma.project;
            const Task = prisma.task;

            let project = await Project.findFirst({ where: {
                name: 'Meeting Notes'
            } });

            if (!project) {
                // Fallback to most recent project
                project = await Project.findFirst({ orderBy: { createdAt: 'desc' } });
            }

            if (!project) {
                console.warn('[MeetingAI] No project found to associate meeting tasks with.');
                return;
            }

            const taskPromises = actionItems.map(item => {
                return Task.create({ data: {
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

    /**
     * Fetch meeting summary from Google Sheets proxy (Tenant-aware)
     */
    async getSummary(req, res, next) {
        try {
            const { roomId } = req.params;
            const prisma = req.prisma;
            if (!prisma) return res.status(403).json({ error: 'Tenant DB not connected' });

            const Settings = prisma.settings;
            const settings = await Settings.findFirst();
            if (!settings) return res.status(404).json({ error: 'Settings not found' });

            const result = await googleSheetsService.getMeetingSummaryByRoomId(settings, roomId);

            if (!result) {
                return res.status(404).json({ error: 'Meeting summary not found' });
            }

            // Security: Ensure the roomId belongs to this company (if prefix is used)
            const companyId = req.user.companyId.toString();
            if (result.roomId.includes('-') && !result.roomId.includes(companyId)) {
                return res.status(403).json({ error: 'Access denied: Meeting record belongs to another company' });
            }

            return res.json(result);
        } catch (err) {
            next(err);
        }
    }

    /**
     * Save live transcript from frontend
     */
    async saveTranscript(req, res, next) {
        try {
            const { meetingLogId, text } = req.body;
            const prisma = req.prisma;
            if (!prisma) return res.status(403).json({ error: 'Tenant DB not connected' });

            const log = await prisma.meetingLog.findFirst({
                where: { id: meetingLogId, companyId: req.user.companyId }
            });

            if (!log) return res.status(404).json({ error: 'Meeting not found' });

            const transcript = await prisma.meetingTranscript.create({
                data: {
                    meetingLogId,
                    userId: req.user.id,
                    userName: req.user.name || 'Unknown',
                    text,
                    isAi: false
                }
            });

            return res.json({ success: true, transcript });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get all transcripts for a meeting
     */
    async getTranscripts(req, res, next) {
        try {
            const { meetingLogId } = req.params;
            const prisma = req.prisma;
            if (!prisma) return res.status(403).json({ error: 'Tenant DB not connected' });

            const log = await prisma.meetingLog.findFirst({
                where: { id: meetingLogId, companyId: req.user.companyId }
            });

            if (!log) return res.status(404).json({ error: 'Meeting not found' });

            const transcripts = await prisma.meetingTranscript.findMany({
                where: { meetingLogId },
                orderBy: { timestamp: 'asc' }
            });

            return res.json({ transcripts });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Chat with AI about the meeting using the transcript as context
     */
    async chatWithMeetingAI(req, res, next) {
        try {
            const { meetingLogId, message } = req.body;
            const prisma = req.prisma;
            if (!prisma) return res.status(403).json({ error: 'Tenant DB not connected' });

            const Settings = prisma.settings;
            const settings = await Settings.findFirst();
            if (!settings) return res.status(404).json({ error: 'Settings not found' });

            const transcripts = await prisma.meetingTranscript.findMany({
                where: { meetingLogId },
                orderBy: { timestamp: 'asc' }
            });

            const transcriptText = transcripts.map(t => `${t.userName} (${t.timestamp.toISOString()}): ${t.text}`).join('\n');

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

            // Save the user's question and AI's answer in the transcript log if needed?
            // Actually, the user asked for a chat board *about* the meeting, not necessarily saving it to the transcript itself.
            // But we can just return it.
            
            return res.json({ reply: aiResponse });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new MeetingAIController();

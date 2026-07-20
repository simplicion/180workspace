const { redis } = require('../../../system-configs/config/redis.js');
const AIService = require('./ai.service');
const axios = require('axios');
let pdfParse;
try { pdfParse = require('pdf-parse'); } catch (e) {}
let mammoth;
try { mammoth = require('mammoth'); } catch (e) {}

async function getSettingsWithMetadata(req) {
    const settings = await req.prisma.settings.findFirst() || {};
    let metadata = {};
    if (req.user && req.user.companyId) {
        const company = await req.prisma.company.findUnique({ where: { id: req.user.companyId } });
        if (company && company.metadata) {
            metadata = company.metadata;
            if (typeof metadata === 'string') {
                try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
            }
            if (typeof metadata === 'string') {
                try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
            }
        }
    }
    return { ...settings, ...metadata };
}

exports.getDashboardInsights = async (req, res, next) => {
    try {
        const tenantId = req.user.companyId;
        const cacheKey = `ai:dashboard:v3:${tenantId}`;

        if (redis) {
            const cached = await redis.get(cacheKey);
            if (cached) return res.json({ insight: cached });
        }

        const Project = req.prisma.project;
        const Task = req.prisma.task;
        const Settings = req.prisma.settings;

        const [projectCount, taskCount, overdueCount, settings] = await Promise.all([
            Project.count({ where: {status: { not: 'completed' }} }),
            Task.count({ where: {status: { not: 'done' }} }),
            Task.count({ where: {dueDate: { lt: new Date() }, status: { not: 'done' }} }),
            getSettingsWithMetadata(req)
        ]);

        const prompt = `Analyze organizational health. 
Active Projects: ${projectCount}
Pending Tasks: ${taskCount}
Overdue Items: ${overdueCount}
Provide a brief, professional organizational health summary. You MUST limit your response to a maximum of 4 lines (about 2-3 short sentences). Focus on efficiency and urgency.`;

        const insight = await AIService.getInsights(prompt, settings, { max_tokens: 60 });

        if (redis && insight) {
            await redis.set(cacheKey, insight, 'EX', 3600); // 1 hour
        }

        return res.json({ insight });
    } catch (err) {
        next(err);
    }
};

exports.getProjectInsights = async (req, res, next) => {
    try {
        const tenantId = req.user.companyId;
        const projectId = req.params.id;
        const cacheKey = `ai:project:${tenantId}:${projectId}`;

        if (redis) {
            const cached = await redis.get(cacheKey);
            if (cached) return res.json({ insight: cached });
        }

        const Project = req.prisma.project;
        const Settings = req.prisma.settings;

        const [project, settings] = await Promise.all([
            Project.findUnique({ where: { id: req.params.id } }),
            getSettingsWithMetadata(req)
        ]);

        if (!project) return res.status(404).json({ error: 'Project not found' });

        const prompt = `Analyze project risks and progress for project "${project.name}". Description: ${project.description || 'N/A'}. Status: ${project.status}. Provide a concise 2-sentence risk analysis.`;
        const insight = await AIService.getInsights(prompt, settings);

        if (redis && insight) {
            await redis.set(cacheKey, insight, 'EX', 600); // 10 minutes
        }

        return res.json({ insight });
    } catch (err) {
        next(err);
    }
};

exports.getChatSessions = async (req, res, next) => {
    try {
        const AiChatSession = req.prisma.aiChatSession;
        const sessions = await AiChatSession.findMany({
            where: { userId: req.user.id },
            orderBy: { updatedAt: 'desc' },
            select: { id: true, title: true, createdAt: true, updatedAt: true }
        });
        return res.json({ sessions });
    } catch (err) {
        next(err);
    }
};

exports.getChatSession = async (req, res, next) => {
    try {
        const AiChatSession = req.prisma.aiChatSession;
        const session = await AiChatSession.findFirst({
            where: { id: req.params.id, userId: req.user.id },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        
        if (!session) return res.status(404).json({ error: 'Session not found' });
        
        return res.json({ session });
    } catch (err) {
        next(err);
    }
};

exports.deleteChatSession = async (req, res, next) => {
    try {
        const AiChatSession = req.prisma.aiChatSession;
        const session = await AiChatSession.findFirst({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!session) return res.status(404).json({ error: 'Session not found' });

        await AiChatSession.delete({ where: { id: req.params.id } });
        return res.json({ success: true, message: 'Session deleted' });
    } catch (err) {
        next(err);
    }
};

exports.chatWithAI = async (req, res, next) => {
    try {
        const { message, history, sessionId } = req.body;
        const user = req.user;
        const tenantDb = req.prisma;

        const Project = req.prisma.project;
        const Task = req.prisma.task;
        const User = req.prisma.user;
        const Invoice = req.prisma.invoice;
        const Leave = req.prisma.leave;
        const Job = req.prisma.job;
        const JobApplication = req.prisma.jobApplication;
        const Attendance = req.prisma.attendance;
        const Settings = req.prisma.settings;
        const AiChatSession = req.prisma.aiChatSession;
        const AiChatMessage = req.prisma.aiChatMessage;

        // Ensure session exists or create one
        let activeSessionId = sessionId;
        if (!activeSessionId) {
            const title = message.split(' ').slice(0, 5).join(' ') + (message.split(' ').length > 5 ? '...' : '');
            const newSession = await AiChatSession.create({
                data: {
                    userId: user.id,
                    title: title || 'New Chat'
                }
            });
            activeSessionId = newSession.id;
        }

        // Save user message
        await AiChatMessage.create({
            data: {
                sessionId: activeSessionId,
                role: 'user',
                content: message
            }
        });

        // Update session's updatedAt
        await AiChatSession.update({
            where: { id: activeSessionId },
            data: { updatedAt: new Date() }
        });

        // Gather system context
        let contextText = `System Context:\n`;
        contextText += `Current Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
        contextText += `User Name: ${user.name}, Role: ${user.role}, Department: ${user.department || 'N/A'}\n\n`;

        // Role-based data gathering
        if (['admin', 'hr', 'manager'].includes(user.role)) {
            const [
                empCount, activeProjects, pendingTasks,
                openJobs, pendingCandidates, pendingLeaves, unpaidInvoices,
                recentProjects, recentTasks, recentJobs, employees
            ] = await Promise.all([
                User ? User.count({ where: {isActive: true} }) : 0,
                Project ? Project.count({ where: {status: { not: 'completed' }} }) : 0,
                Task ? Task.count({ where: {status: { not: 'done' }} }) : 0,
                Job ? Job.count({ where: {status: 'open'} }) : 0,
                JobApplication ? JobApplication.count({ where: {status: { in: ['applied', 'screening', 'interview'] }} }) : 0,
                Leave ? Leave.count({ where: {status: 'pending'} }) : 0,
                Invoice ? Invoice.count({ where: {status: { in: ['sent', 'overdue'] }} }) : 0,
                Project ? Project.findMany({ where: {status: { not: 'completed' }}, take: 10, select: { name: true, status: true } }) : [],
                Task ? Task.findMany({ where: {status: { not: 'done' }}, take: 10, select: { title: true, status: true } }) : [],
                Job ? Job.findMany({ where: {status: 'open'}, take: 10, select: { title: true, department: true } }) : [],
                User ? User.findMany({ where: {isActive: true}, take: 10, select: { name: true, role: true } }) : []
            ]);
            contextText += `Company Overview:\n- Total Active Employees: ${empCount}\n- Active Projects: ${activeProjects}\n- Pending/In-Progress Tasks: ${pendingTasks}\n- Open Jobs: ${openJobs} (with ${pendingCandidates} pending candidates)\n- Pending Leave Requests: ${pendingLeaves}\n- Unpaid Invoices: ${unpaidInvoices}\n\n`;
            contextText += `Data Samples (max 10 shown):\n`;
            contextText += `- Employees: ${employees.map(e => e.name + ' (' + e.role + ')').join(', ')}\n`;
            contextText += `- Active Projects: ${recentProjects.map(p => p.name + ' [' + p.status + ']').join(', ')}\n`;
            contextText += `- Recent Pending Tasks: ${recentTasks.map(t => t.title + ' [' + t.status + ']').join(', ')}\n`;
            contextText += `- Open Jobs: ${recentJobs.map(j => j.title + ' (' + j.department + ')').join(', ')}\n\n`;
        } else {
            const todayStr = new Date().toISOString().slice(0, 10);
            const [
                myTasks, myProjects, myLeaves, myAttendance,
                recentTasks, recentProjects
            ] = await Promise.all([
                Task ? Task.count({ where: {assigneeId: user.id, status: { not: 'done' }} }) : 0,
                Project ? Project.count({ where: {memberIds: { has: user.id }, status: { not: 'completed' }} }) : 0,
                Leave ? Leave.count({ where: {employeeId: user.id, status: 'pending'} }) : 0,
                Attendance ? Attendance.findFirst({ where: { employeeId: user.id, date: todayStr } }) : null,
                Task ? Task.findMany({ where: {assigneeId: user.id, status: { not: 'done' }}, take: 10, select: { title: true, status: true } }) : [],
                Project ? Project.findMany({ where: {memberIds: { has: user.id }, status: { not: 'completed' }}, take: 10, select: { name: true, status: true } }) : []
            ]);
            const attStatus = myAttendance ? myAttendance.status : 'Not marked yet';
            contextText += `Your Current Status:\n- Your Pending Tasks: ${myTasks}\n- Your Active Projects: ${myProjects}\n- Your Pending Leave Requests: ${myLeaves}\n- Your Attendance Today: ${attStatus}\n\n`;
            contextText += `Your Data Samples (max 10 shown):\n`;
            contextText += `- Active Projects: ${recentProjects.map(p => p.name + ' [' + p.status + ']').join(', ')}\n`;
            contextText += `- Pending Tasks: ${recentTasks.map(t => t.title + ' [' + t.status + ']').join(', ')}\n\n`;
        }

        contextText += `Instructions: You are the helpful AI Assistant for this company. You have access to real-time company data as shown above. Use the provided context to answer the user accurately. Keep your responses structured, professional, yet friendly. Format with Markdown. When giving a company overview, you MUST strictly limit it to a maximum of 4 lines. If the user asks about system specifics not in the context, answer generally and mention you only have summarized stats right now.\n\n`;

        let chatHistory = "Recent Conversation:\n";
        
        // Fetch real history if not provided from frontend
        if (!history || history.length === 0) {
             const recentMessages = await AiChatMessage.findMany({
                 where: { sessionId: activeSessionId },
                 orderBy: { createdAt: 'desc' },
                 take: 6 // get last few messages including the one we just saved
             });
             recentMessages.reverse().slice(0, -1).forEach(msg => {
                 chatHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
             });
        } else if (history && Array.isArray(history)) {
            const recentHistory = history.slice(-5);
            recentHistory.forEach(msg => {
                chatHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
            });
        }

        const finalPrompt = `${contextText}\n${chatHistory}\nUser: ${message}\nAssistant:`;

        const settings = await getSettingsWithMetadata(req);
        const reply = await AIService.getInsights(finalPrompt, settings);
        
        // Save assistant message
        await AiChatMessage.create({
            data: {
                sessionId: activeSessionId,
                role: 'assistant',
                content: reply
            }
        });

        return res.json({ reply, sessionId: activeSessionId });
    } catch (err) {
        next(err);
    }
};

exports.analyzeDocument = async (req, res, next) => {
    try {
        const { documentId, message, summarizeOnly, history } = req.body;
        const Document = req.prisma.document;
        const Settings = req.prisma.settings;

        const [doc, settings] = await Promise.all([
            Document.findUnique({ where: { id: documentId } }),
            getSettingsWithMetadata(req)
        ]);

        if (!doc) return res.status(404).json({ error: 'Document not found' });

        let content = "";

        if (doc.storageType === 'google_drive') {
            try {
                // Pass settings to drive service if it needs tenant-specific credentials
                content = await googleDriveService.getFileContent(doc.fileId, settings);
            } catch (err) {
                console.warn('Failed to fetch from Drive, falling back to summary of meta:', err.message);
                content = `Document Name: ${doc.name}\nDescription: ${doc.description || 'None'}`;
            }
        } else if (doc.fileUrl) {
            try {
                let fileUrl = doc.fileUrl;
                if (!fileUrl.startsWith('http')) {
                    fileUrl = `http://localhost:${process.env.PORT || 4000}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
                }
                const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);
                
                if (doc.fileUrl.endsWith('.pdf') && pdfParse) {
                    const pdfData = await pdfParse(buffer);
                    content = pdfData.text;
                } else if (doc.fileUrl.endsWith('.docx') && mammoth) {
                    const result = await mammoth.extractRawText({ buffer: buffer });
                    content = result.value;
                } else if (doc.fileUrl.endsWith('.html') || doc.fileType === 'link' || doc.fileType === 'html') {
                    content = buffer.toString('utf-8');
                    content = content.replace(/<[^>]*>?/gm, ' ');
                } else {
                    content = buffer.toString('utf-8');
                }
                content = content.slice(0, 30000); // Limit to ~30k characters for context
            } catch (err) {
                console.warn('Failed to fetch/parse file content:', err.message);
                content = `Document Name: ${doc.name}\nDescription: ${doc.description || 'None'}\nType: ${doc.fileType}`;
            }
        } else {
            content = `Document Name: ${doc.name}\nDescription: ${doc.description || 'None'}\nType: ${doc.fileType}`;
        }

        let chatHistory = "";
        if (history && Array.isArray(history) && history.length > 0) {
            chatHistory = "RECENT CONVERSATION HISTORY:\n";
            const recentHistory = history.slice(-6); // last few messages
            recentHistory.forEach(msg => {
                chatHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
            });
            chatHistory += "\n";
        }

        const prompt = summarizeOnly
            ? `Please provide a concise, professional summary (3-5 bullet points) of the following document content:\n\n${content}`
            : `You are a document assistant. Based on the following document content, answer the user's question accurately.\n\nDOCUMENT CONTENT:\n${content}\n\n${chatHistory}USER QUESTION: ${message}`;

        const reply = await AIService.getInsights(prompt, settings);
        return res.json({ reply });
    } catch (err) {
        next(err);
    }
};

exports.generateEmailDraft = async (req, res, next) => {
    try {
        const { idea, recipientName, tone = 'professional', context = '' } = req.body;
        const Settings = req.prisma.settings;
        const settings = await getSettingsWithMetadata(req);

        const prompt = `You are an expert business communicator and professional email writer. 
Your goal is to draft a high-quality email based on the user's requirements.

RECIPIENT: ${recipientName || 'Valued Recipient'}
TONE: ${tone}
CONTEXT/GOAL: ${idea}
ADDITIONAL CONTEXT: ${context}

Draft the email with a clear subject line and a professional body. Use [Placeholder] for any missing info. No extra talk, just the email draft.`;

        const draft = await AIService.getInsights(prompt, settings);
        return res.json({ draft });
    } catch (err) {
        next(err);
    }
};

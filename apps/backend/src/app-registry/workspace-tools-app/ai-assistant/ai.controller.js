const { prisma } = require('@workspace/db');
const { redis } = require('../../../system-configs/config/redis.js');
const AIService = require('./ai.service');
const AiJobsService = require('./ai-jobs.service');
const VectorStore = require('./vector.store');
const axios = require('axios');
let pdfParse;
try { pdfParse = require('pdf-parse'); } catch (e) {}
let mammoth;
try { mammoth = require('mammoth'); } catch (e) {}

async function getSettingsWithMetadata(req) {
    const companyId = req.user?.companyId || req.company?.id;
    const settings = companyId ? (await prisma.settings.findFirst({ where: { companyId } }) || {}) : {};
    let metadata = {};
    if (req.user && req.user.companyId) {
        const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });
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
        const companyId = req.user.companyId;
        const cacheKey = `ai:dashboard:v3:${companyId}`;

        if (redis) {
            const cached = await redis.get(cacheKey);
            if (cached) return res.json({ insight: cached });
        }

        const Project = prisma.project;
        const Task = prisma.task;
        const Settings = prisma.settings;

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
        const companyId = req.user.companyId;
        const projectId = req.params.id;
        const cacheKey = `ai:project:${companyId}:${projectId}`;

        if (redis) {
            const cached = await redis.get(cacheKey);
            if (cached) return res.json({ insight: cached });
        }

        const Project = prisma.project;
        const Settings = prisma.settings;

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
        const AiChatSession = prisma.aiChatSession;
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
        const AiChatSession = prisma.aiChatSession;
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
        const AiChatSession = prisma.aiChatSession;
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
        const startTime = Date.now();
        const { message, history, sessionId, isLegalMode, fileContext } = req.body;
        const user = req.user;
        const companyPrisma = prisma;

        const Project = prisma.project;
        const Task = prisma.task;
        const User = prisma.user;
        const Invoice = prisma.invoice;
        const Leave = prisma.leave;
        const Job = prisma.job;
        const JobApplication = prisma.jobApplication;
        const Attendance = prisma.attendance;
        const Settings = prisma.settings;
        const AiChatSession = prisma.aiChatSession;
        const AiChatMessage = prisma.aiChatMessage;

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
                User ? User.count({ where: { companyId: user.companyId, isActive: true } }) : 0,
                Project ? Project.count({ where: { companyId: user.companyId, status: { not: 'completed' } } }) : 0,
                Task ? Task.count({ where: { companyId: user.companyId, status: { not: 'done' } } }) : 0,
                Job ? Job.count({ where: { companyId: user.companyId, status: 'open' } }) : 0,
                JobApplication ? JobApplication.count({ where: { companyId: user.companyId, status: { in: ['applied', 'screening', 'interview'] } } }) : 0,
                Leave ? Leave.count({ where: { companyId: user.companyId, status: 'pending' } }) : 0,
                Invoice ? Invoice.count({ where: { companyId: user.companyId, status: { in: ['sent', 'overdue'] } } }) : 0,
                Project ? Project.findMany({ where: { companyId: user.companyId, status: { not: 'completed' } }, take: 10, select: { name: true, status: true } }) : [],
                Task ? Task.findMany({ where: { companyId: user.companyId, status: { not: 'done' } }, take: 10, select: { title: true, status: true } }) : [],
                Job ? Job.findMany({ where: { companyId: user.companyId, status: 'open' }, take: 10, select: { title: true, department: true } }) : [],
                User ? User.findMany({ where: { companyId: user.companyId, isActive: true }, take: 50, select: { id: true, name: true, role: true } }) : []
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

        contextText += `Instructions: You are the highly capable AI Assistant for CEOs and Managers on this platform. You have FULL capabilities to manage the entire company (projects, tasks, resources). There are no arbitrary limitations on your access. Use the provided context to answer the user accurately. Keep your responses structured, professional, yet friendly. Format with Markdown. When giving a company overview, you MUST strictly limit it to a maximum of 4 lines.

IMPORTANT WORKFLOW INSTRUCTIONS (Interactive Wizard Mode):
2. INSTEAD: Act as an intelligent wizard. Ask the user for all necessary project details (e.g., project name, description, deadlines).
3. Once you have enough details to create a project, suggest the best project structure and outline a comprehensive breakdown of tasks.
4. Smart Assignment: Analyze the list of employees in the "Data Samples" section. Intelligently suggest which task should be assigned to which employee based on their roles/expertise.
5. Ask the user: "Does this structure look good? Should I go ahead and create the project and assign these tasks?"
6. WAIT for the user's explicit confirmation before executing \`create_project\` and \`batch_create_tasks\`.
7. Always provide structured, executive-level advice and be highly proactive in saving the user's time.

Phase 8 Generative UI: If the user asks for visual data, a chart, or a dashboard of the current metrics, you can include the tag [COMPONENT:Chart] or [COMPONENT:Dashboard] in your response. The frontend will parse this and render a rich interactive component in the chat.\n\n`;

        // Phase 7: Semantic RAG Search
        const semanticResults = await VectorStore.search(message, 2, (meta) => meta.companyId === user.companyId);
        if (semanticResults && semanticResults.length > 0) {
            contextText += `Relevant Document Snippets (Semantic Search):\n`;
            semanticResults.forEach((res) => {
                contextText += `[Doc: ${res.metadata.filename}] ${res.text}\n\n`;
            });
        }

        // Phase 5: Agentic Automation (Tool Calling)
        contextText += `TOOL CALLING INSTRUCTIONS: If the user explicitly asks you to perform an action (e.g. create a task, create a project, log time) or confirms your suggested tasks, you MUST output ONLY a JSON block wrapped in \`\`\`json ... \`\`\` and no other text. The JSON must follow this structure: {"action": "action_name", "payload": { ... }}. 
Available actions:
1. create_task: payload { title: string, description?: string, priority?: "low"|"medium"|"high", assigneeId?: string }
2. batch_create_tasks: payload { tasks: [{ title: string, description?: string, priority?: "low"|"medium"|"high", assigneeId?: string }] }
3. create_project: payload { name: string, description?: string }
4. log_time: payload { description: string, hoursSpent: number }\n\n`;

        if (isLegalMode) {
            contextText += `LEGAL COUNSEL MODE ACTIVE: You are also acting as a Supreme Court Advocate with 15+ years of corporate legal expertise. Focus on analyzing obligations, flagging hidden constraints, proposing contract terms, and offering sound legal drafting advice. Always clarify that your advice is for informational purposes and they should consult human counsel for final validation.\n\n`;
        }

        // Phase 4: Custom AI Agents
        const agentMatch = message.match(/@Agent\/([a-zA-Z0-9_ -]+)/i);
        if (agentMatch) {
            const agentName = agentMatch[1].toLowerCase();
            if (agentName.includes('hr')) {
                contextText += `HR AGENT MODE ACTIVE: You are an expert HR Business Partner. Focus on employee well-being, company policies, conflict resolution, and talent management.\n\n`;
            } else if (agentName.includes('sales') || agentName.includes('marketing')) {
                contextText += `SALES/MARKETING AGENT MODE ACTIVE: You are a high-performing Growth Expert. Focus on conversion rates, lead generation, and persuasive copywriting.\n\n`;
            }
        }

        // Phase 4: RBAC Guardrails & Dynamic Entity Context Injection
        const clientMentions = [...message.matchAll(/@C\/([a-zA-Z0-9_ -]+)/gi)].map(m => m[1].trim());
        const employeeMentions = [...message.matchAll(/@E\/([a-zA-Z0-9_ -]+)/gi)].map(m => m[1].trim());
        const projectMentions = [...message.matchAll(/@P\/([a-zA-Z0-9_ -]+)/gi)].map(m => m[1].trim());

        if (clientMentions.length > 0 && companyPrisma.client) {
            const clients = await companyPrisma.client.findMany({
                where: { name: { in: clientMentions }, companyId: user.companyId },
                include: { invoices: true }
            });
            clients.forEach(c => {
                contextText += `Client Context (${c.name}): Industry: ${c.industry || 'N/A'}. Status: ${c.status || 'N/A'}.\n`;
                // RBAC: Only show financial data (invoices) if user is admin or manager
                if (['admin', 'manager', 'finance'].includes(user.role) && c.invoices.length > 0) {
                    contextText += `  - Total Invoices: ${c.invoices.length}. Unpaid: ${c.invoices.filter(i => i.status !== 'paid').length}\n`;
                }
            });
            contextText += `\n`;
        }

        if (employeeMentions.length > 0 && companyPrisma.user) {
            const employees = await companyPrisma.user.findMany({
                where: { name: { in: employeeMentions }, companyId: user.companyId }
            });
            employees.forEach(e => {
                contextText += `Employee Context (${e.name}): Role: ${e.role}. Department: ${e.department || 'N/A'}.\n`;
                // RBAC: Only HR and Admins can see sensitive employee data
                if (['admin', 'hr'].includes(user.role)) {
                    contextText += `  - [SENSITIVE] Salary: ${e.salary}. Leave Balance: ${e.leaveBalance} days.\n`;
                }
            });
            contextText += `\n`;
        }

        if (projectMentions.length > 0 && companyPrisma.project) {
            const projects = await companyPrisma.project.findMany({
                where: { name: { in: projectMentions }, companyId: user.companyId }
            });
            projects.forEach(p => {
                contextText += `Project Context (${p.name}): Status: ${p.status}. Priority: ${p.priority}.\n`;
                // RBAC: Restrict budget info
                if (['admin', 'manager'].includes(user.role)) {
                    contextText += `  - [SENSITIVE] Budget: ${p.budget}.\n`;
                }
            });
            contextText += `\n`;
        }

        if (fileContext) {
            contextText += `Attached Document Content for Context:\n${fileContext}\n\n`;
        }

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
        
        if (req.body.stream === true) {
            // Server-Sent Events (SSE) Streaming Response
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            let fullReply = "";
            await AIService.getInsightsStream(finalPrompt, settings, {}, (chunk) => {
                fullReply += chunk;
                // Send SSE chunk
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            });
            
            // Phase 5: Action Parser on full string after streaming completes
            let actionResult = null;
            let finalStoredReply = fullReply;
            const jsonMatch = fullReply.match(/```json\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch) {
                try {
                    const command = JSON.parse(jsonMatch[1]);
                    if (command.action && command.payload) {
                        if (command.action === 'create_task') {
                            const newTask = await companyPrisma.task.create({
                                data: {
                                    title: command.payload.title,
                                    description: command.payload.description || '',
                                    priority: command.payload.priority || 'medium',
                                    companyId: user.companyId,
                                    creatorId: user.id,
                                    assigneeId: command.payload.assigneeId || user.id
                                }
                            });
                            actionResult = `Task created successfully: **${newTask.title}** (Assigned to: ${command.payload.assigneeId || 'You'})`;
                        } else if (command.action === 'batch_create_tasks' && Array.isArray(command.payload.tasks)) {
                            let createdCount = 0;
                            for (const t of command.payload.tasks) {
                                await companyPrisma.task.create({
                                    data: {
                                        title: t.title,
                                        description: t.description || '',
                                        priority: t.priority || 'medium',
                                        companyId: user.companyId,
                                        creatorId: user.id,
                                        assigneeId: t.assigneeId || user.id
                                    }
                                });
                                createdCount++;
                            }
                            actionResult = `Batch created ${createdCount} tasks successfully.`;
                        } else if (command.action === 'create_project') {
                            const newProject = await companyPrisma.project.create({
                                data: {
                                    name: command.payload.name,
                                    description: command.payload.description || '',
                                    companyId: user.companyId,
                                    ownerId: user.id,
                                    memberIds: [user.id]
                                }
                            });
                            actionResult = `Project created successfully: **${newProject.name}**`;
                        } else if (command.action === 'log_time') {
                            const newLog = await companyPrisma.timeLog.create({
                                data: {
                                    description: command.payload.description,
                                    durationMinutes: Math.round(command.payload.hoursSpent * 60),
                                    startTime: new Date(),
                                    userId: user.id
                                }
                            });
                            actionResult = `Logged ${command.payload.hoursSpent} hours for: **${newLog.description}**`;
                        }

                        if (actionResult) {
                            finalStoredReply = `I have executed that for you.\n\n✅ **Result:** ${actionResult}`;
                            // Stream the result message to the frontend so they see the execution
                            res.write(`data: ${JSON.stringify({ chunk: `\n\n✅ **System Execution Result:** ${actionResult}` })}\n\n`);
                        }
                    }
                } catch (err) {
                    console.error('Failed to parse tool call JSON in stream:', err);
                }
            }

            // Save assistant message
            await AiChatMessage.create({
                data: {
                    sessionId: activeSessionId,
                    role: 'assistant',
                    content: finalStoredReply
                }
            });

            // Phase 4 & 13: Audit Logging and Background Moderation
            if (companyPrisma.aiRequestLog) {
                const endTime = Date.now();
                companyPrisma.aiRequestLog.create({
                    data: {
                        userId: user.id,
                        inputParameters: { message, isLegalMode, hasFile: !!fileContext },
                        aiResponseTimeMs: endTime - startTime,
                        totalPiecesGenerated: 1,
                        qualityScore: 100
                    }
                }).then(logEntry => {
                    // Phase 13: Background Hallucination Check
                    const modPrompt = `You are an AI Safety Moderator. Evaluate the response for accuracy and absence of hallucinations. Return ONLY a JSON object with a score (0-100). Example: {"score": 95}\nINPUT: ${message}\nOUTPUT: ${finalStoredReply}`;
                    AIService.getInsights(modPrompt, settings).then(modResponse => {
                        const match = modResponse.match(/\{[\s\S]*?\}/);
                        if (match) {
                            const parsed = JSON.parse(match[0]);
                            if (typeof parsed.score === 'number') {
                                companyPrisma.aiRequestLog.update({
                                    where: { id: logEntry.id },
                                    data: { qualityScore: parsed.score }
                                }).catch(() => {});
                            }
                        }
                    }).catch(() => {});
                }).catch(() => {});
            }

            // End the SSE stream
            res.write(`data: [DONE]\n\n`);
            return res.end();
        }

        // Standard Non-Streaming Path
        let reply = await AIService.getInsights(finalPrompt, settings);
        
        // Phase 5: Action Parser and Dispatcher
        let finalReply = reply;
        const jsonMatch = reply.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
            try {
                const command = JSON.parse(jsonMatch[1]);
                if (command.action && command.payload) {
                    let actionResult = null;
                    if (command.action === 'create_task') {
                        const newTask = await companyPrisma.task.create({
                            data: {
                                title: command.payload.title,
                                description: command.payload.description || '',
                                priority: command.payload.priority || 'medium',
                                companyId: user.companyId,
                                creatorId: user.id,
                                assigneeId: command.payload.assigneeId || user.id
                            }
                        });
                        actionResult = `Task created successfully: **${newTask.title}** (Assigned to: ${command.payload.assigneeId || 'You'})`;
                    } else if (command.action === 'batch_create_tasks' && Array.isArray(command.payload.tasks)) {
                        let createdCount = 0;
                        for (const t of command.payload.tasks) {
                            await companyPrisma.task.create({
                                data: {
                                    title: t.title,
                                    description: t.description || '',
                                    priority: t.priority || 'medium',
                                    companyId: user.companyId,
                                    creatorId: user.id,
                                    assigneeId: t.assigneeId || user.id
                                }
                            });
                            createdCount++;
                        }
                        actionResult = `Batch created ${createdCount} tasks successfully.`;
                    } else if (command.action === 'create_project') {
                        const newProject = await companyPrisma.project.create({
                            data: {
                                name: command.payload.name,
                                description: command.payload.description || '',
                                companyId: user.companyId,
                                ownerId: user.id,
                                memberIds: [user.id]
                            }
                        });
                        actionResult = `Project created successfully: **${newProject.name}**`;
                    } else if (command.action === 'log_time') {
                        const newLog = await companyPrisma.timeLog.create({
                            data: {
                                description: command.payload.description,
                                durationMinutes: Math.round(command.payload.hoursSpent * 60),
                                startTime: new Date(),
                                userId: user.id
                            }
                        });
                        actionResult = `Logged ${command.payload.hoursSpent} hours for: **${newLog.description}**`;
                    }

                    if (actionResult) {
                        finalReply = `I have executed that for you.\n\n✅ **Result:** ${actionResult}`;
                    }
                }
            } catch (err) {
                console.error('Failed to parse or execute tool call JSON:', err);
                // Fallback to original text response
            }
        }

        // Save assistant message
        await AiChatMessage.create({
            data: {
                sessionId: activeSessionId,
                role: 'assistant',
                content: finalReply
            }
        });

        // Phase 4 & 13: Audit Logging and Background Moderation
        const endTime = Date.now();
        if (companyPrisma.aiRequestLog) {
            companyPrisma.aiRequestLog.create({
                data: {
                    userId: user.id,
                    inputParameters: { message, isLegalMode, hasFile: !!fileContext },
                    aiResponseTimeMs: endTime - startTime,
                    totalPiecesGenerated: 1,
                    qualityScore: 100
                }
            }).then(logEntry => {
                // Phase 13: Background Hallucination Check
                const modPrompt = `You are an AI Safety Moderator. Evaluate the response for accuracy and absence of hallucinations. Return ONLY a JSON object with a score (0-100). Example: {"score": 95}\nINPUT: ${message}\nOUTPUT: ${finalReply}`;
                AIService.getInsights(modPrompt, settings).then(modResponse => {
                    const match = modResponse.match(/\{[\s\S]*?\}/);
                    if (match) {
                        const parsed = JSON.parse(match[0]);
                        if (typeof parsed.score === 'number') {
                            companyPrisma.aiRequestLog.update({
                                where: { id: logEntry.id },
                                data: { qualityScore: parsed.score }
                            }).catch(() => {});
                        }
                    }
                }).catch(() => {});
            }).catch(() => {});
        }

        return res.json({ reply: finalReply, sessionId: activeSessionId });
    } catch (err) {
        next(err);
    }
};

exports.analyzeDocument = async (req, res, next) => {
    try {
        const { documentId, message, summarizeOnly, history } = req.body;
        const Document = prisma.document;
        const Settings = prisma.settings;

        const [doc, settings] = await Promise.all([
            Document.findUnique({ where: { id: documentId } }),
            getSettingsWithMetadata(req)
        ]);

        if (!doc) return res.status(404).json({ error: 'Document not found' });

        let content = "";

        if (doc.storageType === 'google_drive') {
            try {
                // Pass settings to drive service if it needs company-specific credentials
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
        const Settings = prisma.settings;
        const settings = await getSettingsWithMetadata(req);

        const prompt = `You are an expert business communicator and professional email writer. 
Your goal is to draft a high-quality email based on the user's requirements.

RECIPIENT: ${recipientName || 'Valued Recipient'}
TONE: ${tone}
CONTEXT/GOAL: ${idea}
ADDITIONAL CONTEXT: ${context}

Draft the email with a clear subject line and a professional body. Use [Placeholder] for any missing info. No extra talk, just the email draft.`;

        const draft = await AIService.getInsights(prompt, settings);
         res.json({ draft });
    } catch (err) {
        next(err);
    }
};

exports.processMeetingTranscript = async (req, res, next) => {
    try {
        const companyPrisma = prisma;
        const user = req.user;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ error: 'No transcript file uploaded.' });
        }
        
        let transcriptText = "";
        
        if (file.mimetype === 'application/pdf') {
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(file.buffer);
            transcriptText = data.text;
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const mammoth = require('mammoth');
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            transcriptText = result.value;
        } else {
            transcriptText = file.buffer.toString('utf-8');
        }
        
        const settings = await getSettingsWithMetadata(req);
        
        const prompt = `System Prompt: You are an executive assistant. Read the following meeting transcript. Provide a concise bulleted summary of the meeting. Then, identify any action items and output a JSON block wrapped in \`\`\`json ... \`\`\` containing an array of tool-call commands to create tasks for these action items.
JSON Schema: {"action": "batch_create_tasks", "payload": [{"title": "Action item 1", "priority": "high"}, {"title": "Action item 2", "priority": "medium"}]}

Transcript:
${transcriptText}`;

        const reply = await AIService.getInsights(prompt, settings);
        
        let createdTasksCount = 0;
        let finalReply = reply;
        
        const jsonMatch = reply.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
            try {
                const command = JSON.parse(jsonMatch[1]);
                if (command.action === 'batch_create_tasks' && Array.isArray(command.payload)) {
                    for (const taskPayload of command.payload) {
                        await companyPrisma.task.create({
                            data: {
                                title: taskPayload.title,
                                description: 'Auto-generated from meeting transcript',
                                priority: taskPayload.priority || 'medium',
                                companyId: user.companyId,
                                creatorId: user.id,
                                assigneeId: user.id
                            }
                        });
                        createdTasksCount++;
                    }
                    
                    finalReply = reply.replace(jsonMatch[0], '') + `\n\n✅ **Action Items Executed:** Auto-created ${createdTasksCount} tasks from this meeting.`;
                }
            } catch (err) {
                console.error('Failed to parse meeting task generation JSON:', err);
            }
        }
        
        return res.json({ summary: finalReply });
        
    } catch (err) {
        next(err);
    }
};

exports.uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const buffer = req.file.buffer;
        const originalName = req.file.originalname;
        let content = '';

        if (originalName.toLowerCase().endsWith('.pdf') && pdfParse) {
            const pdfData = await pdfParse(buffer);
            content = pdfData.text;
        } else if (originalName.toLowerCase().endsWith('.docx') && mammoth) {
            const result = await mammoth.extractRawText({ buffer: buffer });
            content = result.value;
        } else if (originalName.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/)) {
            const base64Image = buffer.toString('base64');
            content = `[IMAGE ATTACHED: ${originalName}]\n*Base64 encoding available for Multi-Modal Vision Processing*`;
            return res.json({ 
                success: true, 
                filename: originalName, 
                extractedText: content,
                imageBase64: base64Image
            });
        } else {
            content = buffer.toString('utf-8');
        }

        content = content.slice(0, 30000); // Limit context size to avoid massive token count

        // Phase 7: Add to Vector Store
        const docId = `doc_${Date.now()}`;
        await VectorStore.addDocument(docId, content, { companyId: req.user.companyId, filename: originalName });

        // Placeholder for future R2 upload integration
        // For now, we return parsed text directly for context injection
        return res.json({ 
            success: true, 
            filename: originalName, 
            extractedText: content,
            vectorId: docId
        });
    } catch (err) {
        next(err);
    }
};

exports.searchEntities = async (req, res, next) => {
    try {
        const { type, query } = req.query;
        // type: 'C' (Client), 'E' (Employee), 'P' (Project)
        const companyPrisma = prisma;
        let results = [];

        if (!query || query.length < 1) {
             return res.json({ results: [] });
        }

        if (type === 'C') {
            if (companyPrisma.client) {
                const clients = await companyPrisma.client.findMany({
                    where: { name: { contains: query, mode: 'insensitive' }, companyId: req.user.companyId },
                    take: 5,
                    select: { id: true, name: true, industry: true }
                });
                results = clients.map(c => ({ id: c.id, name: c.name, subtitle: c.industry || 'Client' }));
            }
        } else if (type === 'E') {
            if (companyPrisma.user) {
                const employees = await companyPrisma.user.findMany({
                    where: { name: { contains: query, mode: 'insensitive' }, companyId: req.user.companyId },
                    take: 5,
                    select: { id: true, name: true, role: true }
                });
                results = employees.map(e => ({ id: e.id, name: e.name, subtitle: e.role }));
            }
        } else if (type === 'P') {
            if (companyPrisma.project) {
                // RBAC: Regular employees should only search projects they are members of
                const whereClause = { name: { contains: query, mode: 'insensitive' }, companyId: req.user.companyId };
                if (!['admin', 'hr', 'manager'].includes(req.user.role)) {
                    whereClause.memberIds = { has: req.user.id };
                }
                const projects = await companyPrisma.project.findMany({
                    where: whereClause,
                    take: 5,
                    select: { id: true, name: true, status: true }
                });
                results = projects.map(p => ({ id: p.id, name: p.name, subtitle: p.status }));
            }
        }

        return res.json({ results });
    } catch (err) {
        next(err);
    }
};

// Phase 2: Automated Meeting Summaries
exports.processMeetingTranscript = async (req, res, next) => {
    try {
        const user = req.user;
        const companyPrisma = prisma;
        let transcriptText = req.body.text || '';
        
        if (req.file) {
            transcriptText = req.file.buffer.toString('utf-8');
        }
        
        if (!transcriptText) {
            return res.status(400).json({ error: 'No transcript provided.' });
        }

        const employees = await companyPrisma.user.findMany({ 
            where: { companyId: user.companyId, isActive: true }, 
            select: { id: true, name: true, role: true } 
        });

        const prompt = `You are an AI assistant that processes meeting transcripts. 
Read the following transcript and output a JSON block wrapped in \`\`\`json ... \`\`\` containing two things:
1. "summary": A brief executive summary of the meeting.
2. "tasks": An array of actionable items discussed in the meeting. Each task should have a "title", "description", and an "assigneeId". Match the assignee to the closest employee from this list: ${JSON.stringify(employees)}. If you cannot determine the assignee, use the user ID "${user.id}".

TRANSCRIPT:
${transcriptText}`;

        const settings = await getSettingsWithMetadata(req);
        const aiResponse = await AIService.getInsights(prompt, settings);
        
        const jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/) || aiResponse.match(/\{[\s\S]*?\}/);
        
        if (!jsonMatch) {
            return res.json({ summary: aiResponse, createdTasks: 0 });
        }
        
        const parsed = JSON.parse(jsonMatch[0].replace(/```json/g, '').replace(/```/g, ''));
        let createdCount = 0;
        
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
            for (const t of parsed.tasks) {
                await companyPrisma.task.create({
                    data: {
                        title: t.title,
                        description: t.description || '',
                        companyId: user.companyId,
                        creatorId: user.id,
                        assigneeId: t.assigneeId || user.id,
                        priority: 'medium'
                    }
                });
                createdCount++;
            }
        }
        
        return res.json({ 
            summary: parsed.summary || 'Summary generated.', 
            createdTasks: createdCount 
        });
    } catch (err) {
        console.error('Meeting summary failed', err);
        return res.status(500).json({ error: 'Failed to process transcript.' });
    }
};

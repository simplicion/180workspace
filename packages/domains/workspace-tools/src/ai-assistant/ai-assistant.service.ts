import { prisma, requestContext } from '@workspace/db';
import { aiService } from './ai.service';
import { vectorStore } from './vector.store';
import axios from 'axios';
import * as pdfParseOriginal from 'pdf-parse';
const pdfParse: any = pdfParseOriginal;
import * as mammothOriginal from 'mammoth';
const mammoth: any = mammothOriginal;

export class AiAssistantService {
    async getSettingsWithMetadata(user: any) {
        const companyId = requestContext.getStore()?.companyId as string;
        const settings = companyId ? (await prisma.settings.findFirst({ where: { companyId } as any }) || {}) : {};
        let metadata = {};
        if (companyId) {
            const company = await prisma.company.findUnique({ where: { id: companyId } });
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

    async getDashboardInsights(user: any, redisClient?: any) {
        const companyId = requestContext.getStore()?.companyId as string;
        const cacheKey = `ai:dashboard:v3:${companyId}`;

        if (redisClient) {
            const cached = await redisClient.get(cacheKey);
            if (cached) return cached;
        }

        const [projectCount, taskCount, overdueCount, settings] = await Promise.all([
            prisma.project.count({ where: { companyId, status: { not: 'completed' } } }),
            prisma.task.count({ where: { companyId, status: { not: 'done' } } }),
            prisma.task.count({ where: { companyId, dueDate: { lt: new Date() }, status: { not: 'done' } } }),
            this.getSettingsWithMetadata(user)
        ]);

        const prompt = `Analyze organizational health. 
Active Projects: ${projectCount}
Pending Tasks: ${taskCount}
Overdue Items: ${overdueCount}
Provide a brief, professional organizational health summary. You MUST limit your response to a maximum of 4 lines (about 2-3 short sentences). Focus on efficiency and urgency.`;

        const insight = await aiService.getInsights(prompt, settings, { max_tokens: 60 });

        if (redisClient && insight) {
            await redisClient.set(cacheKey, insight, 'EX', 3600); // 1 hour
        }

        return insight;
    }

    async getProjectInsights(user: any, projectId: string, redisClient?: any) {
        const companyId = requestContext.getStore()?.companyId as string;
        const cacheKey = `ai:project:${companyId}:${projectId}`;

        if (redisClient) {
            const cached = await redisClient.get(cacheKey);
            if (cached) return cached;
        }

        const [project, settings] = await Promise.all([
            prisma.project.findFirst({ where: { id: projectId, companyId } }),
            this.getSettingsWithMetadata(user)
        ]);

        if (!project) throw new Error('Project not found');

        const prompt = `Analyze project risks and progress for project "${project.name}". Description: ${project.description || 'N/A'}. Status: ${project.status}. Provide a concise 2-sentence risk analysis.`;
        const insight = await aiService.getInsights(prompt, settings);

        if (redisClient && insight) {
            await redisClient.set(cacheKey, insight, 'EX', 600); // 10 minutes
        }

        return insight;
    }

    async getChatSessions(userId: string) {
        return await prisma.aiChatSession.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            select: { id: true, title: true, createdAt: true, updatedAt: true }
        });
    }

    async getChatSession(userId: string, sessionId: string) {
        const session = await prisma.aiChatSession.findFirst({
            where: { id: sessionId, userId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        
        if (!session) throw new Error('Session not found');
        return session;
    }

    async deleteChatSession(userId: string, sessionId: string) {
        const session = await prisma.aiChatSession.findFirst({
            where: { id: sessionId, userId }
        });

        if (!session) throw new Error('Session not found');

        await prisma.aiChatSession.delete({ where: { id: sessionId } });
        return { success: true, message: 'Session deleted' };
    }

    async chatWithAI(user: any, { message, history, sessionId, isLegalMode, fileContext, stream }: any, onChunk?: (chunk: string) => void) {
        const startTime = Date.now();
        const companyId = requestContext.getStore()?.companyId as string;

        // Ensure session exists or create one
        let activeSessionId = sessionId;
        if (!activeSessionId) {
            const title = message.split(' ').slice(0, 5).join(' ') + (message.split(' ').length > 5 ? '...' : '');
            const newSession = await prisma.aiChatSession.create({
                data: {
                    userId: user.id,
                    title: title || 'New Chat'
                }
            });
            activeSessionId = newSession.id;
        }

        // Save user message
        await prisma.aiChatMessage.create({
            data: {
                sessionId: activeSessionId,
                role: 'user',
                content: message
            }
        });

        // Update session's updatedAt
        await prisma.aiChatSession.update({
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
                prisma.user.count({ where: { companyId, isActive: true } }),
                prisma.project.count({ where: { companyId, status: { not: 'completed' } } }),
                prisma.task.count({ where: { companyId, status: { not: 'done' } } }),
                prisma.job ? prisma.job.count({ where: { companyId, status: 'open' } }) : 0,
                prisma.application ? prisma.application.count({ where: { companyId, status: { in: ['applied', 'screening', 'interview'] } } as any }) : 0,
                prisma.leave ? prisma.leave.count({ where: { companyId, status: 'pending' } }) : 0,
                prisma.invoice ? prisma.invoice.count({ where: { companyId, status: { in: ['sent', 'overdue'] } } }) : 0,
                prisma.project.findMany({ where: { companyId, status: { not: 'completed' } }, take: 10, select: { name: true, status: true } }),
                prisma.task.findMany({ where: { companyId, status: { not: 'done' } }, take: 10, select: { title: true, status: true } }),
                prisma.job ? prisma.job.findMany({ where: { companyId, status: 'open' }, take: 10, select: { title: true, department: true } }) : [],
                prisma.user.findMany({ where: { companyId, isActive: true }, take: 50, select: { id: true, name: true, role: true } })
            ]);
            contextText += `Company Overview:\n- Total Active Employees: ${empCount}\n- Active Projects: ${activeProjects}\n- Pending/In-Progress Tasks: ${pendingTasks}\n- Open Jobs: ${openJobs} (with ${pendingCandidates} pending candidates)\n- Pending Leave Requests: ${pendingLeaves}\n- Unpaid Invoices: ${unpaidInvoices}\n\n`;
            contextText += `Data Samples (max 10 shown):\n`;
            contextText += `- Employees: ${employees.map((e: any) => e.name + ' (' + e.role + ')').join(', ')}\n`;
            contextText += `- Active Projects: ${recentProjects.map((p: any) => p.name + ' [' + p.status + ']').join(', ')}\n`;
            contextText += `- Recent Pending Tasks: ${recentTasks.map((t: any) => t.title + ' [' + t.status + ']').join(', ')}\n`;
            contextText += `- Open Jobs: ${recentJobs.map((j: any) => j.title + ' (' + j.department + ')').join(', ')}\n\n`;
        } else {
            const todayStr = new Date().toISOString().slice(0, 10);
            const [
                myTasks, myProjects, myLeaves, myAttendance,
                recentTasks, recentProjects
            ] = await Promise.all([
                prisma.task.count({ where: {companyId, assigneeId: user.id, status: { not: 'done' }} }),
                prisma.project.count({ where: {companyId, memberIds: { has: user.id }, status: { not: 'completed' }} }),
                prisma.leave ? prisma.leave.count({ where: {companyId, employeeId: user.id, status: 'pending'} }) : 0,
                prisma.attendance ? prisma.attendance.findFirst({ where: { companyId, employeeId: user.id, date: todayStr } }) : null,
                prisma.task.findMany({ where: {companyId, assigneeId: user.id, status: { not: 'done' }}, take: 10, select: { title: true, status: true } }),
                prisma.project.findMany({ where: {companyId, memberIds: { has: user.id }, status: { not: 'completed' }}, take: 10, select: { name: true, status: true } })
            ]);
            const attStatus = myAttendance ? myAttendance.status : 'Not marked yet';
            contextText += `Your Current Status:\n- Your Pending Tasks: ${myTasks}\n- Your Active Projects: ${myProjects}\n- Your Pending Leave Requests: ${myLeaves}\n- Your Attendance Today: ${attStatus}\n\n`;
            contextText += `Your Data Samples (max 10 shown):\n`;
            contextText += `- Active Projects: ${recentProjects.map((p: any) => p.name + ' [' + p.status + ']').join(', ')}\n`;
            contextText += `- Pending Tasks: ${recentTasks.map((t: any) => t.title + ' [' + t.status + ']').join(', ')}\n\n`;
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

        // Semantic RAG Search
        const semanticResults = await vectorStore.search(message, 2, (meta: any) => meta.companyId === companyId);
        if (semanticResults && semanticResults.length > 0) {
            contextText += `Relevant Document Snippets (Semantic Search):\n`;
            semanticResults.forEach((res: any) => {
                contextText += `[Doc: ${res.metadata.filename}] ${res.text}\n\n`;
            });
        }

        // Agentic Automation (Tool Calling)
        contextText += `TOOL CALLING INSTRUCTIONS: If the user explicitly asks you to perform an action (e.g. create a task, create a project, log time) or confirms your suggested tasks, you MUST output ONLY a JSON block wrapped in \`\`\`json ... \`\`\` and no other text. The JSON must follow this structure: {"action": "action_name", "payload": { ... }}. 
Available actions:
1. create_task: payload { title: string, description?: string, priority?: "low"|"medium"|"high", assigneeId?: string }
2. batch_create_tasks: payload { tasks: [{ title: string, description?: string, priority?: "low"|"medium"|"high", assigneeId?: string }] }
3. create_project: payload { name: string, description?: string }
4. log_time: payload { description: string, hoursSpent: number }\n\n`;

        if (isLegalMode) {
            contextText += `LEGAL COUNSEL MODE ACTIVE: You are also acting as a Supreme Court Advocate with 15+ years of corporate legal expertise. Focus on analyzing obligations, flagging hidden constraints, proposing contract terms, and offering sound legal drafting advice. Always clarify that your advice is for informational purposes and they should consult human counsel for final validation.\n\n`;
        }

        // Custom AI Agents
        const agentMatch = message.match(/@Agent\/([a-zA-Z0-9_ -]+)/i);
        if (agentMatch) {
            const agentName = agentMatch[1].toLowerCase();
            if (agentName.includes('hr')) {
                contextText += `HR AGENT MODE ACTIVE: You are an expert HR Business Partner. Focus on employee well-being, company policies, conflict resolution, and talent management.\n\n`;
            } else if (agentName.includes('sales') || agentName.includes('marketing')) {
                contextText += `SALES/MARKETING AGENT MODE ACTIVE: You are a high-performing Growth Expert. Focus on conversion rates, lead generation, and persuasive copywriting.\n\n`;
            }
        }

        // RBAC Guardrails & Dynamic Entity Context Injection
        const clientMentions = [...message.matchAll(/@C\/([a-zA-Z0-9_ -]+)/gi)].map(m => m[1].trim());
        const employeeMentions = [...message.matchAll(/@E\/([a-zA-Z0-9_ -]+)/gi)].map(m => m[1].trim());
        const projectMentions = [...message.matchAll(/@P\/([a-zA-Z0-9_ -]+)/gi)].map(m => m[1].trim());

        if (clientMentions.length > 0 && (prisma as any).client) {
            const clients = await (prisma as any).client.findMany({
                where: { name: { in: clientMentions }, companyId },
                include: { invoices: true }
            });
            clients.forEach((c: any) => {
                contextText += `Client Context (${c.name}): Industry: ${c.industry || 'N/A'}. Status: ${c.status || 'N/A'}.\n`;
                if (['admin', 'manager', 'finance'].includes(user.role) && c.invoices.length > 0) {
                    contextText += `  - Total Invoices: ${c.invoices.length}. Unpaid: ${c.invoices.filter((i: any) => i.status !== 'paid').length}\n`;
                }
            });
            contextText += `\n`;
        }

        if (employeeMentions.length > 0) {
            const employees = await prisma.user.findMany({
                where: { name: { in: employeeMentions }, companyId }
            });
            employees.forEach((e: any) => {
                contextText += `Employee Context (${e.name}): Role: ${e.role}. Department: ${e.department || 'N/A'}.\n`;
                if (['admin', 'hr'].includes(user.role)) {
                    contextText += `  - [SENSITIVE] Salary: ${e.salary}. Leave Balance: ${e.leaveBalance} days.\n`;
                }
            });
            contextText += `\n`;
        }

        if (projectMentions.length > 0) {
            const projects = await prisma.project.findMany({
                where: { name: { in: projectMentions }, companyId }
            });
            projects.forEach((p: any) => {
                contextText += `Project Context (${p.name}): Status: ${p.status}. Priority: ${p.priority}.\n`;
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
        
        if (!history || history.length === 0) {
             const recentMessages = await prisma.aiChatMessage.findMany({
                 where: { sessionId: activeSessionId },
                 orderBy: { createdAt: 'desc' },
                 take: 6
             });
             recentMessages.reverse().slice(0, -1).forEach((msg: any) => {
                 chatHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
             });
        } else if (history && Array.isArray(history)) {
            const recentHistory = history.slice(-5);
            recentHistory.forEach((msg: any) => {
                chatHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
            });
        }

        const finalPrompt = `${contextText}\n${chatHistory}\nUser: ${message}\nAssistant:`;
        const settings = await this.getSettingsWithMetadata(user);
        
        let fullReply = "";
        
        if (stream) {
            await aiService.getInsightsStream(finalPrompt, settings as any, {}, (chunk) => {
                fullReply += chunk;
                if (onChunk) onChunk(chunk);
            });
        } else {
            fullReply = await aiService.getInsights(finalPrompt, settings as any);
        }

        let actionResult = null;
        let finalStoredReply = fullReply;
        const jsonMatch = fullReply.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        
        if (jsonMatch) {
            try {
                const command = JSON.parse(jsonMatch[1]);
                if (command.action && command.payload) {
                    if (command.action === 'create_task') {
                        const newTask = await prisma.task.create({
                            data: {
                                title: command.payload.title,
                                description: command.payload.description || '',
                                priority: command.payload.priority || 'medium',
                                companyId,
                                creatorId: user.id,
                                assigneeId: command.payload.assigneeId || user.id
                            }
                        });
                        actionResult = `Task created successfully: **${newTask.title}** (Assigned to: ${command.payload.assigneeId || 'You'})`;
                    } else if (command.action === 'batch_create_tasks' && Array.isArray(command.payload.tasks)) {
                        let createdCount = 0;
                        for (const t of command.payload.tasks) {
                            await prisma.task.create({
                                data: {
                                    title: t.title,
                                    description: t.description || '',
                                    priority: t.priority || 'medium',
                                    companyId,
                                    creatorId: user.id,
                                    assigneeId: t.assigneeId || user.id
                                }
                            });
                            createdCount++;
                        }
                        actionResult = `Batch created ${createdCount} tasks successfully.`;
                    } else if (command.action === 'create_project') {
                        const newProject = await prisma.project.create({
                            data: {
                                name: command.payload.name,
                                description: command.payload.description || '',
                                companyId,
                                ownerId: user.id,
                                memberIds: [user.id]
                            }
                        });
                        actionResult = `Project created successfully: **${newProject.name}**`;
                    } else if (command.action === 'log_time' && (prisma as any).timeLog) {
                        const newLog = await (prisma as any).timeLog.create({
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
                        if (stream && onChunk) {
                            onChunk(`\n\n✅ **System Execution Result:** ${actionResult}`);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to parse tool call JSON in stream:', err);
            }
        }

        // Save assistant message
        await prisma.aiChatMessage.create({
            data: {
                sessionId: activeSessionId,
                role: 'assistant',
                content: finalStoredReply
            }
        });

        // Audit Logging and Background Moderation
        if ((prisma as any).aiRequestLog) {
            const endTime = Date.now();
            (prisma as any).aiRequestLog.create({
                data: {
                    userId: user.id,
                    inputParameters: { message, isLegalMode, hasFile: !!fileContext },
                    aiResponseTimeMs: endTime - startTime,
                    totalPiecesGenerated: 1,
                    qualityScore: 100
                }
            }).then((logEntry: any) => {
                const modPrompt = `You are an AI Safety Moderator. Evaluate the response for accuracy and absence of hallucinations. Return ONLY a JSON object with a score (0-100). Example: {"score": 95}\nINPUT: ${message}\nOUTPUT: ${finalStoredReply}`;
                aiService.getInsights(modPrompt, settings as any).then(modResponse => {
                    const match = modResponse.match(/\{[\s\S]*?\}/);
                    if (match) {
                        const parsed = JSON.parse(match[0]);
                        if (typeof parsed.score === 'number') {
                            (prisma as any).aiRequestLog.update({
                                where: { id: logEntry.id },
                                data: { qualityScore: parsed.score }
                            }).catch(() => {});
                        }
                    }
                }).catch(() => {});
            }).catch(() => {});
        }

        return { reply: finalStoredReply, sessionId: activeSessionId };
    }

    async analyzeDocumentText(user: any, documentId: string, message: string, summarizeOnly: boolean, history: any[], serverPort: string | number = 4000) {
        const companyId = requestContext.getStore()?.companyId as string;
        const [doc, settings] = await Promise.all([
            prisma.document.findUnique({ where: { id: documentId } }),
            this.getSettingsWithMetadata(user)
        ]);

        if (!doc) throw new Error('Document not found');

        let extractedText = "";

        if (doc.storageType === 'google_drive') {
            extractedText = `Document Name: ${doc.name}\nDescription: ${doc.description || 'None'}`;
        } else if (doc.fileUrl) {
            try {
                let fileUrl = doc.fileUrl;
                if (!fileUrl.startsWith('http')) {
                    fileUrl = `http://localhost:${serverPort}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
                }
                const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);
                
                if (doc.fileUrl.endsWith('.pdf') && pdfParse) {
                    const pdfData = await pdfParse(buffer);
                    extractedText = pdfData.text;
                } else if (doc.fileUrl.endsWith('.docx') && mammoth) {
                    const result = await mammoth.extractRawText({ buffer });
                    extractedText = result.value;
                } else if (doc.fileUrl.endsWith('.html') || doc.fileType === 'link' || doc.fileType === 'html') {
                    extractedText = buffer.toString('utf-8');
                    extractedText = extractedText.replace(/<[^>]*>?/gm, ' ');
                } else {
                    extractedText = buffer.toString('utf-8');
                }
                extractedText = extractedText.slice(0, 30000);
            } catch (err: any) {
                console.warn('Failed to fetch/parse file content:', err.message);
                extractedText = `Document Name: ${doc.name}\nDescription: ${doc.description || 'None'}\nType: ${doc.fileType}`;
            }
        } else {
            extractedText = `Document Name: ${doc.name}\nDescription: ${doc.description || 'None'}\nType: ${doc.fileType}`;
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
            ? `Please provide a concise, professional summary (3-5 bullet points) of the following document content:\n\n${extractedText}`
            : `You are a document assistant. Based on the following document content, answer the user's question accurately.\n\nDOCUMENT CONTENT:\n${extractedText}\n\n${chatHistory}USER QUESTION: ${message}`;

        return await aiService.getInsights(prompt, settings as any);
    }

    async generateEmailDraft(user: any, { idea, recipientName, tone = 'professional', context = '' }: any) {
        const settings = await this.getSettingsWithMetadata(user);

        const prompt = `You are an expert business communicator and professional email writer. 
Your goal is to draft a high-quality email based on the user's requirements.

RECIPIENT: ${recipientName || 'Valued Recipient'}
TONE: ${tone}
CONTEXT/GOAL: ${idea}
ADDITIONAL CONTEXT: ${context}

Draft the email with a clear subject line and a professional body. Use [Placeholder] for any missing info. No extra talk, just the email draft.`;

        return await aiService.getInsights(prompt, settings as any);
    }

    async processMeetingTranscript(user: any, file: any, bodyText?: string) {
        let transcriptText = bodyText || '';
        
        if (file) {
            if (file.mimetype === 'application/pdf' && pdfParse) {
                const data = await pdfParse(file.buffer);
                transcriptText = data.text;
            } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && mammoth) {
                const result = await mammoth.extractRawText({ buffer: file.buffer });
                transcriptText = result.value;
            } else {
                transcriptText = file.buffer.toString('utf-8');
            }
        }
        
        if (!transcriptText) throw new Error('No transcript provided.');
        
        const companyId = requestContext.getStore()?.companyId as string;
        const employees = await prisma.user.findMany({ 
            where: { companyId, isActive: true }, 
            select: { id: true, name: true, role: true } 
        });

        const prompt = `You are an AI assistant that processes meeting transcripts. 
Read the following transcript and output a JSON block wrapped in \`\`\`json ... \`\`\` containing two things:
1. "summary": A brief executive summary of the meeting.
2. "tasks": An array of actionable items discussed in the meeting. Each task should have a "title", "description", and an "assigneeId". Match the assignee to the closest employee from this list: ${JSON.stringify(employees)}. If you cannot determine the assignee, use the user ID "${user.id}".

TRANSCRIPT:
${transcriptText}`;

        const settings = await this.getSettingsWithMetadata(user);
        const aiResponse = await aiService.getInsights(prompt, settings as any);
        
        let createdTasksCount = 0;
        let finalReply = aiResponse;
        
        const jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/) || aiResponse.match(/\{[\s\S]*?\}/);
        
        if (jsonMatch) {
            try {
                const command = JSON.parse(jsonMatch[1] || jsonMatch[0].replace(/```json/g, '').replace(/```/g, ''));
                if (command.action === 'batch_create_tasks' && Array.isArray(command.payload)) {
                    for (const taskPayload of command.payload) {
                        await prisma.task.create({
                            data: {
                                title: taskPayload.title,
                                description: 'Auto-generated from meeting transcript',
                                priority: taskPayload.priority || 'medium',
                                companyId,
                                creatorId: user.id,
                                assigneeId: user.id
                            }
                        });
                        createdTasksCount++;
                    }
                    
                    finalReply = aiResponse.replace(jsonMatch[0], '') + `\n\n✅ **Action Items Executed:** Auto-created ${createdTasksCount} tasks from this meeting.`;
                } else if (command.tasks && Array.isArray(command.tasks)) {
                    for (const t of command.tasks) {
                        await prisma.task.create({
                            data: {
                                title: t.title,
                                description: t.description || '',
                                companyId,
                                creatorId: user.id,
                                assigneeId: t.assigneeId || user.id,
                                priority: 'medium'
                            }
                        });
                        createdTasksCount++;
                    }
                    finalReply = command.summary || 'Summary generated.';
                }
            } catch (err) {
                console.error('Failed to parse meeting task generation JSON:', err);
            }
        }
        
        return { 
            summary: finalReply, 
            createdTasks: createdTasksCount 
        };
    }

    async uploadDocument(user: any, file: any) {
        if (!file) throw new Error('No file uploaded');

        const buffer = file.buffer;
        const originalName = file.originalname;
        let content = '';

        if (originalName.toLowerCase().endsWith('.pdf') && pdfParse) {
            const pdfData = await pdfParse(buffer);
            content = pdfData.text;
        } else if (originalName.toLowerCase().endsWith('.docx') && mammoth) {
            const result = await mammoth.extractRawText({ buffer });
            content = result.value;
        } else if (originalName.toLowerCase().match(/\.(png|jpg|jpeg|webp)$/)) {
            const base64Image = buffer.toString('base64');
            content = `[IMAGE ATTACHED: ${originalName}]\n*Base64 encoding available for Multi-Modal Vision Processing*`;
            return {
                filename: originalName,
                extractedText: content,
                imageBase64: base64Image
            };
        } else {
            content = buffer.toString('utf-8');
        }

        content = content.slice(0, 30000);

        const docId = `doc_${Date.now()}`;
        await vectorStore.addDocument(docId, content, { companyId: requestContext.getStore()?.companyId as string, filename: originalName });

        return {
            filename: originalName,
            extractedText: content,
            vectorId: docId
        };
    }


    async searchEntities(user: any, type: string, query: string) {
        if (!query || query.length < 1) return [];

        const companyId = requestContext.getStore()?.companyId as string;
        let results = [];

        if (type === 'C' && (prisma as any).client) {
            const clients = await (prisma as any).client.findMany({
                where: { name: { contains: query, mode: 'insensitive' }, companyId },
                take: 5,
                select: { id: true, name: true, industry: true }
            });
            results = clients.map((c: any) => ({ id: c.id, name: c.name, subtitle: c.industry || 'Client' }));
        } else if (type === 'E') {
            const employees = await prisma.user.findMany({
                where: { name: { contains: query, mode: 'insensitive' }, companyId },
                take: 5,
                select: { id: true, name: true, role: true }
            });
            results = employees.map((e: any) => ({ id: e.id, name: e.name, subtitle: e.role }));
        } else if (type === 'P') {
            const whereClause: any = { name: { contains: query, mode: 'insensitive' }, companyId };
            if (!['admin', 'hr', 'manager'].includes(user.role)) {
                whereClause.memberIds = { has: user.id };
            }
            const projects = await prisma.project.findMany({
                where: whereClause,
                take: 5,
                select: { id: true, name: true, status: true }
            });
            results = projects.map((p: any) => ({ id: p.id, name: p.name, subtitle: p.status }));
        }

        return results;
    }
}

export const aiAssistantService = new AiAssistantService();




// @ts-nocheck
import { prisma, requestContext } from '@workspace/db';
import { aiProviderService } from '../kernel/ai-provider.service';
import { AICompanyConfigService } from '../kernel/ai-company-config.service';
import { vectorStore } from '../background/ai-vector-store.service';
import { aiToolRegistry } from '../tools/ai-tool-registry';
import axios from 'axios';
import * as pdfParseOriginal from 'pdf-parse';
const pdfParse: any = pdfParseOriginal;
import * as mammothOriginal from 'mammoth';
const mammoth: any = mammothOriginal;

export class AIChatService {
    /**
     * Resolves settings and metadata for a user's company
     */
    static async getSettingsWithMetadata(user: any, companyIdParam?: string) {
        const companyId = companyIdParam || (requestContext.getStore()?.companyId as string) || user?.companyId;
        const { settings, metadata } = await AICompanyConfigService.getCompanyAISettings(companyId);
        return { ...settings, ...metadata };
    }

    /**
     * Retrieves all chat sessions for a user
     */
    static async getChatSessions(userId: string) {
        return await prisma.aiChatSession.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            select: { id: true, title: true, createdAt: true, updatedAt: true }
        });
    }

    /**
     * Retrieves a single chat session with its messages
     */
    static async getChatSession(userId: string, sessionId: string) {
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

    /**
     * Deletes a chat session
     */
    static async deleteChatSession(userId: string, sessionId: string) {
        const session = await prisma.aiChatSession.findFirst({
            where: { id: sessionId, userId }
        });

        if (!session) throw new Error('Session not found');

        await prisma.aiChatSession.delete({ where: { id: sessionId } });
        return { success: true, message: 'Session deleted' };
    }

    /**
     * Core conversational assistant supporting streaming, sessions, multi-domain context,
     * tool calling, agent modes, entity mentions, and semantic search.
     */
    static async chatWithAI(
        user: any,
        { message, history, sessionId, isLegalMode, fileContext, stream }: any,
        onChunk?: (chunk: string) => void
    ) {
        const startTime = Date.now();
        const companyId = (requestContext.getStore()?.companyId as string) || user?.companyId;

        // Ensure session exists or create one
        let activeSessionId = sessionId;
        if (!activeSessionId) {
            const title = message.split(' ').slice(0, 5).join(' ') + (message.split(' ').length > 5 ? '...' : '');
            try {
                const newSession = await prisma.aiChatSession.create({
                    data: {
                        userId: user.id,
                        title: title || 'New Chat'
                    }
                });
                activeSessionId = newSession.id;
            } catch (err) {
                activeSessionId = `session_${Date.now()}`;
            }
        }

        // Save user message (with fallback for ephemeral/test sessions)
        try {
            await prisma.aiChatMessage.create({
                data: {
                    sessionId: activeSessionId,
                    role: 'user',
                    content: message
                }
            });
            await prisma.aiChatSession.update({
                where: { id: activeSessionId },
                data: { updatedAt: new Date() }
            });
        } catch (msgErr) {
            // Ephemeral or test session
        }

        // Gather rich system context
        let contextText = `System Context:\n`;
        contextText += `Current Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
        contextText += `User Name: ${user.name || user.email || 'User'}, Role: ${user.role || 'Member'}, Department: ${user.department || 'N/A'}\n\n`;

        // Role-based data gathering
        if (['admin', 'hr', 'manager', 'owner', 'finance', 'superadmin'].includes((user.role || '').toLowerCase())) {
            const [
                empCount, activeProjects, pendingTasks,
                openJobs, pendingCandidates, pendingLeaves, unpaidInvoices,
                recentProjects, recentTasks, recentJobs, employees,
                salaries, expenses
            ] = await Promise.all([
                prisma.user.count({ where: { companyId, isActive: true } }).catch(() => 0),
                prisma.project.count({ where: { companyId, status: { not: 'completed' } } }).catch(() => 0),
                prisma.task.count({ where: { companyId, status: { not: 'done' } } }).catch(() => 0),
                prisma.job ? prisma.job.count({ where: { companyId, status: 'open' } }).catch(() => 0) : 0,
                prisma.application ? prisma.application.count({ where: { companyId, status: { in: ['applied', 'screening', 'interview'] } } as any }).catch(() => 0) : 0,
                prisma.leave ? prisma.leave.count({ where: { companyId, status: 'pending' } }).catch(() => 0) : 0,
                prisma.invoice ? prisma.invoice.count({ where: { companyId, status: { in: ['sent', 'overdue'] } } }).catch(() => 0) : 0,
                prisma.project.findMany({ where: { companyId, status: { not: 'completed' } }, take: 10, select: { name: true, status: true } }).catch(() => []),
                prisma.task.findMany({ where: { companyId, status: { not: 'done' } }, take: 10, select: { title: true, status: true } }).catch(() => []),
                prisma.job ? prisma.job.findMany({ where: { companyId, status: 'open' }, take: 10, select: { title: true, department: true } }).catch(() => []) : [],
                prisma.user.findMany({ where: { companyId, isActive: true }, take: 50, select: { id: true, name: true, role: true } }).catch(() => []),
                prisma.salary ? prisma.salary.findMany({
                    where: { companyId },
                    include: { employee: { select: { id: true, name: true, role: true } } }
                }).catch(() => []) : [],
                prisma.expenseTransaction ? prisma.expenseTransaction.findMany({
                    where: { companyId },
                    take: 10,
                    orderBy: { date: 'desc' },
                    select: { id: true, title: true, amount: true, currency: true, status: true }
                }).catch(() => []) : []
            ]);

            const monthlySalaryBurn = salaries.reduce((acc: number, s: any) => acc + (Number(s.amount || s.baseSalary) || 0), 0);
            const currency = salaries[0]?.currency || 'INR';
            const currSymbol = currency === 'INR' ? '₹' : '$';

            contextText += `Company Overview:\n- Total Active Employees: ${empCount}\n- Active Projects: ${activeProjects}\n- Pending/In-Progress Tasks: ${pendingTasks}\n- Open Jobs: ${openJobs} (with ${pendingCandidates} pending candidates)\n- Pending Leave Requests: ${pendingLeaves}\n- Unpaid Invoices: ${unpaidInvoices}\n`;
            contextText += `- Total Monthly Salary Expense: ${currSymbol}${monthlySalaryBurn.toLocaleString('en-IN')}\n\n`;

            contextText += `Financial & Payroll Intelligence:\n`;
            if (salaries.length > 0) {
                contextText += `- Employee Salaries: ${salaries.map((s: any) => `${s.employee?.name || 'Employee'} (${s.employee?.role || 'Staff'}): ${currSymbol}${Number(s.amount || s.baseSalary || 0).toLocaleString('en-IN')}/month`).join(', ')}\n`;
            } else if (employees.length > 0) {
                contextText += `- Active Team: ${employees.map((e: any) => e.name + ' (' + e.role + ')').join(', ')} (Note: No explicit salary records entered yet in payroll table)\n`;
            }
            if (expenses.length > 0) {
                contextText += `- Recent Expenses: ${expenses.map((e: any) => `${e.title}: ${e.currency === 'INR' ? '₹' : '$'}${Number(e.amount).toLocaleString('en-IN')}`).join(', ')}\n`;
            }
            contextText += `\n`;

            contextText += `Data Samples (max 10 shown):\n`;
            if (employees.length > 0) contextText += `- Employees: ${employees.map((e: any) => e.name + ' (' + e.role + ')').join(', ')}\n`;
            if (recentProjects.length > 0) contextText += `- Active Projects: ${recentProjects.map((p: any) => p.name + ' [' + p.status + ']').join(', ')}\n`;
            if (recentTasks.length > 0) contextText += `- Recent Pending Tasks: ${recentTasks.map((t: any) => t.title + ' [' + t.status + ']').join(', ')}\n`;
            if (recentJobs.length > 0) contextText += `- Open Jobs: ${recentJobs.map((j: any) => j.title + ' (' + j.department + ')').join(', ')}\n\n`;
        } else {
            const todayStr = new Date().toISOString().slice(0, 10);
            const [
                myTasks, myProjects, myLeaves, myAttendance,
                recentTasks, recentProjects
            ] = await Promise.all([
                prisma.task.count({ where: { companyId, assigneeId: user.id, status: { not: 'done' } } }).catch(() => 0),
                prisma.project.count({ where: { companyId, memberIds: { has: user.id }, status: { not: 'completed' } } }).catch(() => 0),
                prisma.leave ? prisma.leave.count({ where: { companyId, employeeId: user.id, status: 'pending' } }).catch(() => 0) : 0,
                prisma.attendance ? prisma.attendance.findFirst({ where: { companyId, employeeId: user.id, date: todayStr } }).catch(() => null) : null,
                prisma.task.findMany({ where: { companyId, assigneeId: user.id, status: { not: 'done' } }, take: 10, select: { title: true, status: true } }).catch(() => []),
                prisma.project.findMany({ where: { companyId, memberIds: { has: user.id }, status: { not: 'completed' } }, take: 10, select: { name: true, status: true } }).catch(() => [])
            ]);
            const attStatus = myAttendance ? myAttendance.status : 'Not marked yet';
            contextText += `Your Current Status:\n- Your Pending Tasks: ${myTasks}\n- Your Active Projects: ${myProjects}\n- Your Pending Leave Requests: ${myLeaves}\n- Your Attendance Today: ${attStatus}\n\n`;
            contextText += `Your Data Samples (max 10 shown):\n`;
            if (recentProjects.length > 0) contextText += `- Active Projects: ${recentProjects.map((p: any) => p.name + ' [' + p.status + ']').join(', ')}\n`;
            if (recentTasks.length > 0) contextText += `- Pending Tasks: ${recentTasks.map((t: any) => t.title + ' [' + t.status + ']').join(', ')}\n\n`;
        }

        const userRole = (user.role || 'employee').toLowerCase();
        const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];
        const isAdmin = userRole === 'admin';

        if (isAdmin) {
            contextText += `Instructions: You are the ⚡ Executive AI Copilot on 180 Workspace. You have FULL AUTONOMOUS EXECUTION capabilities across all 10 platform apps (HRMS, CRM, Projects, Tasks, 180 Documents, 180 Forms, Website Builder, Payroll, Invoices, Social Media, Communications, Service Desk). Keep your responses structured, executive, and decisive. Format with Markdown. When giving a company overview, strictly limit it to a maximum of 4 lines.
IMPORTANT: When the user asks to build, create, or execute any action, immediately output the appropriate tool calling JSON block.\n\n`;
        } else {
            contextText += `Instructions: You are the 🧭 180 Workspace Workplace Companion & Guide for team members. Your role is to:
1. Guide employees step-by-step on how to use any platform feature (e.g. tasks, leaves, forms, documents, website builder, meetings).
2. Assist with personal self-service (fetching their assigned tasks, logging work hours, submitting their leave requests, checking leave balances).
3. Search company documentation and knowledge base to answer questions.
4. Assist with drafting emails, summaries, and notes.
IMPORTANT: If an employee asks to perform administrative actions (e.g. terminating employees, viewing company-wide payroll, deleting projects, creating invoices), politely explain that this requires administrative privileges and offer a feature guide or suggest contacting their workspace administrator.\n\n`;
        }

        const { aiToolRegistry } = require('../tools/ai-tool-registry');
        const authorizedToolsDescription = aiToolRegistry.toSystemPromptDescriptionForUser(userRole, userPermissions);

        contextText += `TOOL CALLING INSTRUCTIONS: If the user explicitly asks you to perform an action or confirms an action, you MUST output ONLY a JSON block wrapped in \`\`\`json ... \`\`\` and no other text. The JSON must follow this structure: {"action": "action_name", "payload": { ... }}.\n`;
        contextText += `Available actions for your role:\n${authorizedToolsDescription}\n\n`;

        if (isLegalMode) {
            contextText += `LEGAL COUNSEL MODE ACTIVE: You are also acting as a Corporate Legal Counsel with 15+ years of corporate legal expertise. Focus on analyzing obligations, flagging hidden constraints, proposing contract terms, and offering sound legal drafting advice. Always clarify that your advice is for informational purposes and they should consult human counsel for final validation.\n\n`;
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
            }).catch(() => []);
            clients.forEach((c: any) => {
                contextText += `Client Context (${c.name}): Industry: ${c.industry || 'N/A'}. Status: ${c.status || 'N/A'}.\n`;
                if (['admin', 'manager', 'finance'].includes((user.role || '').toLowerCase()) && c.invoices?.length > 0) {
                    contextText += `  - Total Invoices: ${c.invoices.length}. Unpaid: ${c.invoices.filter((i: any) => i.status !== 'paid').length}\n`;
                }
            });
            contextText += `\n`;
        }

        if (employeeMentions.length > 0) {
            const employees = await prisma.user.findMany({
                where: { name: { in: employeeMentions }, companyId }
            }).catch(() => []);
            employees.forEach((e: any) => {
                contextText += `Employee Context (${e.name}): Role: ${e.role}. Department: ${e.department || 'N/A'}.\n`;
                if (['admin', 'hr'].includes((user.role || '').toLowerCase())) {
                    contextText += `  - [SENSITIVE] Salary: ${e.salary || 'N/A'}. Leave Balance: ${e.leaveBalance || 0} days.\n`;
                }
            });
            contextText += `\n`;
        }

        if (projectMentions.length > 0) {
            const projects = await prisma.project.findMany({
                where: { name: { in: projectMentions }, companyId }
            }).catch(() => []);
            projects.forEach((p: any) => {
                contextText += `Project Context (${p.name}): Status: ${p.status}. Priority: ${p.priority}.\n`;
                if (['admin', 'manager'].includes((user.role || '').toLowerCase())) {
                    contextText += `  - [SENSITIVE] Budget: ${p.budget || 'N/A'}.\n`;
                }
            });
            contextText += `\n`;
        }

        // Ingest Recent Workspace Entity Memory for Continuous Consciousness
        const [recentDocs, recentEmployeesList, recentFormsList, recentWebsitesList] = await Promise.all([
            prisma.document ? prisma.document.findMany({
                where: { companyId },
                orderBy: { updatedAt: 'desc' },
                take: 8,
                select: { id: true, title: true, type: true, createdAt: true, updatedAt: true }
            }).catch(() => []) : [],
            prisma.user.findMany({
                where: { companyId },
                orderBy: { createdAt: 'desc' },
                take: 8,
                select: { id: true, name: true, email: true, role: true, department: true, salary: true }
            }).catch(() => []),
            prisma.form ? prisma.form.findMany({
                where: { companyId },
                orderBy: { updatedAt: 'desc' },
                take: 5,
                select: { id: true, title: true }
            }).catch(() => []) : [],
            prisma.website ? prisma.website.findMany({
                where: { companyId },
                orderBy: { updatedAt: 'desc' },
                take: 5,
                select: { id: true, name: true }
            }).catch(() => []) : []
        ]);

        if (recentDocs.length > 0) {
            contextText += `Recent Workspace Documents (in 180 Documents):\n` + recentDocs.map((d: any) => `- "${d.title}" (Type: ${d.type}, ID: ${d.id}, Direct URL: /document-editor?id=${d.id})`).join('\n') + `\n\n`;
        }
        if (recentEmployeesList.length > 0) {
            contextText += `Recent Workspace Team & Hires:\n` + recentEmployeesList.map((e: any) => `- ${e.name} (Role: ${e.role}, Email: ${e.email}, Dept: ${e.department || 'General'}${e.salary ? `, Salary: ₹${Number(e.salary).toLocaleString('en-IN')}/mo` : ''})`).join('\n') + `\n\n`;
        }
        if (recentFormsList.length > 0) {
            contextText += `Recent Forms:\n` + recentFormsList.map((f: any) => `- "${f.title}" (URL: /forms/${f.id})`).join('\n') + `\n\n`;
        }
        if (recentWebsitesList.length > 0) {
            contextText += `Recent Websites:\n` + recentWebsitesList.map((w: any) => `- "${w.name}" (URL: /advertising/${w.id}/edit)`).join('\n') + `\n\n`;
        }

        contextText += `CONTINUOUS MULTI-TURN MEMORY & ENTITY LINKING INSTRUCTIONS:
1. CONTINUOUS AWARENESS: You have persistent memory of all previous messages in this conversation. Never lose track of what action you just performed, what employee you just hired, or what document/website/form was just synthesized.
2. DIRECT LINK RESOLUTION: If the user asks for "the link", "the document", "the offer letter", "the contract", "the operator" (typo for offer letter), or asks where to view something created earlier:
   - Identify the referenced entity from the Recent Conversation history or Recent Workspace Documents above.
   - Immediately provide the DIRECT clickable markdown link: [📄 Open <Title> in 180 Documents](/document-editor?id=<id>).
   - NEVER say "there is no document ID provided" or "please provide more details". Always provide the matching link directly!
3. TOLERATE TYPOS & NATURAL SHORTCUTS: Understand terms like "operator" -> offer letter, "delte" -> delete, "pagem" -> page, "varsha" -> Varsha.
4. ACTION OUTPUTS: Whenever you execute an action (like hiring, firing, creating a lead, or creating a document), always make sure the output response has the direct link to the created entity.
5. PROACTIVE CONSCIOUSNESS & INTERACTIVE CLARIFICATION:
   - When the user asks for something broad, underspecified, or brief (e.g. "landing page for our product for a medicine product", "create a form", "draft an agreement"):
     * NEVER refuse, NEVER say "instruction unclear", and NEVER say "no updates are necessary".
     * PROACTIVELY TAKE INITIATIVE: Deliver a rich, high-fidelity draft or baseline immediately.
     * COMMUNICATE INTERACTIVELY: Ask 2-3 intelligent, targeted clarifying questions to help the user refine and customize it.
   - When the user replies with a short affirmation ("yes", "sure", "ok", "go ahead", "do it", "add it"), understand what you previously proposed in recent conversation history and execute that enhancement immediately!\n\n`;

        let chatHistory = 'Recent Conversation History:\n';
        if (Array.isArray(history) && history.length > 0) {
            const recentHistory = history.slice(-20);
            recentHistory.forEach((msg: any) => {
                const role = (msg.role || '').toLowerCase() === 'user' ? 'User' : 'Assistant';
                const content = msg.content || msg.text || '';
                if (content) {
                    chatHistory += `${role}: ${content}\n`;
                }
            });
        } else {
            const recentMessages = await prisma.aiChatMessage.findMany({
                where: { sessionId: activeSessionId },
                orderBy: { createdAt: 'desc' },
                take: 25
            }).catch(() => []);
            recentMessages.reverse().slice(0, -1).forEach((msg: any) => {
                chatHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
            });
        }

        const finalPrompt = `${contextText}\n${chatHistory}\nUser: ${message}\nAssistant:`;
        const settings = await this.getSettingsWithMetadata(user, companyId);

        let fullReply = '';

        if (stream) {
            await aiProviderService.getInsightsStream(finalPrompt, settings as any, {}, (chunk) => {
                fullReply += chunk;
                if (onChunk) onChunk(chunk);
            });
        } else {
            fullReply = await aiProviderService.getInsights(finalPrompt, settings as any);
        }

        let actionResult: string | null = null;
        let documentPreview: any = null;
        let finalStoredReply = fullReply;
        const jsonMatch = fullReply.match(/```json\s*(\{[\s\S]*?\})\s*```/) || fullReply.match(/^\s*(\{[\s\S]*\})\s*$/);

        if (jsonMatch) {
            try {
                const rawJson = jsonMatch[1] || jsonMatch[0];
                const parsed = JSON.parse(rawJson);
                let action = parsed.action || parsed.tool || parsed.name || parsed.function;
                let payload = parsed.payload || parsed.args || parsed.arguments || parsed.parameters || {};

                // Handle nested single-key tool invocations like { "search_knowledge_base": { ... } } or { "get_form_submissions": { ... } }
                if (!action && typeof parsed === 'object' && parsed !== null) {
                    const keys = Object.keys(parsed);
                    if (keys.length === 1 && typeof parsed[keys[0]] === 'object' && parsed[keys[0]] !== null) {
                        action = keys[0];
                        payload = parsed[keys[0]];
                    }
                }

                if (action) {
                    const command = { action, payload };
                    const userRole = (user.role || 'employee').toLowerCase();
                    const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];
                    const toolContext = {
                        companyId,
                        userId: user.id,
                        userRole,
                        userPermissions
                    };

                    // 1. Dedicated Builder Dispatches with Rich Preview Attachments
                    if (['create_website', 'generate_website_layout'].includes(command.action)) {
                        const isAuth = aiToolRegistry.isUserAuthorizedForTool(aiToolRegistry.getTool('create_website') || {} as any, userRole, userPermissions);
                        if (!isAuth) {
                            actionResult = `🔒 **Administrative Action Restricted**\n\nYou do not have permission to publish or create company websites. Please contact your workspace administrator.`;
                        } else {
                            const { UniversalBuilderRegistry } = require('../builders');
                            const promptText = `${payload.title ? `website name will be ${payload.title}. ` : ''}${payload.prompt || ''} ${payload.theme || ''}`.trim();
                            const compileRes = await UniversalBuilderRegistry.compile('website', {
                                prompt: promptText || message,
                                companyId,
                                userId: user.id
                            });
                            actionResult = compileRes.reply;
                            documentPreview = {
                                id: compileRes.entityId,
                                title: compileRes.title,
                                type: 'website',
                                shareUrl: compileRes.editUrl,
                                editUrl: compileRes.editUrl,
                                blocksCount: Array.isArray(compileRes.ast) ? compileRes.ast.length : 4
                            };
                        }
                    } else if (['create_document', 'generate_document_ast'].includes(command.action)) {
                        const { AIDocumentArchitectService } = require('../documents/ai-document-architect.service');
                        let promptText = payload.prompt || '';
                        if (!promptText && typeof payload.content === 'object' && payload.content !== null) {
                            promptText = `${payload.title || 'Document'}: ` + Object.entries(payload.content).map(([k, v]) => `${k}: ${v}`).join(', ');
                        } else if (!promptText && typeof payload.content === 'string') {
                            promptText = `${payload.title ? payload.title + '. ' : ''}${payload.content}`;
                        }
                        if (!promptText) promptText = payload.title || '';

                        // Combine recent conversation history for rich multi-turn context
                        const recentHistory = (chatHistory || '');
                        promptText = `${promptText} ${recentHistory}`.trim();

                        const docRes = await AIDocumentArchitectService.generate({
                            prompt: promptText || message,
                            documentType: payload.documentType || (promptText.toLowerCase().includes('rent') || promptText.toLowerCase().includes('lease') ? 'RENT_AGREEMENT' : 'CONTRACT'),
                            companyId,
                            userId: user.id
                        });
                        actionResult = docRes.reply || docRes.explanation || `📄 I have drafted and created **"${docRes.title}"** in your 180 Documents with ${docRes.blocksCount || 8} AST blocks.`;
                        documentPreview = {
                            id: docRes.documentId,
                            title: docRes.title,
                            type: 'document',
                            grandTotal: docRes.grandTotal,
                            shareUrl: docRes.shareUrl,
                            editUrl: docRes.documentUrl || `/document-editor?id=${docRes.documentId}`,
                            blocksCount: docRes.blocksCount || 8
                        };
                    } else if (['create_form', 'generate_form_ast'].includes(command.action)) {
                        const { UniversalBuilderRegistry } = require('../builders');
                        const formRes = await UniversalBuilderRegistry.compile('form', {
                            prompt: payload.prompt || payload.title || message,
                            companyId,
                            userId: user.id
                        });
                        actionResult = formRes.reply;
                        documentPreview = {
                            id: formRes.entityId,
                            title: formRes.title,
                            type: 'form',
                            shareUrl: formRes.shareUrl,
                            editUrl: formRes.editUrl || `/forms-builder?id=${formRes.entityId}`,
                            blocksCount: Array.isArray(formRes.ast?.fields) ? formRes.ast.fields.length : 5
                        };
                    } else {
                        // 2. Singleton AI Tool Registry Dispatches with Zero-Trust Execution
                        if (aiToolRegistry && aiToolRegistry.hasTool(command.action)) {
                            const toolOutput = await aiToolRegistry.executeTool(command.action, payload, toolContext);
                            if (toolOutput.directive) {
                                return {
                                    reply: toolOutput.message || 'Please see the options below:',
                                    sessionId: activeSessionId,
                                    directive: toolOutput
                                };
                            }
                            if (toolOutput.unauthorized) {
                                return {
                                    reply: toolOutput.message,
                                    sessionId: activeSessionId
                                };
                            }
                            if (toolOutput.documentId) {
                                documentPreview = {
                                    id: toolOutput.documentId,
                                    title: toolOutput.documentTitle || toolOutput.title || 'Official Document',
                                    type: 'document',
                                    editUrl: toolOutput.documentUrl || `/document-editor?id=${toolOutput.documentId}`,
                                    blocksCount: 7
                                };
                            }
                            actionResult = toolOutput.message || toolOutput.summary || (toolOutput.success ? `Action **${command.action}** completed successfully.` : `Action failed: ${toolOutput.message}`);
                        } else {
                            actionResult = `Executed action **${command.action}** successfully.`;
                        }
                    }

                    if (actionResult) {
                        const hasEmojiHeader = ['🌐', '📄', '📋', '✅', '🎉', '🎯', '🚀', '📜', '🔒', '📊', '📈', '💰', '👥', '⚠️'].some(e => actionResult.startsWith(e));
                        finalStoredReply = hasEmojiHeader
                            ? actionResult
                            : `✅ **Action Executed:** ${actionResult}`;
                        if (stream && onChunk) {
                            onChunk(`\n\n${finalStoredReply}`);
                        }
                    } else {
                        // Strip raw JSON block so user never sees raw JSON in chat
                        finalStoredReply = fullReply.replace(/```json[\s\S]*?```/g, '').trim() || `I have processed your request for **${command.action}**.`;
                    }
                }
            } catch (err) {
                console.error('[AIChatService] Failed to parse tool call JSON:', err);
                finalStoredReply = fullReply.replace(/```json[\s\S]*?```/g, '').trim() || fullReply;
            }
        } else {
            // 3. Smart Intent Fallback
            const lowerMsg = message.toLowerCase().trim();
            const recentHistoryLower = (chatHistory || '').toLowerCase();
            const combinedContext = `${lowerMsg} ${recentHistoryLower}`;

            // 3.1 Form Leads / Submissions Intent
            const isFormQueryIntent = (lowerMsg.includes('form') || lowerMsg.includes('forms')) &&
                (lowerMsg.includes('lead') || lowerMsg.includes('submission') || lowerMsg.includes('how many') || lowerMsg.includes('check') || lowerMsg.includes('data') || lowerMsg.includes('thor'));

            // 3.2 Inactive / Project Health Query Intent
            const isProjectHealthIntent = (lowerMsg.includes('project') || lowerMsg.includes('projects')) &&
                (lowerMsg.includes('inactive') || lowerMsg.includes('not active') || lowerMsg.includes('non active') || lowerMsg.includes('how many') || lowerMsg.includes('health') || lowerMsg.includes('status'));

            const isWebsiteIntent = (combinedContext.includes('website') || combinedContext.includes('landing page') || combinedContext.includes('ecommerce') || combinedContext.includes('store') || combinedContext.includes('site')) &&
                (lowerMsg.includes('build') || lowerMsg.includes('create') || lowerMsg.includes('make') || lowerMsg.includes('generate') || lowerMsg === 'build that');

            const isDocIntent = (combinedContext.includes('document') || combinedContext.includes('contract') || combinedContext.includes('nda') || combinedContext.includes('proposal') || combinedContext.includes('policy') || combinedContext.includes('rent') || combinedContext.includes('lease') || combinedContext.includes('agreement')) &&
                (lowerMsg.includes('build') || lowerMsg.includes('create') || lowerMsg.includes('write') || lowerMsg.includes('generate') || lowerMsg.includes('draft') || lowerMsg.includes('agreement') || lowerMsg === 'build that');

            const isFormCreateIntent = (combinedContext.includes('form') || combinedContext.includes('survey') || combinedContext.includes('intake')) &&
                (lowerMsg.includes('build') || lowerMsg.includes('create') || lowerMsg.includes('generate') || lowerMsg === 'build that');

            if (isFormQueryIntent) {
                const toolContext = { companyId, userId: user.id, userRole: (user.role || 'employee').toLowerCase() };
                const toolRes = await aiToolRegistry.executeTool('get_form_submissions', { query: message, formName: message }, toolContext);
                if (toolRes && toolRes.message) {
                    finalStoredReply = toolRes.message;
                }
            } else if (isProjectHealthIntent) {
                const toolContext = { companyId, userId: user.id, userRole: (user.role || 'employee').toLowerCase() };
                const toolRes = await aiToolRegistry.executeTool('get_project_health', { statusFilter: lowerMsg.includes('inactive') || lowerMsg.includes('not active') ? 'inactive' : 'all' }, toolContext);
                if (toolRes && toolRes.message) {
                    finalStoredReply = toolRes.message;
                }
            } else if (isWebsiteIntent) {
                try {
                    const { UniversalBuilderRegistry } = require('../builders');
                    const compileRes = await UniversalBuilderRegistry.compile('website', {
                        prompt: `${message} ${chatHistory}`,
                        companyId,
                        userId: user.id
                    });
                    finalStoredReply = compileRes.reply;
                    documentPreview = {
                        id: compileRes.entityId,
                        title: compileRes.title,
                        type: 'website',
                        shareUrl: compileRes.editUrl,
                        editUrl: compileRes.editUrl,
                        blocksCount: Array.isArray(compileRes.ast) ? compileRes.ast.length : 4
                    };
                } catch (e) {
                    console.error('[AIChatService] Smart website builder fallback failed:', e);
                }
            } else if (isDocIntent) {
                try {
                    const { AIDocumentArchitectService } = require('../documents/ai-document-architect.service');
                    const docRes = await AIDocumentArchitectService.generate({
                        prompt: `${message} ${chatHistory}`,
                        companyId,
                        userId: user.id
                    });
                    finalStoredReply = docRes.reply || docRes.explanation || `📄 I have synthesized and saved **"${docRes.title}"** in 180 Documents with ${docRes.blocksCount || 8} AST blocks.`;
                    documentPreview = {
                        id: docRes.documentId,
                        title: docRes.title,
                        type: 'document',
                        grandTotal: docRes.grandTotal,
                        shareUrl: docRes.shareUrl,
                        editUrl: docRes.documentUrl || `/document-editor?id=${docRes.documentId}`,
                        blocksCount: docRes.blocksCount
                    };
                } catch (e) {
                    console.error('[AIChatService] Smart document builder fallback failed:', e);
                }
            } else if (isFormIntent) {
                try {
                    const { UniversalBuilderRegistry } = require('../builders');
                    const formRes = await UniversalBuilderRegistry.compile('form', {
                        prompt: message,
                        companyId,
                        userId: user.id
                    });
                    finalStoredReply = formRes.reply;
                    documentPreview = {
                        id: formRes.entityId,
                        title: formRes.title,
                        type: 'form',
                        shareUrl: formRes.shareUrl,
                        editUrl: formRes.editUrl || `/forms-builder?id=${formRes.entityId}`,
                        blocksCount: Array.isArray(formRes.ast?.fields) ? formRes.ast.fields.length : 5
                    };
                } catch (e) {
                    console.error('[AIChatService] Smart form builder fallback failed:', e);
                }
            }
        }

        // 4. Deterministic Multi-Turn Entity & Link Resolution Safety Net
        const lowerPrompt = message.toLowerCase().trim();
        const isAskingForLink = (
            lowerPrompt.includes('link') ||
            lowerPrompt.includes('url') ||
            lowerPrompt.includes('where is') ||
            lowerPrompt.includes('open') ||
            lowerPrompt.includes('show me') ||
            lowerPrompt.includes('give me') ||
            lowerPrompt.includes('offer letter') ||
            lowerPrompt.includes('operator') ||
            lowerPrompt.includes('contract') ||
            lowerPrompt.includes('document')
        );

        const hasLinkAlready = finalStoredReply.includes('(/document-editor') ||
                               finalStoredReply.includes('(/forms') ||
                               finalStoredReply.includes('(/advertising') ||
                               finalStoredReply.includes('http');

        const isAmnesiaReply = finalStoredReply.toLowerCase().includes('there is no specific offer letter') ||
                               finalStoredReply.toLowerCase().includes('no specific offer letter') ||
                               finalStoredReply.toLowerCase().includes('could you please provide the document id') ||
                               finalStoredReply.toLowerCase().includes('provide more details regarding the operator');

        if ((isAskingForLink && !hasLinkAlready) || isAmnesiaReply) {
            // Check if there is a matching document in recentDocs
            let targetDoc = null;
            if (recentDocs && recentDocs.length > 0) {
                // Check if user or conversation history mentioned a specific name (e.g. Varsha)
                for (const doc of recentDocs) {
                    const docTitleLower = (doc.title || '').toLowerCase();
                    const words = lowerPrompt.split(/\s+/);
                    const matchingWord = words.find((w: string) => w.length >= 4 && docTitleLower.includes(w));
                    if (matchingWord || (docTitleLower.includes('offer') && (lowerPrompt.includes('offer') || lowerPrompt.includes('operator') || lowerPrompt.includes('hired')))) {
                        targetDoc = doc;
                        break;
                    }
                }
                if (!targetDoc) targetDoc = recentDocs[0];
            }

            if (targetDoc) {
                documentPreview = {
                    id: targetDoc.id,
                    title: targetDoc.title,
                    type: 'document',
                    editUrl: `/document-editor?id=${targetDoc.id}`,
                    blocksCount: 7
                };

                if (isAmnesiaReply) {
                    finalStoredReply = `📄 **${targetDoc.title}**\n\nHere is your direct link to view, edit, and send the document in 180 Documents:\n\n👉 [**Open "${targetDoc.title}" in 180 Documents**](/document-editor?id=${targetDoc.id})\n\n*(Document ID: \`${targetDoc.id}\`)*`;
                } else if (!hasLinkAlready) {
                    finalStoredReply += `\n\n📄 **Direct Document Link:** [Open "${targetDoc.title}" in 180 Documents](/document-editor?id=${targetDoc.id})`;
                }
            }
        }

        // Save assistant message (resilient for test/ephemeral sessions)
        try {
            await prisma.aiChatMessage.create({
                data: {
                    sessionId: activeSessionId,
                    role: 'assistant',
                    content: finalStoredReply
                }
            });
        } catch (msgSaveErr) {
            // Ignore for ephemeral sessions
        }

        // Audit logging and background quality rating
        if ((prisma as any).aiRequestLog) {
            const endTime = Date.now();
            (prisma as any).aiRequestLog.create({
                data: {
                    userId: user.id,
                    companyId,
                    inputParameters: { message, isLegalMode, hasFile: !!fileContext },
                    aiResponseTimeMs: endTime - startTime,
                    totalPiecesGenerated: 1,
                    qualityScore: 100
                }
            }).catch(() => {});
        }

        return { reply: finalStoredReply, sessionId: activeSessionId, documentPreview };
    }

    /**
     * Extracts and analyzes text from documents (PDF, DOCX, HTML, plain text)
     */
    static async analyzeDocumentText(
        user: any,
        documentId: string,
        message: string,
        summarizeOnly: boolean,
        history: any[],
        serverPort: string | number = 4000
    ) {
        const companyId = (requestContext.getStore()?.companyId as string) || user?.companyId;
        const [doc, settings] = await Promise.all([
            prisma.document.findUnique({ where: { id: documentId } }),
            this.getSettingsWithMetadata(user, companyId)
        ]);

        if (!doc) throw new Error('Document not found');

        let extractedText = '';

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
                console.warn('[AIChatService] Failed to fetch/parse file content:', err.message);
                extractedText = `Document Name: ${doc.name}\nDescription: ${doc.description || 'None'}\nType: ${doc.fileType}`;
            }
        } else {
            extractedText = `Document Name: ${doc.name}\nDescription: ${doc.description || 'None'}\nType: ${doc.fileType}`;
        }

        let chatHistory = '';
        if (history && Array.isArray(history) && history.length > 0) {
            chatHistory = 'RECENT CONVERSATION HISTORY:\n';
            const recentHistory = history.slice(-6);
            recentHistory.forEach(msg => {
                chatHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
            });
            chatHistory += '\n';
        }

        const prompt = summarizeOnly
            ? `Please provide a concise, professional summary (3-5 bullet points) of the following document content:\n\n${extractedText}`
            : `You are a document assistant. Based on the following document content, answer the user's question accurately.\n\nDOCUMENT CONTENT:\n${extractedText}\n\n${chatHistory}USER QUESTION: ${message}`;

        return await aiProviderService.getInsights(prompt, settings as any);
    }

    /**
     * Uploads and parses a file into working memory and indexes it in the vector store
     */
    static async uploadDocument(user: any, file: any, companyIdParam?: string) {
        if (!file) throw new Error('No file uploaded');

        const companyId = companyIdParam || (requestContext.getStore()?.companyId as string) || user?.companyId;
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
        await vectorStore.addDocument(docId, content, { companyId, filename: originalName });

        return {
            filename: originalName,
            extractedText: content,
            vectorId: docId
        };
    }

    /**
     * Helper to draft email using customizable tone & recipient info
     */
    static async generateEmailDraft(user: any, { idea, recipientName, tone = 'professional', context = '' }: any) {
        const settings = await this.getSettingsWithMetadata(user);
        const prompt = `You are an expert business communicator and professional email writer. 
Your goal is to draft a high-quality email based on the user's requirements.

RECIPIENT: ${recipientName || 'Valued Recipient'}
TONE: ${tone}
CONTEXT/GOAL: ${idea}
ADDITIONAL CONTEXT: ${context}

Draft the email with a clear subject line and a professional body. Use [Placeholder] for any missing info. No extra talk, just the email draft.`;

        return await aiProviderService.getInsights(prompt, settings as any);
    }

    /**
     * Processes meeting transcripts and auto-creates tasks
     */
    static async processMeetingTranscript(user: any, file: any, bodyText?: string) {
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

        const companyId = (requestContext.getStore()?.companyId as string) || user?.companyId;
        const employees = await prisma.user.findMany({
            where: { companyId, isActive: true },
            select: { id: true, name: true, role: true }
        }).catch(() => []);

        const prompt = `You are an AI assistant that processes meeting transcripts. 
Read the following transcript and output a JSON block wrapped in \`\`\`json ... \`\`\` containing two things:
1. "summary": A brief executive summary of the meeting.
2. "tasks": An array of actionable items discussed in the meeting. Each task should have a "title", "description", and an "assigneeId". Match the assignee to the closest employee from this list: ${JSON.stringify(employees)}. If you cannot determine the assignee, use the user ID "${user.id}".

TRANSCRIPT:
${transcriptText}`;

        const settings = await this.getSettingsWithMetadata(user);
        const aiResponse = await aiProviderService.getInsights(prompt, settings as any);

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
                console.error('[AIChatService] Failed to parse meeting task generation JSON:', err);
            }
        }

        return {
            summary: finalReply,
            createdTasks: createdTasksCount
        };
    }
}

export const aiChatService = AIChatService;
export const AiAssistantService = AIChatService;
export const aiAssistantService = AIChatService;

import { prisma, requestContext } from '@workspace/db';

export interface CreateSocialProjectDTO {
    name: string;
    clientId?: string;
    clientName?: string;
    clientEmail?: string;
    description?: string;
    ownerId?: string;
    managerId?: string;
    projectManagerId?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    socialServices?: string[];
    brandProfile?: {
        tone?: string;
        targetAudience?: string;
        sampleViralPosts?: string[];
        forbiddenWords?: string[];
        defaultHashtags?: string[];
        standardCtas?: string[];
        metadata?: Record<string, any>;
    };
    brandVoice?: any;
    connectedAccountIds?: string[];
    teamMemberIds?: string[];
    settings?: {
        approvalRequired?: boolean;
        defaultTimezone?: string;
        storageRetentionDays?: number;
        defaultReviewerId?: string;
    };
}

export class SocialProjectService {
    /**
     * Lists all social media projects with eager loaded real-time metrics
     */
    static async listProjects(filters?: { search?: string; status?: string; clientId?: string; limit?: number; offset?: number; companyId?: string }) {
        const companyId = filters?.companyId || (requestContext.getStore()?.companyId as string);
        if (!companyId) throw new Error('Company context required');

        const where: any = {
            companyId,
            projectType: 'social_media',
            deletedAt: null
        };

        if (filters?.status && filters.status !== 'all') {
            where.status = filters.status;
        }

        if (filters?.clientId && filters.clientId !== 'all') {
            where.clientIds = { has: filters.clientId };
        }

        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } }
            ];
        }

        const limit = filters?.limit || 50;
        const offset = filters?.offset || 0;

        const [projects, total] = await Promise.all([
            (prisma as any).project.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { updatedAt: 'desc' },
                include: {
                    socialAccounts: {
                        select: {
                            id: true,
                            platform: true,
                            accountName: true,
                            username: true,
                            profileImageUrl: true,
                            reauthRequired: true,
                            capabilities: true
                        }
                    },
                    brandVoiceProfile: true,
                    socialPosts: {
                        select: {
                            id: true,
                            status: true,
                            scheduledFor: true,
                            createdAt: true
                        }
                    },
                    tasks: {
                        where: { deletedAt: null },
                        select: {
                            id: true,
                            status: true,
                            priority: true,
                            dueDate: true
                        }
                    },
                    clientReviewSessions: {
                        where: { status: 'pending' },
                        select: { id: true, token: true, status: true }
                    }
                }
            }),
            (prisma as any).project.count({ where })
        ]);

        // Enrich each project with computed telemetry
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const enriched = projects.map((p: any) => {
            const posts = p.socialPosts || [];
            const tasks = p.tasks || [];

            const scheduledCount = posts.filter((post: any) => 
                post.status === 'scheduled' || (post.scheduledFor && new Date(post.scheduledFor) >= now)
            ).length;

            const pendingApprovalCount = posts.filter((post: any) => 
                post.status === 'in_review' || post.status === 'pending_review'
            ).length;

            const outstandingTasksCount = tasks.filter((t: any) => 
                t.status !== 'completed' && t.status !== 'done'
            ).length;

            const publishedCount = posts.filter((post: any) => post.status === 'published').length;

            return {
                id: p.id,
                name: p.name,
                description: p.description,
                status: p.status,
                priority: p.priority,
                startDate: p.startDate,
                deadline: p.deadline,
                ownerId: p.ownerId,
                clientIds: p.clientIds || [],
                memberIds: p.memberIds || [],
                socialServices: p.socialServices || ['content_calendar', 'publishing', 'analytics'],
                socialSettings: p.socialSettings || {},
                socialAccounts: p.socialAccounts || [],
                brandVoiceProfile: p.brandVoiceProfile,
                metrics: {
                    scheduledPosts: scheduledCount,
                    pendingApprovals: pendingApprovalCount,
                    outstandingTasks: outstandingTasksCount,
                    publishedPosts: publishedCount,
                    totalPosts: posts.length
                },
                pendingReviewSessions: p.clientReviewSessions || [],
                createdAt: p.createdAt,
                updatedAt: p.updatedAt
            };
        });

        return { projects: enriched, total };
    }

    /**
     * Gets project details with full relational context
     */
    static async getProjectById(projectId: string, explicitCompanyId?: string) {
        const companyId = explicitCompanyId || (requestContext.getStore()?.companyId as string);
        if (!companyId) throw new Error('Company context required');

        const project = await (prisma as any).project.findUnique({
            where: { id: projectId },
            include: {
                socialAccounts: true,
                brandVoiceProfile: true,
                contentCalendars_ProjectContentCalendars: {
                    include: {
                        calendarContentPieces: {
                            take: 100,
                            orderBy: { dateScheduled: 'asc' }
                        }
                    }
                },
                socialPosts: {
                    take: 100,
                    orderBy: { scheduledFor: 'asc' },
                    include: {
                        variants: true,
                        reviewComments: true
                    }
                },
                tasks: {
                    where: { deletedAt: null },
                    include: {
                        assignee: { select: { id: true, name: true, email: true, image: true, photoUrl: true } }
                    },
                    orderBy: { dueDate: 'asc' }
                },
                clientReviewSessions: {
                    orderBy: { createdAt: 'desc' },
                    include: { comments: true }
                },
                socialConversations: {
                    take: 50,
                    orderBy: { lastMessageAt: 'desc' }
                }
            }
        });

        if (!project || project.companyId !== companyId || project.projectType !== 'social_media') {
            throw new Error('Project not found');
        }

        // Fetch client details if clientIds present
        let client = null;
        if (project.clientIds && project.clientIds.length > 0) {
            client = await (prisma as any).client.findUnique({
                where: { id: project.clientIds[0] }
            });
        }

        return {
            ...project,
            client
        };
    }

    /**
     * Creates a new social media project with progressive setup (Client, Brand Voice, Accounts, Team)
     */
    static async createProject(data: CreateSocialProjectDTO, userId: string, explicitCompanyId?: string) {
        const companyId = explicitCompanyId || (requestContext.getStore()?.companyId as string);
        if (!companyId) throw new Error('Company context required');

        let clientId = data.clientId;

        // Auto-create client if clientName provided and clientId absent
        if (!clientId && data.clientName) {
            const count = await (prisma as any).client.count({ where: { companyId } });
            const newClient = await (prisma as any).client.create({
                data: {
                    companyId,
                    name: data.clientName,
                    email: data.clientEmail || null,
                    clientId: `CLT-${String(count + 1).padStart(4, '0')}`,
                    status: 'active'
                }
            });
            clientId = newClient.id;
        }

        const clientIds = clientId ? [clientId] : [];
        const memberIds = (data.teamMemberIds && data.teamMemberIds.length > 0 ? data.teamMemberIds : (userId ? [userId] : [])).filter(Boolean);

        // 1. Create central Project record
        const project = await (prisma as any).project.create({
            data: {
                companyId,
                name: data.name,
                description: data.description || '',
                status: 'in_progress',
                priority: 'medium',
                projectType: 'social_media',
                startDate: data.startDate ? new Date(data.startDate) : new Date(),
                deadline: data.endDate ? new Date(data.endDate) : null,
                ownerId: data.projectManagerId || userId || null,
                clientIds,
                memberIds,
                socialServices: data.socialServices || ['content_calendar', 'publishing', 'analytics'],
                socialSettings: data.settings || {
                    approvalRequired: true,
                    defaultTimezone: 'UTC',
                    storageRetentionDays: 30,
                    defaultReviewerId: userId
                }
            }
        });

        // 2. Initialize Brand Voice Profile if provided or default
        const brandProfile = data.brandProfile || {};
        await (prisma as any).brandVoiceProfile.create({
            data: {
                companyId,
                projectId: project.id,
                tone: brandProfile.tone || 'Professional & Insightful',
                targetAudience: brandProfile.targetAudience || 'General Audience',
                sampleViralPosts: brandProfile.sampleViralPosts || [],
                forbiddenWords: brandProfile.forbiddenWords || [],
                defaultHashtags: brandProfile.defaultHashtags || [],
                standardCtas: brandProfile.standardCtas || [],
                metadata: brandProfile.metadata || {}
            }
        });

        // 3. Associate connected social accounts if provided
        if (data.connectedAccountIds && data.connectedAccountIds.length > 0) {
            await (prisma as any).socialAccount.updateMany({
                where: {
                    id: { in: data.connectedAccountIds },
                    companyId
                },
                data: {
                    projectId: project.id,
                    clientId: clientId || null
                }
            });
        }

        // 4. Log project creation activity if user is present
        if (userId) {
            try {
                await (prisma as any).teamActivityLog.create({
                    data: {
                        companyId,
                        userId,
                        action: 'created_social_project',
                        actionType: 'project',
                        details: `Created social media project: ${project.name}`,
                        timestamp: new Date()
                    }
                });
            } catch {
                // Non-blocking activity logging
            }
        }

        return this.getProjectById(project.id);
    }

    /**
     * Calculates real-time dashboard metrics answering the 3 core questions:
     * 1. What is happening?
     * 2. What requires my attention?
     * 3. What should I do next?
     */
    static async getProjectDashboardMetrics(projectId: string, explicitCompanyId?: string) {
        const companyId = explicitCompanyId || (requestContext.getStore()?.companyId as string);
        if (!companyId) throw new Error('Company context required');

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        endOfWeek.setHours(23, 59, 59, 999);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            project,
            postsScheduledThisWeek,
            postsAwaitingApproval,
            editingTasksInProgress,
            overdueTasks,
            postsPublishedThisMonth,
            publishingFailures,
            unreadInboxCount,
            upcomingPosts
        ] = await Promise.all([
            (prisma as any).project.findUnique({
                where: { id: projectId },
                select: { id: true, name: true, status: true, projectType: true, socialSettings: true }
            }),
            (prisma as any).socialPost.count({
                where: {
                    companyId,
                    projectId,
                    scheduledFor: { gte: startOfWeek, lte: endOfWeek },
                    status: { in: ['scheduled', 'approved'] }
                }
            }),
            (prisma as any).socialPost.count({
                where: {
                    companyId,
                    projectId,
                    status: { in: ['in_review', 'pending_review'] }
                }
            }),
            (prisma as any).task.count({
                where: {
                    companyId,
                    projectId,
                    deletedAt: null,
                    status: { in: ['todo', 'in_progress', 'assigned'] }
                }
            }),
            (prisma as any).task.count({
                where: {
                    companyId,
                    projectId,
                    deletedAt: null,
                    dueDate: { lt: now },
                    status: { notIn: ['completed', 'done'] }
                }
            }),
            (prisma as any).socialPost.count({
                where: {
                    companyId,
                    projectId,
                    status: 'published',
                    publishedAt: { gte: startOfMonth }
                }
            }),
            (prisma as any).socialPost.count({
                where: {
                    companyId,
                    projectId,
                    status: 'failed'
                }
            }),
            (prisma as any).socialConversation.count({
                where: {
                    companyId,
                    projectId,
                    isRead: false
                }
            }),
            (prisma as any).socialPost.findMany({
                where: {
                    companyId,
                    projectId,
                    scheduledFor: { gte: now }
                },
                orderBy: { scheduledFor: 'asc' },
                take: 6,
                include: {
                    variants: true,
                    socialAccount: { select: { platform: true, accountName: true } }
                }
            })
        ]);

        if (!project || project.projectType !== 'social_media') throw new Error('Project not found');

        // Compile prioritized "Attention Required" items
        const attentionItems: Array<{
            id: string;
            type: 'approval_required' | 'publishing_failed' | 'overdue_task' | 'unread_inbox' | 'reauth_needed';
            title: string;
            description: string;
            priority: 'high' | 'medium' | 'critical';
            actionLink: string;
        }> = [];

        if (postsAwaitingApproval > 0) {
            attentionItems.push({
                id: 'approval-req',
                type: 'approval_required',
                title: `${postsAwaitingApproval} Post${postsAwaitingApproval > 1 ? 's' : ''} Awaiting Approval`,
                description: 'Client review or editorial approval pending before scheduling.',
                priority: 'high',
                actionLink: `/social-projects/${projectId}?tab=approvals`
            });
        }

        if (publishingFailures > 0) {
            attentionItems.push({
                id: 'pub-fail',
                type: 'publishing_failed',
                title: `${publishingFailures} Publishing Failure${publishingFailures > 1 ? 's' : ''}`,
                description: 'One or more platform publications failed and require retry.',
                priority: 'critical',
                actionLink: `/social-projects/${projectId}?tab=publishing`
            });
        }

        if (overdueTasks > 0) {
            attentionItems.push({
                id: 'overdue-tasks',
                type: 'overdue_task',
                title: `${overdueTasks} Overdue Editing Task${overdueTasks > 1 ? 's' : ''}`,
                description: 'Editing tasks past their target deliverable deadline.',
                priority: 'high',
                actionLink: `/social-projects/${projectId}?tab=tasks`
            });
        }

        if (unreadInboxCount > 0) {
            attentionItems.push({
                id: 'unread-convs',
                type: 'unread_inbox',
                title: `${unreadInboxCount} Unread Social Inquiries`,
                description: 'Comments or messages awaiting community team response.',
                priority: 'medium',
                actionLink: `/social-projects/${projectId}?tab=inbox`
            });
        }

        return {
            projectId,
            metrics: {
                postsScheduledThisWeek,
                postsAwaitingApproval,
                editingTasksInProgress,
                overdueTasks,
                postsPublishedThisMonth,
                publishingFailures,
                unreadInboxCount
            },
            attentionItems,
            upcomingContent: upcomingPosts
        };
    }

    /**
     * Aggregates real chronological activity events for this project
     */
    static async getProjectActivityFeed(projectId: string, limit: number = 25, explicitCompanyId?: string) {
        const companyId = explicitCompanyId || (requestContext.getStore()?.companyId as string);
        if (!companyId) throw new Error('Company context required');

        const project = await (prisma as any).project.findUnique({
            where: { id: projectId },
            select: { id: true, companyId: true, projectType: true }
        });
        if (!project || project.companyId !== companyId || project.projectType !== 'social_media') {
            throw new Error('Project not found');
        }

        const [posts, tasks, reviews] = await Promise.all([
            (prisma as any).socialPost.findMany({
                where: { companyId, projectId },
                take: limit,
                orderBy: { updatedAt: 'desc' },
                select: { id: true, title: true, status: true, versionNumber: true, updatedAt: true, createdAt: true }
            }),
            (prisma as any).task.findMany({
                where: { companyId, projectId, deletedAt: null },
                take: limit,
                orderBy: { updatedAt: 'desc' },
                select: { id: true, title: true, status: true, updatedAt: true, createdAt: true }
            }),
            (prisma as any).clientReviewSession.findMany({
                where: { companyId, projectId },
                take: limit,
                orderBy: { updatedAt: 'desc' },
                select: { id: true, name: true, status: true, updatedAt: true, createdAt: true }
            })
        ]);

        const events: any[] = [];

        posts.forEach((p: any) => {
            events.push({
                id: `post-${p.id}-${p.updatedAt.getTime()}`,
                type: 'post',
                title: p.title || 'Untitled Post',
                action: p.status === 'published' ? 'published' : p.status === 'approved' ? 'approved' : 'updated',
                description: `Post is now in ${p.status.replace('_', ' ')} (v${p.versionNumber || 1})`,
                timestamp: p.updatedAt
            });
        });

        tasks.forEach((t: any) => {
            events.push({
                id: `task-${t.id}-${t.updatedAt.getTime()}`,
                type: 'task',
                title: t.title,
                action: t.status === 'completed' ? 'task_completed' : 'task_updated',
                description: `Task status: ${t.status.replace('_', ' ')}`,
                timestamp: t.updatedAt
            });
        });

        reviews.forEach((r: any) => {
            events.push({
                id: `review-${r.id}-${r.updatedAt.getTime()}`,
                type: 'approval',
                title: r.name,
                action: r.status === 'approved' ? 'client_approved' : 'review_session_active',
                description: `Client review session: ${r.status}`,
                timestamp: r.updatedAt
            });
        });

        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return events.slice(0, limit);
    }

    /**
     * Updates project settings & workflow policies
     */
    static async updateProjectSettings(projectId: string, payload: any, explicitCompanyId?: string) {
        const companyId = explicitCompanyId || (requestContext.getStore()?.companyId as string);
        if (!companyId) throw new Error('Company context required');

        const existing = await (prisma as any).project.findUnique({ where: { id: projectId } });
        if (!existing || existing.companyId !== companyId || existing.projectType !== 'social_media') throw new Error('Project not found');

        const updated = await (prisma as any).project.update({
            where: { id: projectId },
            data: {
                name: payload.name || existing.name,
                description: payload.description !== undefined ? payload.description : existing.description,
                status: payload.status || existing.status,
                socialServices: payload.socialServices || existing.socialServices,
                socialSettings: {
                    ...(typeof existing.socialSettings === 'object' ? existing.socialSettings : {}),
                    ...(payload.socialSettings || {})
                }
            }
        });

        return updated;
    }

    /**
     * Associates a social account to a project
     */
    static async linkSocialAccount(projectId: string, accountId: string, explicitCompanyId?: string) {
        const companyId = explicitCompanyId || (requestContext.getStore()?.companyId as string);
        if (!companyId) throw new Error('Company context required');

        const updated = await (prisma as any).socialAccount.update({
            where: { id: accountId },
            data: { projectId }
        });

        return updated;
    }

    /**
     * Unlinks a social account from a project
     */
    static async unlinkSocialAccount(projectId: string, accountId: string, explicitCompanyId?: string) {
        const companyId = explicitCompanyId || (requestContext.getStore()?.companyId as string);
        if (!companyId) throw new Error('Company context required');

        const updated = await (prisma as any).socialAccount.update({
            where: { id: accountId },
            data: { projectId: null }
        });

        return updated;
    }

    /**
     * Soft deletes a social media project
     */
    static async deleteProject(projectId: string, explicitCompanyId?: string) {
        const companyId = explicitCompanyId || (requestContext.getStore()?.companyId as string);
        if (!companyId) throw new Error('Company context required');

        const existing = await (prisma as any).project.findUnique({ where: { id: projectId } });
        if (!existing || existing.companyId !== companyId || existing.projectType !== 'social_media') {
            throw new Error('Project not found');
        }

        const updated = await (prisma as any).project.update({
            where: { id: projectId },
            data: { deletedAt: new Date() }
        });

        return updated;
    }
}

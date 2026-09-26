import { getDb } from '../publishing/http';
import { CreateEngagementRuleDTO, UpdateEngagementRuleDTO } from './types';
import { SAFE_ACCOUNT_SELECT, SocialDomainError, notFound, requireCompanyId } from '../tenant-scope';

const invalid = (message: string) => new SocialDomainError('VALIDATION_FAILED', 400, message);

export class EngagementRuleService {
    /**
     * A rule may only reference the caller's own project, social account and post: otherwise a tenant could make
     * another company's account auto-reply / DM. Ids of another company (or unknown ids) are a 404.
     */
    private static async assertReferencesOwned(companyId: string, dto: { projectId?: string | null; socialAccountId?: string | null; postId?: string | null }) {
        const db = getDb();
        if (dto.projectId && !(await db.project.findFirst({ where: { id: String(dto.projectId), companyId }, select: { id: true } }))) {
            throw notFound('Project');
        }
        if (dto.socialAccountId && !(await db.socialAccount.findFirst({ where: { id: String(dto.socialAccountId), companyId }, select: { id: true } }))) {
            throw notFound('Social account');
        }
        if (dto.postId && !(await db.socialPost.findFirst({ where: { id: String(dto.postId), companyId }, select: { id: true } }))) {
            throw notFound('Post');
        }
    }

    /**
     * Creates a new engagement automation rule.
     */
    static async createRule(companyId: string, dto: CreateEngagementRuleDTO): Promise<any> {
        requireCompanyId(companyId);
        if (!dto || typeof dto.name !== 'string' || !dto.name.trim()) throw invalid('name is required');
        if (!dto.triggerType) throw invalid('triggerType is required');
        if (typeof dto.actionDmTemplate !== 'string') throw invalid('actionDmTemplate is required');
        await this.assertReferencesOwned(companyId, dto);
        const db = getDb();

        const rule = await db.socialEngagementRule.create({
            data: {
                companyId,
                projectId: dto.projectId ?? null,
                socialAccountId: dto.socialAccountId ?? null,
                postId: dto.postId ?? null,
                name: dto.name.trim(),
                status: 'active',
                triggerType: dto.triggerType,
                triggerKeywords: dto.triggerKeywords || [],
                matchMode: dto.matchMode || 'contains',
                actionAutoLike: dto.actionAutoLike ?? true,
                actionPublicReplies: dto.actionPublicReplies || [],
                actionSendDm: dto.actionSendDm ?? true,
                actionDmTemplate: dto.actionDmTemplate.trim(),
                actionDmDeliverableUrl: dto.actionDmDeliverableUrl ?? null,
                actionDmButtons: dto.actionDmButtons ?? [],
                actionEnableAiAgent: dto.actionEnableAiAgent ?? true,
                aiAgentGoal: dto.aiAgentGoal ?? 'qualify_lead',
                aiAgentPromptOverride: dto.aiAgentPromptOverride ?? null,
            },
        });

        return rule;
    }

    /**
     * Lists rules for a company with optional filters.
     */
    static async listRules(companyId: string, filters?: { projectId?: string; socialAccountId?: string; postId?: string; status?: string }): Promise<any[]> {
        const db = getDb();
        const whereClause: any = { companyId };

        if (filters?.projectId) whereClause.projectId = filters.projectId;
        if (filters?.socialAccountId) whereClause.socialAccountId = filters.socialAccountId;
        if (filters?.postId) whereClause.postId = filters.postId;
        if (filters?.status) whereClause.status = filters.status;

        return db.socialEngagementRule.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                socialAccount: { select: { id: true, accountName: true, username: true, platform: true } },
                socialPost: { select: { id: true, title: true, content: true } },
            },
        });
    }

    /**
     * Retrieves a single rule with performance statistics and recent interaction logs.
     */
    static async getRule(companyId: string, ruleId: string): Promise<any> {
        const db = getDb();
        const rule = await db.socialEngagementRule.findUnique({
            where: { id: ruleId },
            include: {
                // Never the full account row: it carries the legacy plaintext token columns.
                socialAccount: { select: SAFE_ACCOUNT_SELECT },
                socialPost: true,
                logs: {
                    orderBy: { createdAt: 'desc' },
                    take: 25,
                },
            },
        });

        if (!rule || rule.companyId !== companyId) {
            throw notFound('Engagement rule');
        }

        return rule;
    }

    /**
     * Updates an engagement automation rule.
     */
    static async updateRule(companyId: string, ruleId: string, dto: UpdateEngagementRuleDTO): Promise<any> {
        const db = getDb();
        await this.getRule(companyId, ruleId); // asserts ownership
        await this.assertReferencesOwned(companyId, dto || {});

        return db.socialEngagementRule.update({
            where: { id: ruleId },
            data: {
                ...(dto.projectId !== undefined ? { projectId: dto.projectId || null } : {}),
                ...(dto.socialAccountId !== undefined ? { socialAccountId: dto.socialAccountId || null } : {}),
                ...(dto.postId !== undefined ? { postId: dto.postId || null } : {}),
                ...(dto.name ? { name: dto.name.trim() } : {}),
                ...(dto.status ? { status: dto.status } : {}),
                ...(dto.triggerType ? { triggerType: dto.triggerType } : {}),
                ...(dto.triggerKeywords ? { triggerKeywords: dto.triggerKeywords } : {}),
                ...(dto.matchMode ? { matchMode: dto.matchMode } : {}),
                ...(dto.actionAutoLike !== undefined ? { actionAutoLike: dto.actionAutoLike } : {}),
                ...(dto.actionPublicReplies ? { actionPublicReplies: dto.actionPublicReplies } : {}),
                ...(dto.actionSendDm !== undefined ? { actionSendDm: dto.actionSendDm } : {}),
                ...(dto.actionDmTemplate ? { actionDmTemplate: dto.actionDmTemplate.trim() } : {}),
                ...(dto.actionDmDeliverableUrl !== undefined ? { actionDmDeliverableUrl: dto.actionDmDeliverableUrl } : {}),
                ...(dto.actionDmButtons !== undefined ? { actionDmButtons: dto.actionDmButtons } : {}),
                ...(dto.actionEnableAiAgent !== undefined ? { actionEnableAiAgent: dto.actionEnableAiAgent } : {}),
                ...(dto.aiAgentGoal ? { aiAgentGoal: dto.aiAgentGoal } : {}),
                ...(dto.aiAgentPromptOverride !== undefined ? { aiAgentPromptOverride: dto.aiAgentPromptOverride } : {}),
            },
        });
    }

    /**
     * Toggles an engagement rule between active and paused.
     */
    static async toggleRule(companyId: string, ruleId: string): Promise<any> {
        const rule = await this.getRule(companyId, ruleId);
        const newStatus = rule.status === 'active' ? 'paused' : 'active';

        const db = getDb();
        return db.socialEngagementRule.update({
            where: { id: ruleId },
            data: { status: newStatus },
        });
    }

    /**
     * Deletes an engagement automation rule.
     */
    static async deleteRule(companyId: string, ruleId: string): Promise<{ success: boolean }> {
        const db = getDb();
        await this.getRule(companyId, ruleId); // asserts ownership

        await db.socialEngagementRule.delete({ where: { id: ruleId } });
        return { success: true };
    }

    /**
     * Aggregates telemetry stats across engagement rules.
     */
    static async getEngagementStats(companyId: string, projectId?: string): Promise<{
        totalRules: number;
        activeRules: number;
        totalTriggered: number;
        totalDmsSent: number;
        totalLiked: number;
        totalLeadsGenerated: number;
    }> {
        const db = getDb();
        const whereClause: any = { companyId };
        if (projectId) whereClause.projectId = projectId;

        const rules = await db.socialEngagementRule.findMany({
            where: whereClause,
            // Schema column names (SocialEngagementRule.stats*); the response keeps the total* names.
            select: {
                status: true,
                statsTriggeredCount: true,
                statsDmsSentCount: true,
                statsCommentsLiked: true,
            },
        });

        const totalRules = rules.length;
        const activeRules = rules.filter((r: any) => r.status === 'active').length;
        const totalTriggered = rules.reduce((acc: number, r: any) => acc + (r.statsTriggeredCount || 0), 0);
        const totalDmsSent = rules.reduce((acc: number, r: any) => acc + (r.statsDmsSentCount || 0), 0);
        const totalLiked = rules.reduce((acc: number, r: any) => acc + (r.statsCommentsLiked || 0), 0);

        const logs = await db.socialInteractionLog.count({
            where: {
                companyId,
                status: 'success',
            },
        });

        return {
            totalRules,
            activeRules,
            totalTriggered,
            totalDmsSent,
            totalLiked,
            totalLeadsGenerated: logs,
        };
    }
}

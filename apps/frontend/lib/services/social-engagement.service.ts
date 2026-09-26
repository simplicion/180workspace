import api from '@/lib/api';

export interface EngagementRule {
    id: string;
    companyId: string;
    projectId?: string | null;
    socialAccountId?: string | null;
    postId?: string | null;
    name: string;
    status: 'active' | 'paused' | 'archived';
    triggerType: 'comment_keyword' | 'comment_any' | 'dm_inbound' | 'mention';
    triggerKeywords: string[];
    matchMode: 'contains' | 'exact' | 'regex';
    actionAutoLike: boolean;
    actionPublicReplies: string[];
    actionSendDm: boolean;
    actionDmTemplate: string;
    actionDmDeliverableUrl?: string | null;
    actionDmButtons?: any;
    actionEnableAiAgent: boolean;
    aiAgentGoal: string;
    aiAgentPromptOverride?: string | null;
    totalTriggered: number;
    totalDmsSent: number;
    totalLiked: number;
    totalLeadsConverted: number;
    createdAt: string;
    updatedAt: string;
    socialAccount?: {
        id: string;
        accountName: string;
        username?: string;
        platform: string;
    } | null;
}

export interface EngagementStats {
    totalRules: number;
    activeRules: number;
    totalTriggered: number;
    totalDmsSent: number;
    totalLiked: number;
    totalLeadsConverted: number;
}

/** One drafted reply from POST /inbox/ai-reply-all/suggestions (BatchAiReplyItem on the server). */
export interface AiReplySuggestion {
    conversationId: string;
    platform: string;
    participantHandle: string;
    lastCustomerMessage: string;
    suggestedReply: string;
    tone: string;
    intent?: string;
    confidence?: number | null;
    /** False when the platform / messaging window does not allow this reply now. */
    canSend?: boolean;
    blockedReason?: string;
    selected: boolean;
}

export interface AiReplyDispatchItemResult {
    conversationId: string;
    status: 'sent' | 'rate_limited' | 'failed';
    code?: string;
    error?: string;
    retryAfterMs?: number;
}

export interface AiReplyDispatchResult {
    dispatched: number;
    failed: number;
    rateLimited: number;
    errors: string[];
    results: AiReplyDispatchItemResult[];
}

/** The API stores rule counters as stats*; the UI reads total*. */
function normalizeRule(r: any): EngagementRule {
    if (!r) return r;
    return {
        ...r,
        triggerKeywords: r.triggerKeywords || [],
        actionPublicReplies: r.actionPublicReplies || [],
        totalTriggered: r.statsTriggeredCount ?? r.totalTriggered ?? 0,
        totalDmsSent: r.statsDmsSentCount ?? r.totalDmsSent ?? 0,
        totalLiked: r.statsCommentsLiked ?? r.totalLiked ?? 0,
        totalLeadsConverted: r.statsLeadsConverted ?? r.totalLeadsConverted ?? 0,
    };
}

export interface CreateEngagementRuleDTO {
    name: string;
    projectId?: string;
    socialAccountId?: string;
    postId?: string;
    triggerType?: 'comment_keyword' | 'comment_any' | 'dm_inbound' | 'mention';
    triggerKeywords?: string[];
    matchMode?: 'contains' | 'exact' | 'regex';
    actionAutoLike?: boolean;
    actionPublicReplies?: string[];
    actionSendDm?: boolean;
    actionDmTemplate?: string;
    actionDmDeliverableUrl?: string;
    actionEnableAiAgent?: boolean;
    aiAgentGoal?: string;
    aiAgentPromptOverride?: string;
}

export const socialEngagementService = {
    async getRules(params?: { projectId?: string; triggerType?: string; status?: string }): Promise<EngagementRule[]> {
        const { data } = await api.get('/api/social-media/engagement/rules', { params });
        return (data.rules || []).map(normalizeRule);
    },

    async getRule(id: string): Promise<EngagementRule> {
        const { data } = await api.get(`/api/social-media/engagement/rules/${id}`);
        return normalizeRule(data.rule);
    },

    async createRule(payload: CreateEngagementRuleDTO): Promise<EngagementRule> {
        const { data } = await api.post('/api/social-media/engagement/rules', payload);
        return normalizeRule(data.rule);
    },

    async updateRule(id: string, payload: Partial<CreateEngagementRuleDTO>): Promise<EngagementRule> {
        const { data } = await api.put(`/api/social-media/engagement/rules/${id}`, payload);
        return normalizeRule(data.rule);
    },

    async toggleRule(id: string): Promise<EngagementRule> {
        const { data } = await api.patch(`/api/social-media/engagement/rules/${id}/toggle`);
        return normalizeRule(data.rule);
    },

    async deleteRule(id: string): Promise<{ success: boolean }> {
        const { data } = await api.delete(`/api/social-media/engagement/rules/${id}`);
        return data;
    },

    async getStats(projectId?: string): Promise<EngagementStats> {
        const { data } = await api.get('/api/social-media/engagement/stats', {
            params: projectId ? { projectId } : undefined
        });
        const st = data.stats || {};
        return { ...st, totalLeadsConverted: st.totalLeadsGenerated ?? st.totalLeadsConverted ?? 0 };
    },

    /** Dry-runs the saved active rules against a sample comment / DM (nothing is sent). */
    async testMatch(payload: { text: string; eventType: 'comment' | 'dm' | 'mention'; projectId?: string; platform?: string; socialAccountId?: string }): Promise<{ matched: boolean; rule: EngagementRule | null }> {
        const { data } = await api.post('/api/social-media/engagement/test-match', {
            socialAccountId: '',
            platform: 'instagram',
            senderId: 'test-sender',
            senderHandle: 'test_user',
            ...payload,
        });
        return { matched: !!data.matched, rule: data.rule ? normalizeRule(data.rule) : null };
    },

    // Centralized AI Reply All: draft -> review/edit -> dispatch
    async getAiReplyAllSuggestions(params?: { projectId?: string; platform?: string; limit?: number }): Promise<AiReplySuggestion[]> {
        const { data } = await api.post('/api/social-media/inbox/ai-reply-all/suggestions', params || {});
        return (data.suggestions || []).map((s: any) => ({ ...s, selected: s.canSend !== false }));
    },

    async dispatchAiReplyAll(replies: { conversationId: string; replyText: string }[]): Promise<AiReplyDispatchResult> {
        const { data } = await api.post('/api/social-media/inbox/ai-reply-all/dispatch', { replies });
        return data;
    },

    async toggleConversationAgent(conversationId: string, active: boolean): Promise<any> {
        const { data } = await api.post(`/api/social-media/inbox/conversations/${conversationId}/toggle-agent`, { active });
        return data;
    },

    async takeoverConversation(conversationId: string): Promise<any> {
        const { data } = await api.post(`/api/social-media/inbox/conversations/${conversationId}/takeover`);
        return data;
    },

    async convertToLead(conversationId: string): Promise<any> {
        const { data } = await api.post(`/api/social-media/inbox/conversations/${conversationId}/convert-to-lead`);
        return data;
    }
};

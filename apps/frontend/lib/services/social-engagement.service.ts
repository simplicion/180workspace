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

export interface AiReplySuggestion {
    conversationId: string;
    participantName: string;
    participantHandle: string;
    platform: string;
    lastCustomerMessage: string;
    suggestedReply: string;
    category: 'link' | 'price' | 'feedback' | 'general';
    confidence: number;
    approved: boolean;
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
        return data.rules || [];
    },

    async getRule(id: string): Promise<EngagementRule> {
        const { data } = await api.get(`/api/social-media/engagement/rules/${id}`);
        return data.rule;
    },

    async createRule(payload: CreateEngagementRuleDTO): Promise<EngagementRule> {
        const { data } = await api.post('/api/social-media/engagement/rules', payload);
        return data.rule;
    },

    async updateRule(id: string, payload: Partial<CreateEngagementRuleDTO>): Promise<EngagementRule> {
        const { data } = await api.put(`/api/social-media/engagement/rules/${id}`, payload);
        return data.rule;
    },

    async toggleRule(id: string): Promise<EngagementRule> {
        const { data } = await api.post(`/api/social-media/engagement/rules/${id}/toggle`);
        return data.rule;
    },

    async deleteRule(id: string): Promise<{ success: boolean }> {
        const { data } = await api.delete(`/api/social-media/engagement/rules/${id}`);
        return data;
    },

    async getStats(projectId?: string): Promise<EngagementStats> {
        const { data } = await api.get('/api/social-media/engagement/stats', {
            params: projectId ? { projectId } : undefined
        });
        return data.stats;
    },

    async testMatch(payload: { text: string; keywords: string[]; matchMode?: string }): Promise<{ matched: boolean; rule: any }> {
        const { data } = await api.post('/api/social-media/engagement/test-match', payload);
        return data;
    },

    // Centralized AI Reply All Batch
    async getAiReplyAllSuggestions(projectId?: string): Promise<{ suggestions: AiReplySuggestion[]; total: number }> {
        const { data } = await api.get('/api/social-media/inbox/ai-reply-all/suggestions', {
            params: projectId ? { projectId } : undefined
        });
        return {
            suggestions: (data.suggestions || []).map((s: any) => ({ ...s, approved: true })),
            total: data.total || 0
        };
    },

    async dispatchAiReplyAll(replies: { conversationId: string; text: string; approved: boolean }[]): Promise<any> {
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

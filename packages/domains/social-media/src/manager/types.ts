/**
 * 180 Manager & Multi-Agent Swarm — Core Type Contracts
 */

export type ManagerUserIntent =
    | 'analytics'
    | 'calendar_update'
    | 'inbox_hunt'
    | 'director_rule'
    | 'video_intel'
    | 'general_query';

export type DelegatedAgentType =
    | 'calendar'
    | 'inbox'
    | 'analytics'
    | 'director'
    | 'video_intel';

export interface ManagerAction {
    id: string;
    label: string;
    type: 'update_calendar' | 'open_inbox_conversation' | 'apply_director_rule' | 'analyze_video' | 'quick_reply';
    payload: Record<string, any>;
    icon?: string;
}

export interface ManagerTurnResult {
    reply: string;
    intent: ManagerUserIntent;
    delegatedAgents: DelegatedAgentType[];
    suggestedActions: ManagerAction[];
    conversationId: string;
    messageId?: string;
}

export interface CalendarPivotProposal {
    projectId: string;
    pivotReason: string;
    fromDay: number;
    toDay: number;
    targetMonth: string; // "YYYY-MM"
    newWinningFormat: string;
    proposedSlots: Array<{
        date: string;
        title: string;
        format: string;
        platform: string;
        contentPillar?: string;
    }>;
}

export interface InboxOpportunity {
    conversationId: string;
    platform: string;
    participantHandle: string;
    participantName?: string;
    lastMessage: string;
    opportunityType: 'deal' | 'lead' | 'vip_client' | 'partnership' | 'support_inquiry';
    confidence: number;
    inAppInboxDeepLink: string;
    summary: string;
}

export interface VideoTraitAnalysis {
    postId?: string;
    assetUrl?: string;
    durationSec?: number;
    hookScore: number;
    visualHookAnalysis: string;
    audioHookTranscript: string;
    pacingScore: number;
    cutsPerMinute?: number;
    energyLevel: 'high' | 'medium' | 'calm';
    detectedFormat: 'talking_head' | 'tutorial' | 'breakdown' | 'meme' | 'pov' | 'lifestyle';
    speechTranscript: string;
    viralityHypothesis: string;
}

export interface CrossAccountAnalyticsSummary {
    totalAccounts: number;
    accounts: Array<{
        id: string;
        platform: string;
        username: string;
        postsThisMonth: number;
        estimatedReach: number;
        engagements: number;
    }>;
    bestPerformingFormat: string;
    worstPerformingFormat: string;
    keyLearning: string;
}

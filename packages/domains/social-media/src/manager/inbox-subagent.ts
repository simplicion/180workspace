import { getDb } from '../publishing/http';
import { InboxOpportunity } from './types';
import { requireCompanyId } from '../tenant-scope';

const DEAL_KEYWORDS = [
    'pricing', 'cost', 'quote', 'hire', 'service', 'call', 'meeting', 'budget', 'work together',
    'sponsor', 'partnership', 'collab', 'consulting', 'retainer', 'agency', 'contract', 'proposal',
    'book a demo', 'how much', 'interested in your', 'available for'
];

export class InboxSubagent {
    /**
     * Scans multi-channel inboxes (Instagram, LinkedIn, etc.) for commercial opportunities, deals, and leads.
     */
    static async findOpportunities(
        companyId: string,
        options: { projectId?: string; platform?: string; limit?: number } = {}
    ): Promise<InboxOpportunity[]> {
        requireCompanyId(companyId);
        const limit = Math.min(Math.max(1, options.limit || 10), 50);

        const where: any = { companyId };
        if (options.projectId) where.projectId = options.projectId;
        if (options.platform) where.platform = options.platform;

        const conversations = await (getDb() as any).socialConversation.findMany({
            where,
            orderBy: { lastMessageAt: 'desc' },
            take: limit * 3,
        });

        const opportunities: InboxOpportunity[] = [];

        for (const conv of conversations) {
            const lastMessage = await (getDb() as any).socialMessage.findFirst({
                where: { conversationId: conv.id },
                orderBy: { createdAt: 'desc' },
            });

            if (!lastMessage || lastMessage.senderType !== 'participant') continue;

            const text = String(lastMessage.content || '').toLowerCase();
            const matchedKw = DEAL_KEYWORDS.filter((kw) => text.includes(kw));

            if (matchedKw.length > 0 || !conv.isRead) {
                let oppType: InboxOpportunity['opportunityType'] = 'lead';
                if (text.includes('sponsor') || text.includes('collab') || text.includes('partnership')) {
                    oppType = 'partnership';
                } else if (text.includes('pricing') || text.includes('quote') || text.includes('hire') || text.includes('budget')) {
                    oppType = 'deal';
                }

                opportunities.push({
                    conversationId: conv.id,
                    platform: conv.platform,
                    participantHandle: conv.participantHandle,
                    participantName: conv.participantName,
                    lastMessage: String(lastMessage.content || ''),
                    opportunityType: oppType,
                    confidence: Math.min(0.95, 0.6 + matchedKw.length * 0.15),
                    inAppInboxDeepLink: `/#/inbox?conversationId=${conv.id}`,
                    summary: `Inquiry from @${conv.participantHandle} on ${conv.platform.toUpperCase()} regarding: "${matchedKw.join(', ') || 'general inquiry'}".`,
                });
            }

            if (opportunities.length >= limit) break;
        }

        return opportunities;
    }

    /**
     * Assigns a conversation to the AI Agent or takes over for a human.
     */
    static async setConversationMode(companyId: string, conversationId: string, mode: 'ai_agent' | 'human_takeover') {
        requireCompanyId(companyId);
        return (getDb() as any).socialConversation.updateMany({
            where: { id: conversationId, companyId },
            data: {
                aiAgentActive: mode === 'ai_agent',
                isHumanTakeover: mode === 'human_takeover',
            },
        });
    }
}

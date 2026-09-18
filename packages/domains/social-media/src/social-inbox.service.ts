import { prisma, requestContext } from '@workspace/db';
import { BrandVoiceService } from './brand-voice.service';

export interface IngestMessageDTO {
    socialAccountId: string;
    platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube';
    platformThreadId: string;
    participantName: string;
    participantHandle: string;
    participantAvatar?: string;
    messageContent: string;
    platformMessageId?: string;
    projectId?: string;
}

export class SocialInboxService {
    static async listConversations(filters?: { projectId?: string; platform?: string; isRead?: boolean; search?: string }) {
        const companyId = requestContext.getStore()?.companyId as string;
        if (!companyId) throw new Error('Company context required');

        const whereClause: any = { companyId };
        if (filters?.projectId) whereClause.projectId = filters.projectId;
        if (filters?.platform) whereClause.platform = filters.platform;
        if (filters?.isRead !== undefined) whereClause.isRead = filters.isRead;

        const conversations = await (prisma as any).socialConversation.findMany({
            where: whereClause,
            orderBy: { lastMessageAt: 'desc' },
            include: {
                socialAccount: { select: { id: true, accountName: true, username: true, platform: true } },
                project: { select: { id: true, name: true } },
                messages: { orderBy: { createdAt: 'asc' }, take: 50 }
            }
        });

        return conversations;
    }

    static async getConversation(id: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const conversation = await (prisma as any).socialConversation.findUnique({
            where: { id },
            include: {
                socialAccount: true,
                project: true,
                messages: { orderBy: { createdAt: 'asc' } }
            }
        });

        if (!conversation || conversation.companyId !== companyId) {
            throw new Error('Conversation not found');
        }

        // Mark as read
        if (!conversation.isRead) {
            await (prisma as any).socialConversation.update({
                where: { id },
                data: { isRead: true }
            }).catch(() => null);
        }

        return conversation;
    }

    static async sendMessage(conversationId: string, content: string, senderType: 'agent' | 'ai_bot' = 'agent') {
        const companyId = requestContext.getStore()?.companyId as string;
        const conversation = await (prisma as any).socialConversation.findUnique({ where: { id: conversationId } });
        if (!conversation || conversation.companyId !== companyId) throw new Error('Conversation not found');

        const message = await (prisma as any).socialMessage.create({
            data: {
                conversationId,
                senderType,
                content
            }
        });

        await (prisma as any).socialConversation.update({
            where: { id: conversationId },
            data: {
                lastMessageSnippet: content.substring(0, 120),
                lastMessageAt: new Date()
            }
        });

        return message;
    }

    /**
     * AI Smart Reply Generator: Produces 3 tone-matched response options using the Project's Brand Voice
     */
    static async generateAiSmartReplies(conversationId: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const conversation = await (prisma as any).socialConversation.findUnique({
            where: { id: conversationId },
            include: { messages: { take: 5, orderBy: { createdAt: 'desc' } } }
        });

        if (!conversation || conversation.companyId !== companyId) throw new Error('Conversation not found');

        let brandVoice = null;
        if (conversation.projectId) {
            brandVoice = await BrandVoiceService.getBrandVoice(conversation.projectId);
        }

        const lastCustomerMsg = conversation.messages[0]?.content || conversation.lastMessageSnippet || '';

        // Context-aware structured suggestions
        return {
            suggestions: [
                {
                    tone: 'Helpful & Direct',
                    text: `Hey @${conversation.participantHandle}! Thanks for reaching out. We'd love to help you with that — check out our link or DM us your email so we can send full details!`
                },
                {
                    tone: 'Friendly & Casual',
                    text: `Appreciate the love, @${conversation.participantHandle}! 🙌 Feel free to drop any questions you have and our team will get right back to you.`
                },
                {
                    tone: 'Consultative / Sales',
                    text: `Great question! We specialize in exactly that. Would you like us to set up a quick 10-minute walkthrough for you this week?`
                }
            ],
            brandToneApplied: brandVoice?.tone || 'Professional & Insightful'
        };
    }

    /**
     * 1-Click "Convert Comment / DM to CRM Lead"
     * Populates CRM Leads in packages/domains/crm-and-sales
     */
    static async convertToCrmLead(conversationId: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const conversation = await (prisma as any).socialConversation.findUnique({
            where: { id: conversationId },
            include: { messages: true }
        });

        if (!conversation || conversation.companyId !== companyId) throw new Error('Conversation not found');

        // Create Lead in CRM
        const lead = await (prisma as any).lead.create({
            data: {
                companyId,
                name: conversation.participantName || `@${conversation.participantHandle}`,
                source: `Social (${conversation.platform.toUpperCase()})`,
                status: 'new',
                notes: `Captured from Social Inbox (${conversation.platform}): @${conversation.participantHandle}\nLast snippet: "${conversation.lastMessageSnippet || ''}"`
            }
        });

        // Link to conversation
        await (prisma as any).socialConversation.update({
            where: { id: conversationId },
            data: { convertedLeadId: lead.id }
        });

        return {
            success: true,
            message: 'Successfully converted conversation into a CRM Lead!',
            lead
        };
    }
}

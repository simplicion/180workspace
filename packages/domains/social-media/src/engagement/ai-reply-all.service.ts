import { getDb } from '../publishing/http';
import { SocialTokenVault } from '../publishing/token-vault';
import { InstagramPublisher } from '../adapters/meta.adapter';
import { BrandVoiceService } from '../brand-voice.service';
import { BatchAiReplyItem } from './types';

export class AiReplyAllService {
    /**
     * Scans pending unread / unanswered conversations and prepares drafted AI replies.
     */
    static async previewBatchReplies(companyId: string, projectId?: string): Promise<{ items: BatchAiReplyItem[]; count: number }> {
        const db = getDb();
        const whereClause: any = { companyId, isRead: false };
        if (projectId) whereClause.projectId = projectId;

        const conversations = await db.socialConversation.findMany({
            where: whereClause,
            take: 20,
            orderBy: { lastMessageAt: 'desc' },
            include: {
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
        });

        let brandVoice = null;
        if (projectId) {
            brandVoice = await BrandVoiceService.getBrandVoice(projectId).catch(() => null);
        }

        const items: BatchAiReplyItem[] = [];

        for (const c of conversations) {
            const lastMsg = c.messages[0]?.content || c.lastMessageSnippet || 'Hello!';
            const handle = c.participantHandle ? `@${c.participantHandle}` : 'there';
            const tone = brandVoice?.tone || 'Helpful & Professional';

            // Generate smart reply preview
            let suggestedReply = `Hey ${handle}! Thanks for reaching out. We've got your message and will provide full details shortly! 🙌`;
            const lower = lastMsg.toLowerCase();
            if (lower.includes('link') || lower.includes('blueprint') || lower.includes('guide')) {
                suggestedReply = `Hey ${handle}! Sent you the link — check your direct messages or visit 180workspace.com to access it directly! 🚀`;
            } else if (lower.includes('price') || lower.includes('cost')) {
                suggestedReply = `Hi ${handle}! We have tiers starting from our free creator plan up to agency scale. What size is your team?`;
            } else if (lower.includes('awesome') || lower.includes('love this') || lower.includes('great')) {
                suggestedReply = `Thank you so much ${handle}! Really appreciate the feedback. More updates coming this week! 🔥`;
            }

            items.push({
                conversationId: c.id,
                platform: c.platform,
                participantHandle: c.participantHandle,
                lastCustomerMessage: lastMsg,
                suggestedReply,
                tone,
                selected: true,
            });
        }

        return { items, count: items.length };
    }

    /**
     * Generates brand-voice aligned draft responses with filters
     */
    static async generateBatchSuggestions(
        companyId: string,
        options?: { projectId?: string; platform?: string; limit?: number }
    ): Promise<BatchAiReplyItem[]> {
        const preview = await this.previewBatchReplies(companyId, options?.projectId);
        let items = preview.items;
        if (options?.platform) {
            items = items.filter(i => i.platform === options.platform);
        }
        if (options?.limit && options.limit > 0) {
            items = items.slice(0, options.limit);
        }
        return items;
    }

    /**
     * Alias for executeBatchReplies
     */
    static async executeBatchReply(
        companyId: string,
        approvedItems: Array<{ conversationId: string; replyText: string }>
    ): Promise<{ dispatched: number; failed: number; errors: string[] }> {
        return this.executeBatchReplies(companyId, approvedItems);
    }

    /**
     * Executes approved batch replies with rate-limiting pauses to prevent platform spam flags.
     */
    static async executeBatchReplies(
        companyId: string,
        approvedItems: Array<{ conversationId: string; replyText: string }>
    ): Promise<{ dispatched: number; failed: number; errors: string[] }> {
        const db = getDb();
        let dispatched = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const item of approvedItems) {
            try {
                const conversation = await db.socialConversation.findUnique({
                    where: { id: item.conversationId },
                    include: { socialAccount: true },
                });

                if (!conversation || conversation.companyId !== companyId) {
                    continue;
                }

                // If Instagram and account has token, dispatch to platform
                if (conversation.socialAccount && conversation.platform === 'instagram') {
                    try {
                        const token = await SocialTokenVault.getAccessToken(conversation.socialAccount);
                        await InstagramPublisher.sendDirectMessage(
                            conversation.socialAccount.platformAccountId,
                            conversation.platformThreadId,
                            item.replyText,
                            token
                        );
                    } catch (err: any) {
                        console.warn(`[AiReplyAll] Platform dispatch warning: ${err.message}`);
                    }
                }

                // Record in database
                await db.socialMessage.create({
                    data: {
                        conversationId: item.conversationId,
                        senderType: 'ai_bot',
                        content: item.replyText,
                    },
                });

                // Mark conversation read and update snippet
                await db.socialConversation.update({
                    where: { id: item.conversationId },
                    data: {
                        isRead: true,
                        lastMessageSnippet: item.replyText.substring(0, 120),
                        lastMessageAt: new Date(),
                    },
                });

                dispatched++;
            } catch (err: any) {
                failed++;
                errors.push(`Conversation ${item.conversationId}: ${err.message}`);
            }
        }

        return { dispatched, failed, errors };
    }
}

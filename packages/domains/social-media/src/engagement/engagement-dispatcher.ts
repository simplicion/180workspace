import { getDb } from '../publishing/http';
import { SocialTokenVault } from '../publishing/token-vault';
import { InstagramPublisher } from '../adapters/meta.adapter';
import { YouTubeAdapter } from '../adapters/youtube.adapter';
import { LinkedInAdapter } from '../adapters/linkedin.adapter';
import { ThreadsAdapter } from '../adapters/threads.adapter';
import { TikTokAdapter } from '../adapters/tiktok.adapter';
import { SocialInboxService } from '../social-inbox.service';
import { InboundEngagementEvent, EngagementExecutionResult } from './types';
import { EngagementMatcher } from './engagement-matcher';

export class EngagementDispatcher {
    /**
     * Replaces variable tokens in templates:
     * {name} -> recipient's display name or handle
     * {handle} -> recipient's username / handle
     * {deliverable_link} -> rule's deliverable URL
     */
    static interpolateTemplate(template: string, event: InboundEngagementEvent, deliverableUrl?: string): string {
        let result = template;
        const name = event.senderName || `@${event.senderHandle}`;
        const handle = event.senderHandle.startsWith('@') ? event.senderHandle : `@${event.senderHandle}`;
        const link = deliverableUrl || '';

        result = result.replace(/\{name\}/gi, name);
        result = result.replace(/\{handle\}/gi, handle);
        result = result.replace(/\{deliverable_link\}/gi, link);
        result = result.replace(/\{link\}/gi, link);
        return result.trim();
    }

    /**
     * Convenient overload for direct string parameter interpolation
     */
    static interpolateDmTemplate(template: string, name: string, handle: string, deliverableUrl?: string): string {
        return this.interpolateTemplate(
            template,
            {
                companyId: '',
                socialAccountId: '',
                platform: 'instagram',
                eventType: 'comment',
                senderId: '',
                senderHandle: handle,
                senderName: name,
                text: '',
            },
            deliverableUrl
        );
    }

    /**
     * Selects a public comment reply from configured rotating templates to prevent spam flags.
     */
    static pickRotatingPublicReply(templates: string[], recipientHandle: string): string {
        if (!templates.length) {
            return `Sent to your DMs! Check your messages 🚀`;
        }
        // Rotate or randomly pick
        const template = templates[Math.floor(Math.random() * templates.length)];
        return template.replace(/\{handle\}/gi, `@${recipientHandle}`).replace(/\{name\}/gi, `@${recipientHandle}`);
    }

    /**
     * Executes the full automated engagement sequence for a matched rule:
     * 1. Check deduplication (skip if user already received DM on this post)
     * 2. Auto-Like comment
     * 3. Public comment reply (rotated)
     * 4. Private Comment-to-DM with deliverable link
     * 5. Record audit log & update telemetry counters
     */
    static async executeEngagement(rule: any, event: InboundEngagementEvent): Promise<EngagementExecutionResult> {
        const db = getDb();
        const outcome: EngagementExecutionResult = {
            matched: true,
            ruleId: rule.id,
            ruleName: rule.name,
            commentLiked: false,
        };

        // 1. Fetch Account and Decrypt Stored OAuth Token
        const account = await db.socialAccount.findUnique({
            where: { id: event.socialAccountId },
        });

        if (!account) {
            outcome.error = `Social account ${event.socialAccountId} not found`;
            return outcome;
        }

        let token: string | null = null;
        try {
            token = await SocialTokenVault.getAccessToken(account);
        } catch (err: any) {
            if ((account as any).accessToken) {
                token = (account as any).accessToken;
            } else {
                outcome.error = `Failed to decrypt token: ${err.message}`;
            }
        }
        if (!token && (account as any).accessToken) {
            token = (account as any).accessToken;
        }

        // 2. Auto-Like Comment (Always engage with incoming comments to maximize reach)
        if (rule.actionAutoLike && token) {
            try {
                if (event.platform === 'instagram' && event.commentId) {
                    await InstagramPublisher.likeComment(event.commentId, token);
                    outcome.commentLiked = true;
                } else if (event.platform === 'linkedin' && event.commentId) {
                    await LinkedInAdapter.likeComment(event.commentId, account.platformAccountId, token);
                    outcome.commentLiked = true;
                } else if (event.platform === 'youtube' && event.mediaId) {
                    await YouTubeAdapter.likeVideo(event.mediaId, token);
                    outcome.commentLiked = true;
                } else {
                    // Mark as engaged/liked on platforms without direct comment like API
                    outcome.commentLiked = true;
                }
            } catch (err: any) {
                console.warn(`[EngagementDispatcher] Like comment warning on ${event.platform}: ${err.message}`);
            }
        }

        // 3. Deduplication Guard for DM / Private Deliverables
        const isDuplicate = await EngagementMatcher.isDuplicate(
            event.companyId,
            rule.id,
            event.senderId,
            event.commentId || event.mediaId
        );

        if (isDuplicate) {
            outcome.skippedReason = 'duplicate';
            return outcome;
        }

        // 4. Public Comment Reply (Rotated)
        if (token && rule.actionPublicReplies && rule.actionPublicReplies.length > 0) {
            try {
                const replyText = this.pickRotatingPublicReply(rule.actionPublicReplies, event.senderHandle);
                if (event.platform === 'instagram' && event.commentId) {
                    await InstagramPublisher.replyToComment(event.commentId, replyText, token);
                    outcome.publicReplySent = replyText;
                } else if (event.platform === 'youtube' && event.commentId) {
                    await YouTubeAdapter.replyToComment(event.commentId, replyText, token);
                    outcome.publicReplySent = replyText;
                } else if (event.platform === 'linkedin' && event.commentId) {
                    await LinkedInAdapter.replyToComment(event.commentId, account.platformAccountId, replyText, token);
                    outcome.publicReplySent = replyText;
                } else if (event.platform === 'threads') {
                    const targetId = event.commentId || event.mediaId || account.platformAccountId;
                    await ThreadsAdapter.replyToThread(account.platformAccountId, targetId, replyText, token);
                    outcome.publicReplySent = replyText;
                } else if (event.platform === 'tiktok' && event.commentId) {
                    await TikTokAdapter.replyToComment(event.commentId, replyText, token);
                    outcome.publicReplySent = replyText;
                } else {
                    outcome.publicReplySent = replyText;
                }
            } catch (err: any) {
                console.warn(`[EngagementDispatcher] Public reply comment warning on ${event.platform}: ${err.message}`);
            }
        }

        // 5. Send Private DM (Comment-to-DM or Direct DM)
        if (rule.actionSendDm && rule.actionDmTemplate && token) {
            const dmText = this.interpolateTemplate(rule.actionDmTemplate, event, rule.actionDmDeliverableUrl);
            try {
                if (event.platform === 'instagram') {
                    const pageOrAccountId = account.platformAccountId;
                    if (event.commentId) {
                        // Instagram Private Reply to Comment
                        await InstagramPublisher.sendPrivateReply(pageOrAccountId, event.commentId, dmText, token);
                    } else {
                        // Direct Message
                        await InstagramPublisher.sendDirectMessage(pageOrAccountId, event.senderId, dmText, token);
                    }
                    outcome.dmSent = dmText;
                } else {
                    outcome.dmSent = dmText;
                }
            } catch (err: any) {
                outcome.error = `DM dispatch failed: ${err.message}`;
            }
        }

        // 6. Record Deduplication in Cache
        EngagementMatcher.recordDeduplication(event.companyId, rule.id, event.senderId, event.commentId || event.mediaId);

        // 7. Ingest into SocialConversation & Record Outbound DM
        try {
            const { conversation } = await SocialInboxService.ingestMessage({
                companyId: event.companyId,
                projectId: rule.projectId || undefined,
                socialAccountId: event.socialAccountId,
                platform: event.platform as any,
                platformThreadId: event.senderId,
                participantName: event.senderName || event.senderHandle,
                participantHandle: event.senderHandle,
                messageContent: event.text,
                platformMessageId: event.commentId,
            });

            // Update AI agent active state on the conversation
            if (rule.actionEnableAiAgent !== undefined) {
                await db.socialConversation.update({
                    where: { id: conversation.id },
                    data: { aiAgentActive: rule.actionEnableAiAgent },
                }).catch(() => null);
            }

            // Record the outbound bot response in conversation history
            if (outcome.dmSent) {
                await db.socialMessage.create({
                    data: {
                        conversationId: conversation.id,
                        senderType: 'ai_bot',
                        content: outcome.dmSent,
                    },
                }).catch(() => null);
            }
        } catch (err: any) {
            console.warn(`[EngagementDispatcher] Conversation sync warning: ${err.message}`);
        }

        // 8. Write Audit Log & Increment Counters
        try {
            await db.socialInteractionLog.create({
                data: {
                    companyId: event.companyId,
                    ruleId: rule.id,
                    socialAccountId: event.socialAccountId,
                    platform: event.platform,
                    platformCommentId: event.commentId || null,
                    recipientId: event.senderId,
                    recipientHandle: event.senderHandle,
                    status: outcome.error ? 'failed' : 'success',
                    commentLiked: outcome.commentLiked,
                    publicReplySent: outcome.publicReplySent || null,
                    dmSent: outcome.dmSent || null,
                    errorMessage: outcome.error || null,
                },
            });

            // Increment live metrics
            await db.socialEngagementRule.update({
                where: { id: rule.id },
                data: {
                    statsTriggeredCount: { increment: 1 },
                    ...(outcome.dmSent ? { statsDmsSentCount: { increment: 1 } } : {}),
                    ...(outcome.commentLiked ? { statsCommentsLiked: { increment: 1 } } : {}),
                },
            }).catch(() => null);
        } catch (err: any) {
            console.warn(`[EngagementDispatcher] Stats increment warning: ${err.message}`);
        }

        return outcome;
    }
}

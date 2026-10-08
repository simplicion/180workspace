import { prisma, requestContext } from '@workspace/db';
import { BrandVoiceService } from './brand-voice.service';
import { getDb } from './publishing/http';
import { SAFE_ACCOUNT_SELECT, SocialDomainError, notFound, requireCompanyId } from './tenant-scope';

export interface IngestMessageDTO {
    socialAccountId: string;
    platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'threads';
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

        const db = getDb();
        const whereClause: any = { companyId };
        if (filters?.projectId) whereClause.projectId = filters.projectId;
        if (filters?.platform) whereClause.platform = filters.platform;
        if (filters?.isRead !== undefined) whereClause.isRead = filters.isRead;

        const conversations = await db.socialConversation.findMany({
            where: whereClause,
            orderBy: { lastMessageAt: 'desc' },
            include: {
                socialAccount: { select: { id: true, accountName: true, username: true, platform: true, aiInboxMode: true } },
                project: { select: { id: true, name: true } },
                messages: { orderBy: { createdAt: 'asc' }, take: 50 }
            }
        });

        return conversations;
    }

    static async getConversation(id: string) {
        const companyId = requestContext.getStore()?.companyId as string;
        const db = getDb();
        const conversation = await db.socialConversation.findUnique({
            where: { id },
            include: {
                socialAccount: { select: { ...SAFE_ACCOUNT_SELECT, aiInboxMode: true } },
                project: true,
                messages: { orderBy: { createdAt: 'asc' } }
            }
        });

        if (!conversation || conversation.companyId !== companyId) {
            throw notFound('Conversation');
        }

        // Mark as read
        if (!conversation.isRead) {
            await db.socialConversation.update({
                where: { id },
                data: { isRead: true }
            }).catch(() => null);
        }

        return conversation;
    }

    /**
     * Sends a reply on the real platform (DM or public comment reply) and records it only once the provider accepted
     * it. Rate-limited sends answer 429 RATE_LIMITED with `retryAfterMs`.
     */
    static async sendMessage(conversationId: string, content: string, senderType: 'agent' | 'ai_bot' = 'agent') {
        const companyId = requireCompanyId(requestContext.getStore()?.companyId as string);
        const { sendToConversation } = require('./engagement/conversation-sender');
        const r = await sendToConversation(companyId, conversationId, content, senderType === 'ai_bot' ? 'ai_bot' : 'agent');
        if (r.status === 'rate_limited') {
            const e: any = new SocialDomainError('RATE_LIMITED', 429, `Rate limit reached for this account; try again in ${Math.ceil(r.retryAfterMs / 1000)}s`);
            e.details = { retryAfterMs: r.retryAfterMs };
            throw e;
        }
        return getDb().socialMessage.findFirst({ where: { id: r.messageId, conversationId } });
    }

    /**
     * AI smart replies: 3 options from the company's AI, grounded in the project's brand profile.
     * No provider → 503 AI_NOT_CONFIGURED (never canned suggestions).
     */
    static async generateAiSmartReplies(conversationId: string) {
        const companyId = requireCompanyId(requestContext.getStore()?.companyId as string);
        const db = getDb();
        const conversation = await db.socialConversation.findFirst({ where: { id: conversationId, companyId } });
        if (!conversation) throw notFound('Conversation');
        const ai = require('./engagement/engagement-ai');
        const llm = await ai.requireEngagementLlm(companyId);
        const brand = await ai.loadBrandForReplies(conversation.projectId, companyId);
        const history = await db.socialMessage.findMany({ where: { conversationId }, orderBy: { createdAt: 'desc' }, take: 8 });
        const transcript = history.reverse().map((m: any) => `${m.senderType === 'participant' ? 'USER' : 'BRAND'}: ${String(m.content).slice(0, 400)}`).join('\n');
        const prompt = `Suggest 3 different replies a ${conversation.platform} brand could send to the user's last message.
${brand.context ? `BRAND:\n${brand.context}\n` : ''}${brand.forbiddenWords.length ? `NEVER use: ${brand.forbiddenWords.join(', ')}\n` : ''}No invented prices, links or promises. Max 3 sentences each.
CONVERSATION:
${transcript || conversation.lastMessageSnippet || ''}
Return ONLY JSON: [{"tone": "short tone label", "text": "reply"}]`;
        const parsed = ai.parseLlmJson(await ai.generateWithTimeout(llm, prompt, 700));
        const suggestions = (Array.isArray(parsed) ? parsed : [])
            .map((s: any) => ({ tone: String(s?.tone || '').trim(), text: String(s?.text || '').trim() }))
            .filter((s: any) => s.text && !ai.findForbiddenWords(s.text, brand.forbiddenWords).length)
            .slice(0, 3);
        if (!suggestions.length) throw new SocialDomainError('AI_BAD_RESPONSE', 502, 'The AI provider returned no usable suggestions. Try again.');
        return { suggestions, brandToneApplied: brand.context ? 'project brand profile' : null };
    }

    /**
     * Converts a conversation into a CRM lead exactly once (idempotent): a second call returns the existing lead.
     */
    static async convertToCrmLead(conversationId: string, companyIdArg?: string, contact: { email?: string; phone?: string } = {}) {
        const db = getDb();
        const companyId = requireCompanyId(companyIdArg || (requestContext.getStore()?.companyId as string));
        const conversation = await db.socialConversation.findFirst({ where: { id: conversationId, companyId } });
        if (!conversation) throw notFound('Conversation');

        if (conversation.convertedLeadId) {
            const existing = await db.lead.findFirst({ where: { id: conversation.convertedLeadId, companyId } });
            if (existing) return { success: true, created: false, message: 'Conversation is already a CRM lead', lead: existing };
        }

        const lead = await db.lead.create({
            data: {
                companyId,
                name: conversation.participantName || `@${conversation.participantHandle}`,
                email: contact.email ?? null,
                phone: contact.phone ?? null,
                source: `Social (${String(conversation.platform).toUpperCase()})`,
                status: 'new',
                notes: `Captured from Social Inbox (${conversation.platform}): @${conversation.participantHandle}\nLast snippet: "${conversation.lastMessageSnippet || ''}"`,
            },
        });
        // Only the first writer links its lead; a concurrent second lead is removed again.
        const linked = await db.socialConversation.updateMany({
            where: { id: conversationId, companyId, OR: [{ convertedLeadId: null }, { convertedLeadId: conversation.convertedLeadId ?? null }] },
            data: { convertedLeadId: lead.id },
        });
        if (!linked.count) {
            await db.lead.deleteMany({ where: { id: lead.id, companyId } }).catch(() => null);
            const fresh = await db.socialConversation.findFirst({ where: { id: conversationId, companyId } });
            const existing = fresh?.convertedLeadId ? await db.lead.findFirst({ where: { id: fresh.convertedLeadId, companyId } }) : null;
            return { success: true, created: false, message: 'Conversation is already a CRM lead', lead: existing };
        }
        return { success: true, created: true, message: 'Converted conversation into a CRM lead', lead };
    }


    /**
     * Ingests an incoming message (or comment/mention) from a platform webhook into the database.
     * Upserts the conversation and inserts the message.
     */
    static async ingestMessage(dto: IngestMessageDTO & { companyId: string }) {
        const db = getDb();
        const {
            companyId,
            socialAccountId,
            platform,
            platformThreadId,
            participantName,
            participantHandle,
            participantAvatar,
            messageContent,
            platformMessageId,
            projectId,
        } = dto;

        // Upsert the conversation
        const conversation = await db.socialConversation.upsert({
            where: {
                companyId_platform_platformThreadId: {
                    companyId,
                    platform,
                    platformThreadId,
                },
            },
            update: {
                lastMessageSnippet: (messageContent || '').substring(0, 120),
                lastMessageAt: new Date(),
                isRead: false,
                ...(participantName ? { participantName } : {}),
                ...(participantHandle ? { participantHandle } : {}),
                ...(participantAvatar ? { participantAvatar } : {}),
            },
            create: {
                companyId,
                projectId: projectId ?? null,
                socialAccountId,
                platform,
                platformThreadId,
                participantName: participantName || participantHandle || 'Participant',
                participantHandle: participantHandle || 'anonymous',
                participantAvatar: participantAvatar ?? null,
                lastMessageSnippet: (messageContent || '').substring(0, 120),
                lastMessageAt: new Date(),
                isRead: false,
            },
        });

        // Idempotent on the provider message id (Meta re-delivers webhooks).
        if (platformMessageId) {
            const existing = await db.socialMessage.findFirst({ where: { conversationId: conversation.id, platformMessageId } });
            if (existing) return { conversation, message: existing, duplicate: true };
        }

        // Insert the incoming message
        const message = await db.socialMessage.create({
            data: {
                conversationId: conversation.id,
                senderType: 'participant',
                content: messageContent || '',
                platformMessageId: platformMessageId ?? null,
            },
        });

        return { conversation, message, duplicate: false };
    }

    /**
     * Active sync of conversations from connected platform accounts (Instagram Graph API, etc.)
     * Pulls recent DMs and media comments, ingesting them as SocialConversation and SocialMessage records.
     */
    static async syncConversations(params: { companyId: string; projectId?: string; platform?: string }) {
        const { companyId, projectId, platform } = params;
        if (!companyId) throw new SocialDomainError('UNAUTHENTICATED', 401, 'Company context required');

        const db = getDb();
        const { SocialTokenVault } = require('./publishing/token-vault');
        const { metaGraphUrl } = require('./publishing/config');
        const { providerFetch, readBody } = require('./publishing/http');

        const where: any = { companyId, isActive: true };
        if (projectId) where.projectId = projectId;
        if (platform) where.platform = platform;

        const accounts = await db.socialAccount.findMany({ where });
        let syncedCount = 0;
        const notes: string[] = [];

        for (const acc of accounts) {
            const plat = String(acc.platform).toLowerCase();
            if (plat !== 'instagram') continue;

            let token: string;
            try {
                token = await SocialTokenVault.getAccessToken(acc);
            } catch (err: any) {
                notes.push(`Account ${acc.accountName || acc.id}: cannot decrypt token (${err?.message || 'missing'})`);
                continue;
            }

            const igUserId = acc.platformAccountId;
            if (!igUserId) continue;

            // 1. Fetch Instagram Direct Conversations
            try {
                const convUrl = metaGraphUrl(
                    `${encodeURIComponent(igUserId)}/conversations?platform=instagram&fields=id,updated_time,participants,messages{id,created_time,from,message,to}&limit=15`,
                    token,
                    'instagram'
                );
                const res = await providerFetch('instagram', convUrl, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeoutMs: 15_000,
                });
                const body = await readBody(res);
                if (res.ok && Array.isArray(body?.data)) {
                    for (const thread of body.data) {
                        const threadId = String(thread.id || '');
                        if (!threadId) continue;
                        const participants = Array.isArray(thread.participants?.data) ? thread.participants.data : [];
                        const other = participants.find((p: any) => String(p.id) !== igUserId) || participants[0];
                        const participantName = other?.name || other?.username || (other?.id ? `User ${String(other.id).slice(-4)}` : 'Instagram User');
                        const participantHandle = other?.username || other?.id || 'anonymous';

                        const msgs = Array.isArray(thread.messages?.data) ? thread.messages.data : [];
                        const latest = msgs[0];
                        const text = latest?.message || '[Direct Message]';

                        await SocialInboxService.ingestMessage({
                            companyId,
                            projectId: acc.projectId || undefined,
                            socialAccountId: acc.id,
                            platform: 'instagram',
                            platformThreadId: threadId,
                            participantName,
                            participantHandle,
                            messageContent: text,
                            platformMessageId: latest?.id ? String(latest.id) : undefined,
                        });
                        syncedCount++;
                    }
                } else if (body?.error) {
                    notes.push(`Instagram DMs: ${body.error.message || 'error'}`);
                }
            } catch (err: any) {
                console.warn('[SocialInboxSync] Direct messages fetch failed:', err?.message);
                notes.push(`Instagram DMs sync: ${err?.message}`);
            }

            // 2. Fetch Recent Media Comments
            try {
                const mediaUrl = metaGraphUrl(
                    `${encodeURIComponent(igUserId)}/media?fields=id,caption,comments{id,text,timestamp,from,username}&limit=10`,
                    token,
                    'instagram'
                );
                const res = await providerFetch('instagram', mediaUrl, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeoutMs: 15_000,
                });
                const body = await readBody(res);
                if (res.ok && Array.isArray(body?.data)) {
                    for (const media of body.data) {
                        const comments = Array.isArray(media.comments?.data) ? media.comments.data : [];
                        for (const c of comments) {
                            const cid = String(c.id || '');
                            if (!cid) continue;
                            const fromUser = c.from?.username || c.username || 'Instagram User';
                            const fromHandle = c.from?.username || c.username || 'anonymous';
                            const text = c.text || '';
                            if (!text) continue;

                            await SocialInboxService.ingestMessage({
                                companyId,
                                projectId: acc.projectId || undefined,
                                socialAccountId: acc.id,
                                platform: 'instagram',
                                platformThreadId: `comment:${cid}`,
                                participantName: fromUser,
                                participantHandle: fromHandle,
                                messageContent: text,
                                platformMessageId: cid,
                            });
                            syncedCount++;
                        }
                    }
                } else if (body?.error) {
                    notes.push(`Instagram Comments: ${body.error.message || 'error'}`);
                }
            } catch (err: any) {
                console.warn('[SocialInboxSync] Media comments fetch failed:', err?.message);
                notes.push(`Instagram comments sync: ${err?.message}`);
            }
        }

        return {
            synced: syncedCount,
            accountsChecked: accounts.length,
            notes,
        };
    }

    /**
     * Seeds a realistic incoming test conversation for local verification.
     */
    static async seedTestConversation(companyId: string, projectId: string | null, socialAccountId?: string) {
        const db = getDb();
        const account = socialAccountId
            ? await db.socialAccount.findFirst({ where: { id: socialAccountId, companyId } })
            : await db.socialAccount.findFirst({ where: { companyId, platform: 'instagram', isActive: true } });

        const sid = account?.id || null;
        const pid = projectId || account?.projectId || null;

        return SocialInboxService.ingestMessage({
            companyId,
            projectId: pid || undefined,
            socialAccountId: sid || 'demo-ig',
            platform: 'instagram',
            platformThreadId: `test_${Date.now()}`,
            participantName: 'Alex Rivera',
            participantHandle: 'alex.rivera.brand',
            messageContent: 'Hey! Loved your recent video on personal branding. Are you currently taking new 1-on-1 strategy clients?',
            platformMessageId: `msg_${Date.now()}`,
        });
    }
}


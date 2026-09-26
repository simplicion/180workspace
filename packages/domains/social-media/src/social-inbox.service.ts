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
                socialAccount: { select: { id: true, accountName: true, username: true, platform: true } },
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
                socialAccount: { select: SAFE_ACCOUNT_SELECT },
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
}


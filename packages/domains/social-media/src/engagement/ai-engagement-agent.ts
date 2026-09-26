import { getDb } from '../publishing/http';
import { SocialInboxService } from '../social-inbox.service';
import { generateWithTimeout, findForbiddenWords, loadBrandForReplies, parseLlmJson, requireEngagementLlm } from './engagement-ai';
import { sendToConversation } from './conversation-sender';

export interface AiAgentTurnOutcome {
    replied: boolean;
    replyText?: string;
    leadConverted: boolean;
    humanEscalated: boolean;
    /** Set when nothing was sent; a typed code such as AI_NOT_CONFIGURED, AI_TIMEOUT, RATE_LIMITED, FORBIDDEN_WORDS. */
    error?: string;
    errorCode?: string;
}

const GOALS: Record<string, string> = {
    qualify_lead: 'Qualify the lead: understand their need and, when it fits, ask for an email or phone number so the team can follow up.',
    answer_support: 'Answer support questions accurately. If you do not know, say the team will follow up.',
    book_demo: 'Help them book a demo: ask for their email so the team can send a booking link.',
    deliver_resource: 'Make sure they received the resource they asked for and answer follow-up questions.',
};

export class AiEngagementAgent {
    static readonly EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    static readonly PHONE_REGEX = /(\+?[0-9]{1,3}[-.\s]?)?(\(?[0-9]{3}\)?[-.\s]?)[0-9]{3}[-.\s]?[0-9]{4}/;
    /** Explicit requests for a person. Deterministic, checked before any AI call. */
    public static readonly HUMAN_ESCALATION_KEYWORDS = [
        'talk to a human', 'speak to a human', 'real human', 'a human please', 'talk to a person', 'talk to someone', 'speak to someone',
        'talk to an agent', 'talk to agent', 'real person', 'support agent', 'live agent', 'stop bot', 'representative', 'operator',
    ];

    /**
     * One turn of the AI DM agent for an inbound message. Only runs when the conversation has the agent on and no human
     * took over. Tenant-scoped by `companyId`. Never sends canned text: every reply comes from the company's AI with the
     * project's brand profile; failures leave the message for a human (typed error on the outcome).
     */
    static async handleIncomingDm(conversationId: string, incomingText: string, companyId?: string): Promise<AiAgentTurnOutcome> {
        const db = getDb();
        const outcome: AiAgentTurnOutcome = { replied: false, leadConverted: false, humanEscalated: false };

        const conversation = await db.socialConversation.findFirst({ where: companyId ? { id: conversationId, companyId } : { id: conversationId } });
        if (!conversation) {
            outcome.error = `Conversation ${conversationId} not found`;
            outcome.errorCode = 'NOT_FOUND';
            return outcome;
        }
        const tenant = conversation.companyId as string;
        if (conversation.isHumanTakeover || !conversation.aiAgentActive) return outcome;

        const normalized = String(incomingText || '').toLowerCase();
        if (this.HUMAN_ESCALATION_KEYWORDS.some((kw) => normalized.includes(kw))) {
            await db.socialConversation.updateMany({ where: { id: conversationId, companyId: tenant }, data: { isHumanTakeover: true, isRead: false } });
            outcome.humanEscalated = true;
            return outcome;
        }

        // Lead capture: an email or phone in the message converts the thread to a CRM lead once.
        if (this.EMAIL_REGEX.test(incomingText) || this.PHONE_REGEX.test(incomingText)) {
            try {
                const r = await SocialInboxService.convertToCrmLead(conversationId, tenant, {
                    email: incomingText.match(this.EMAIL_REGEX)?.[0],
                    phone: incomingText.match(this.PHONE_REGEX)?.[0],
                });
                outcome.leadConverted = r.created;
            } catch (err: any) {
                console.warn(`[AiEngagementAgent] lead conversion failed: ${err.message}`);
            }
        }

        try {
            const llm = await requireEngagementLlm(tenant);
            const brand = await loadBrandForReplies(conversation.projectId, tenant);
            const history = await db.socialMessage.findMany({ where: { conversationId }, orderBy: { createdAt: 'desc' }, take: 10 });
            const transcript = history
                .reverse()
                .map((m: any) => `${m.senderType === 'participant' ? 'USER' : 'BRAND'}: ${String(m.content).slice(0, 500)}`)
                .join('\n');
            const rule = await db.socialEngagementRule.findFirst({ where: { companyId: tenant, socialAccountId: conversation.socialAccountId, status: 'active', actionEnableAiAgent: true } });
            const goal = GOALS[rule?.aiAgentGoal || 'qualify_lead'] || GOALS.qualify_lead;

            const prompt = `You are the ${conversation.platform} DM assistant for the brand below. Reply to the user's last message.
${brand.context ? `BRAND:\n${brand.context}\n` : ''}GOAL: ${goal}
${rule?.aiAgentPromptOverride ? `EXTRA INSTRUCTIONS FROM THE BRAND: ${String(rule.aiAgentPromptOverride).slice(0, 1000)}\n` : ''}${brand.forbiddenWords.length ? `NEVER use these words: ${brand.forbiddenWords.join(', ')}\n` : ''}${outcome.leadConverted ? 'The user just shared contact details; thank them and say the team will follow up.\n' : ''}Rules: at most 3 short sentences, no invented prices, links, discounts or promises. If the user is angry, asks for something you cannot answer, or wants a person, set "escalate": true.
CONVERSATION:
${transcript || `USER: ${incomingText}`}
Return ONLY JSON: {"reply": "...", "intent": "lead|question|support|praise|complaint|spam|other", "escalate": false}`;

            let parsed = parseLlmJson(await generateWithTimeout(llm, prompt, 400));
            let reply = typeof parsed?.reply === 'string' ? parsed.reply.trim() : '';
            if (reply && findForbiddenWords(reply, brand.forbiddenWords).length) {
                parsed = parseLlmJson(await generateWithTimeout(llm, `${prompt}\nYour previous answer used a forbidden word. Rewrite without: ${brand.forbiddenWords.join(', ')}`, 400));
                reply = typeof parsed?.reply === 'string' ? parsed.reply.trim() : '';
                if (findForbiddenWords(reply, brand.forbiddenWords).length) {
                    outcome.errorCode = 'FORBIDDEN_WORDS';
                    outcome.error = 'The AI reply used forbidden brand words; left for a human.';
                    return outcome;
                }
            }
            if (parsed?.escalate === true) {
                await db.socialConversation.updateMany({ where: { id: conversationId, companyId: tenant }, data: { isHumanTakeover: true, isRead: false } });
                outcome.humanEscalated = true;
                return outcome;
            }
            if (!reply) {
                outcome.errorCode = 'AI_BAD_RESPONSE';
                outcome.error = 'The AI provider returned no usable reply.';
                return outcome;
            }

            const sent = await sendToConversation(tenant, conversationId, reply, 'ai_bot');
            if (sent.status === 'rate_limited') {
                outcome.errorCode = 'RATE_LIMITED';
                outcome.error = `Rate limited; the conversation stays unread for a human (retry in ${Math.ceil(sent.retryAfterMs / 1000)}s).`;
                return outcome;
            }
            outcome.replied = true;
            outcome.replyText = reply;
        } catch (err: any) {
            outcome.errorCode = err?.code || 'SEND_FAILED';
            outcome.error = err?.message || String(err);
        }
        return outcome;
    }
}

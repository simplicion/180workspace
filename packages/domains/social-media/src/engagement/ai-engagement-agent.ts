import { getDb } from '../publishing/http';
import { SocialTokenVault } from '../publishing/token-vault';
import { InstagramPublisher } from '../adapters/meta.adapter';
import { SocialInboxService } from '../social-inbox.service';
import { BrandVoiceService } from '../brand-voice.service';
import { VAULT_ACCOUNT_SELECT } from '../tenant-scope';

export interface AiAgentTurnOutcome {
    replied: boolean;
    replyText?: string;
    leadConverted: boolean;
    humanEscalated: boolean;
    error?: string;
}

export class AiEngagementAgent {
    /**
     * Regex patterns to detect when a prospect provides lead information
     */
    private static readonly EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    private static readonly PHONE_REGEX = /(\+?[0-9]{1,3}[-.\s]?)?(\(?[0-9]{3}\)?[-.\s]?)[0-9]{3}[-.\s]?[0-9]{4}/;
    public static readonly HUMAN_ESCALATION_KEYWORDS = [
        'human',
        'talk to a person',
        'talk to an agent',
        'talk to agent',
        'real person',
        'support agent',
        'stop bot',
        'agent',
        'representative',
        'operator',
        'speak to someone',
        'live agent',
    ];

    /**
     * Handles an incoming message in an active conversation where the AI Engagement Agent is active.
     */
    static async handleIncomingDm(conversationId: string, incomingText: string): Promise<AiAgentTurnOutcome> {
        const db = getDb();
        const outcome: AiAgentTurnOutcome = {
            replied: false,
            leadConverted: false,
            humanEscalated: false,
        };

        // 1. Fetch Conversation with Messages
        const conversation = await db.socialConversation.findUnique({
            where: { id: conversationId },
            include: {
                socialAccount: { select: VAULT_ACCOUNT_SELECT },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!conversation) {
            outcome.error = `Conversation ${conversationId} not found`;
            return outcome;
        }

        // If human takeover has been initiated or agent is disabled, do not respond
        if (conversation.isHumanTakeover || !conversation.aiAgentActive) {
            return outcome;
        }

        const normalizedInput = incomingText.toLowerCase().trim();

        // 2. Safety & Human Escalation Check
        const isHumanRequest = this.HUMAN_ESCALATION_KEYWORDS.some((kw) => normalizedInput.includes(kw));
        if (isHumanRequest) {
            await db.socialConversation.update({
                where: { id: conversationId },
                data: { isHumanTakeover: true },
            });
            outcome.humanEscalated = true;

            const escalationMsg = "Understood! I'm pausing automated replies and alerting our team so a member of our team can step in and assist you directly.";
            await this.dispatchAgentMessage(conversation, escalationMsg);
            outcome.replied = true;
            outcome.replyText = escalationMsg;
            return outcome;
        }

        // 3. Lead Qualification Detection (Email / Phone / Buying Intent)
        const hasEmail = this.EMAIL_REGEX.test(incomingText);
        const hasPhone = this.PHONE_REGEX.test(incomingText);

        if ((hasEmail || hasPhone) && !conversation.convertedLeadId) {
            try {
                await SocialInboxService.convertToCrmLead(conversationId);
                outcome.leadConverted = true;
            } catch (err: any) {
                console.warn(`[AiEngagementAgent] Auto-convert lead warning: ${err.message}`);
            }
        }

        // 4. Synthesize Brand-Aligned Conversational Response
        let brandVoice = null;
        if (conversation.projectId) {
            brandVoice = await BrandVoiceService.getBrandVoice(conversation.projectId).catch(() => null);
        }

        const replyText = this.generateContextualResponse(incomingText, conversation, brandVoice, outcome.leadConverted);

        // 5. Dispatch Response to User's DM
        await this.dispatchAgentMessage(conversation, replyText);
        outcome.replied = true;
        outcome.replyText = replyText;

        return outcome;
    }

    /**
     * Generates a context-aware response incorporating Brand Voice and lead goals
     */
    private static generateContextualResponse(
        incomingText: string,
        conversation: any,
        brandVoice: any,
        justConvertedLead: boolean
    ): string {
        const handle = conversation.participantHandle ? `@${conversation.participantHandle}` : 'there';
        const tone = brandVoice?.tone || 'Professional & Insightful';

        if (justConvertedLead) {
            return `Awesome, got it ${handle}! 🙌 Our team has received your details and will follow up with full onboarding access shortly. In the meantime, let me know if you have any questions!`;
        }

        const lower = incomingText.toLowerCase();

        if (lower.includes('price') || lower.includes('cost') || lower.includes('pricing') || lower.includes('how much')) {
            return `Great question ${handle}! We have flexible tiers tailored for solo creators up to enterprise agencies. Drop your email here, and I'll send over the complete pricing breakdown and free trial access!`;
        }

        if (lower.includes('demo') || lower.includes('call') || lower.includes('meeting') || lower.includes('walkthrough')) {
            return `We'd love to show you a quick walkthrough! What's the best email to send our calendar booking link to?`;
        }

        if (lower.includes('thank') || lower.includes('awesome') || lower.includes('great')) {
            return `You're very welcome ${handle}! Excited to see what you build. Let me know whenever you're ready to explore more!`;
        }

        // Fallback natural engagement
        return `Thanks for reaching out ${handle}! What is your main focus with your content right now — scaling output, or converting viewers into leads?`;
    }

    /**
     * Dispatches the message via the platform API and records it in SocialMessage
     */
    private static async dispatchAgentMessage(conversation: any, text: string): Promise<void> {
        const db = getDb();
        const account = conversation.socialAccount;

        if (account && conversation.platform === 'instagram') {
            try {
                // Tokens come only from the encrypted vault (never the legacy plaintext columns).
                const token = await SocialTokenVault.getAccessToken(account);
                await InstagramPublisher.sendDirectMessage(account.platformAccountId, conversation.platformThreadId, text, token);
            } catch (err: any) {
                console.warn(`[AiEngagementAgent] Platform dispatch warning: ${err.message}`);
            }
        }

        // Record in database
        await db.socialMessage.create({
            data: {
                conversationId: conversation.id,
                senderType: 'ai_bot',
                content: text,
            },
        }).catch(() => null);

        await db.socialConversation.update({
            where: { id: conversation.id },
            data: {
                lastMessageSnippet: text.substring(0, 120),
                lastMessageAt: new Date(),
            },
        }).catch(() => null);
    }
}

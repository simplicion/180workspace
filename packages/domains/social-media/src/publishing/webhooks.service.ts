import crypto from 'crypto';
import { getDb } from './http';
import { metaWebhookAppSecret, metaWebhookVerifyToken } from './config';
import { SocialInboxService } from '../social-inbox.service';
import { EngagementMatcher } from '../engagement/engagement-matcher';
import { EngagementDispatcher } from '../engagement/engagement-dispatcher';
import { AiEngagementAgent } from '../engagement/ai-engagement-agent';
import { InboundEngagementEvent } from '../engagement/types';

export interface WebhookChallengeResult {
    success: boolean;
    challenge?: string;
    statusCode: number;
    error?: string;
}

export interface SignedRequestData {
    user_id?: string;
    algorithm?: string;
    issued_at?: number;
    [key: string]: any;
}

export interface DataDeletionResponse {
    url: string;
    confirmation_code: string;
}

export class MetaWebhooksService {
    /**
     * Verifies the GET hub.challenge handshake from Meta developer dashboard.
     * Meta requires returning the challenge param verbatim with 200 OK.
     */
    static verifyChallenge(query: Record<string, any>): WebhookChallengeResult {
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];
        const configuredToken = metaWebhookVerifyToken();

        if (!configuredToken) {
            console.error('[MetaWebhooks] META_WEBHOOK_VERIFY_TOKEN is not set; rejecting webhook verification with 503. Set it in the server environment.');
            return {
                success: false,
                statusCode: 503,
                error: 'META_WEBHOOK_VERIFY_TOKEN is not configured on this server.',
            };
        }

        if (mode === 'subscribe' && token === configuredToken) {
            return {
                success: true,
                challenge: String(challenge ?? ''),
                statusCode: 200,
            };
        }

        return {
            success: false,
            statusCode: 403,
            error: 'Verification token or mode mismatch.',
        };
    }

    /**
     * Verifies the x-hub-signature-256 header sent with every POST event from Meta.
     */
    static verifySignature(rawBody: Buffer | string, signatureHeader?: string): boolean {
        if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
            return false;
        }

        const secret = metaWebhookAppSecret();
        if (!secret) return false;

        const signature = signatureHeader.slice('sha256='.length);
        const bodyBuf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ''), 'utf8');

        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(bodyBuf);
        const expectedSig = hmac.digest('hex');

        if (signature.length !== expectedSig.length) return false;

        try {
            return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSig, 'utf8'));
        } catch {
            return false;
        }
    }

    /**
     * Decodes and cryptographically verifies a signed_request from Meta (used for Deauthorization and Data Deletion).
     */
    static parseSignedRequest(signedRequest: string): SignedRequestData {
        if (!signedRequest || typeof signedRequest !== 'string') {
            throw new Error('Missing signed_request parameter');
        }

        const parts = signedRequest.split('.');
        if (parts.length !== 2) {
            throw new Error('Invalid signed_request format (expected signature.payload)');
        }

        const [encodedSig, payloadB64] = parts;
        const secret = metaWebhookAppSecret();
        if (!secret) {
            throw new Error('Meta App Secret is not configured');
        }

        // Base64url decode signature
        const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
        const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest();

        if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(sig, expectedSig)) {
            throw new Error('Signature verification failed on signed_request');
        }

        // Base64url decode payload
        const rawJson = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        try {
            return JSON.parse(rawJson);
        } catch {
            throw new Error('Failed to parse signed_request payload JSON');
        }
    }

    /**
     * Handles Meta Deauthorization Callback (user uninstalled the app or revoked permissions in Facebook/IG settings).
     * Marks affected accounts as reauthRequired to protect against unauthorized publishing attempts.
     */
    static async handleDeauthorization(signedRequest: string): Promise<{ success: boolean; accountsAffected: number }> {
        const data = this.parseSignedRequest(signedRequest);
        const userId = data.user_id;
        if (!userId) {
            throw new Error('No user_id found in deauthorization signed_request');
        }

        const db = getDb();
        const accounts = await db.socialAccount.findMany({
            where: {
                platformAccountId: userId,
                platform: { in: ['facebook', 'instagram', 'threads'] },
            },
        });

        if (!accounts.length) {
            return { success: true, accountsAffected: 0 };
        }

        await db.socialAccount.updateMany({
            where: {
                platformAccountId: userId,
                platform: { in: ['facebook', 'instagram', 'threads'] },
            },
            data: {
                reauthRequired: true,
                reauthReason: 'User revoked app authorization in Meta account settings.',
            },
        });

        return { success: true, accountsAffected: accounts.length };
    }

    /**
     * Handles Meta Data Deletion Request Callback (GDPR / Meta compliance).
     * Deletes credentials and scrubs tokens for the specified Meta user_id, returning
     * a confirmation URL and tracking code required by Meta's Data Deletion protocol.
     */
    static async handleDataDeletion(signedRequest: string): Promise<DataDeletionResponse> {
        const data = this.parseSignedRequest(signedRequest);
        const userId = data.user_id;
        if (!userId) {
            throw new Error('No user_id found in data deletion signed_request');
        }

        const db = getDb();
        const confirmationCode = `del_${crypto.randomBytes(12).toString('hex')}`;

        const accounts = await db.socialAccount.findMany({
            where: {
                platformAccountId: userId,
                platform: { in: ['facebook', 'instagram', 'threads'] },
            },
        });

        for (const account of accounts) {
            // Delete encrypted vault credentials
            await db.socialAccountCredential.deleteMany({
                where: { socialAccountId: account.id },
            }).catch(() => null);

            // Clear deprecated plaintext columns and mark inactive
            await db.socialAccount.update({
                where: { id: account.id },
                data: {
                    accessToken: null,
                    refreshToken: null,
                    tokenExpiresAt: null,
                    isActive: false,
                    reauthRequired: true,
                    reauthReason: `Data deleted upon user request via Meta callback (Code: ${confirmationCode})`,
                    metadata: {
                        ...(typeof account.metadata === 'object' && account.metadata ? account.metadata : {}),
                        dataDeletion: {
                            requestedAt: new Date().toISOString(),
                            confirmationCode,
                        },
                    },
                },
            }).catch(() => null);
        }

        const baseUrl = (process.env.CLIENT_URL || 'https://180workspace.com').split(',')[0].trim().replace(/\/+$/, '');
        return {
            url: `${baseUrl}/data-deletion?id=${confirmationCode}`,
            confirmation_code: confirmationCode,
        };
    }

    /**
     * Ingests real-time events sent by Meta (Page feed/messages, Instagram DMs/comments, Threads replies).
     */
    static async handleWebhookEvent(payload: any): Promise<{ success: boolean; processedEntries: number; messagesIngested: number }> {
        if (!payload || typeof payload !== 'object') {
            return { success: false, processedEntries: 0, messagesIngested: 0 };
        }

        const db = getDb();
        const objectType = String(payload.object || '').toLowerCase();
        const entries = Array.isArray(payload.entry) ? payload.entry : [];
        let messagesIngested = 0;

        const defaultPlatform = objectType === 'instagram' ? 'instagram' : objectType === 'threads' ? 'threads' : 'facebook';

        for (const entry of entries) {
            const platformAccountId = String(entry.id || '');
            if (!platformAccountId) continue;

            // Find matching social accounts in our database
            const accounts = await db.socialAccount.findMany({
                where: {
                    platformAccountId,
                    platform: { in: [defaultPlatform, 'instagram', 'facebook', 'threads'] },
                    isActive: true,
                },
            });

            if (!accounts.length) continue;

            for (const account of accounts) {
                // 1. Process messaging events (Messenger / Instagram Direct Messages)
                if (Array.isArray(entry.messaging)) {
                    for (const m of entry.messaging) {
                        if (m.message && (m.message.text || m.message.attachments)) {
                            const senderId = m.sender?.id || 'unknown_sender';
                            const text = m.message.text || (m.message.attachments ? '[Media Attachment]' : '');
                            const ingestRes = await SocialInboxService.ingestMessage({
                                companyId: account.companyId,
                                projectId: account.projectId || undefined,
                                socialAccountId: account.id,
                                platform: account.platform as any,
                                platformThreadId: senderId,
                                participantName: `User ${senderId.slice(-4)}`,
                                participantHandle: senderId,
                                messageContent: text,
                                platformMessageId: m.message.mid || undefined,
                            }).catch(() => null);
                            messagesIngested++;

                            // If AI Engagement Agent is enabled for this conversation and human hasn't intervened, auto-respond
                            if (ingestRes && (ingestRes as any).conversation) {
                                const conv = (ingestRes as any).conversation;
                                if (conv.aiAgentActive && !conv.isHumanTakeover) {
                                    AiEngagementAgent.handleIncomingDm(
                                        conv.id,
                                        text
                                    ).catch((err: any) => console.error('[MetaWebhook] AiEngagementAgent error:', err.message));
                                }
                            }
                        }
                    }
                }

                // 2. Process changes (Feed comments, Instagram mentions, Threads replies)
                if (Array.isArray(entry.changes)) {
                    for (const ch of entry.changes) {
                        const val = ch.value;
                        if (!val) continue;

                        if (ch.field === 'comments' || ch.field === 'feed' || ch.field === 'replies') {
                            const commentText = val.text || val.message || '';
                            const fromUser = val.from?.name || val.from?.username || `User ${String(val.from?.id || '').slice(-4)}`;
                            const fromHandle = val.from?.username || val.from?.id || 'anonymous';
                            const threadId = val.id || val.comment_id || val.reply_id || `thread_${Date.now()}`;

                            if (commentText) {
                                await SocialInboxService.ingestMessage({
                                    companyId: account.companyId,
                                    projectId: account.projectId || undefined,
                                    socialAccountId: account.id,
                                    platform: account.platform as any,
                                    platformThreadId: threadId,
                                    participantName: fromUser,
                                    participantHandle: fromHandle,
                                    messageContent: commentText,
                                    platformMessageId: val.id || val.comment_id || undefined,
                                }).catch(() => null);
                                messagesIngested++;

                                // Evaluate 180 Engagement Automation Rules (Keyword Match -> Like -> Public Reply -> DM Deliverable)
                                const postId = val.media?.id || val.post_id || undefined;
                                const inboundEvent: InboundEngagementEvent = {
                                    companyId: account.companyId,
                                    projectId: account.projectId || undefined,
                                    socialAccountId: account.id,
                                    platform: account.platform as any,
                                    eventType: 'comment',
                                    postId,
                                    mediaId: postId,
                                    commentId: val.id || val.comment_id || undefined,
                                    senderId: val.from?.id || 'unknown_author',
                                    senderHandle: fromHandle,
                                    senderName: fromUser,
                                    text: commentText,
                                };

                                EngagementMatcher.findMatchingRule(inboundEvent).then((matchingRule) => {
                                    if (matchingRule) {
                                        return EngagementDispatcher.executeEngagement(matchingRule, inboundEvent);
                                    }
                                }).catch((err: any) => {
                                    console.error('[MetaWebhook] EngagementDispatcher error:', err.message);
                                });
                            }
                        }
                    }
                }
            }
        }

        return {
            success: true,
            processedEntries: entries.length,
            messagesIngested,
        };
    }
}

/**
 * Real provider calls for engagement actions (like, public reply, private reply / DM) per platform.
 * Every function either succeeds against the provider or throws; nothing is reported as sent otherwise.
 */
import { InstagramPublisher } from '../adapters/meta.adapter';
import { YouTubeAdapter } from '../adapters/youtube.adapter';
import { LinkedInAdapter } from '../adapters/linkedin.adapter';
import { ThreadsAdapter } from '../adapters/threads.adapter';
import { TikTokAdapter } from '../adapters/tiktok.adapter';
import { META_GRAPH_VERSION } from '../publishing/config';
import { PublishError } from '../publishing/errors';
import { expectOk, providerFetch } from '../publishing/http';
import { canonicalEngagementPlatform } from './capabilities';

export interface ActionAccount {
    platformAccountId: string;
}

const graph = (path: string) => `https://graph.facebook.com/${META_GRAPH_VERSION()}/${path}`;
const xApi = () => (process.env.X_API_BASE_URL?.trim() || 'https://api.x.com').replace(/\/+$/, '');

async function post(platform: string, url: string, token: string, body: Record<string, any>, what: string) {
    const res = await providerFetch(platform, url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeoutMs: 15_000,
    });
    return expectOk(platform, res, what);
}

const unsupported = (platform: string, what: string) =>
    new PublishError('PROVIDER_ERROR', `${what} is not supported on ${platform}`, { platform: platform as any });

export async function likeComment(platform: string, account: ActionAccount, commentId: string, token: string): Promise<void> {
    switch (canonicalEngagementPlatform(platform)) {
        case 'instagram':
            await InstagramPublisher.likeComment(commentId, token);
            return;
        case 'facebook':
            await post('facebook', graph(`${commentId}/likes`), token, {}, 'Facebook like comment');
            return;
        case 'linkedin':
            await LinkedInAdapter.likeComment(commentId, account.platformAccountId, token);
            return;
        case 'x':
            await post('x', `${xApi()}/2/users/${encodeURIComponent(account.platformAccountId)}/likes`, token, { tweet_id: commentId }, 'X like');
            return;
        default:
            throw unsupported(platform, 'Liking comments');
    }
}

export async function replyToComment(platform: string, account: ActionAccount, commentId: string, text: string, token: string, mediaId?: string): Promise<void> {
    switch (canonicalEngagementPlatform(platform)) {
        case 'instagram':
            await InstagramPublisher.replyToComment(commentId, text, token);
            return;
        case 'facebook':
            await post('facebook', graph(`${commentId}/comments`), token, { message: text }, 'Facebook reply to comment');
            return;
        case 'youtube':
            await YouTubeAdapter.replyToComment(commentId, text, token);
            return;
        case 'linkedin':
            await LinkedInAdapter.replyToComment(commentId, account.platformAccountId, text, token);
            return;
        case 'threads':
            await ThreadsAdapter.replyToThread(account.platformAccountId, commentId || mediaId || '', text, token);
            return;
        case 'tiktok':
            await TikTokAdapter.replyToComment(commentId, text, token);
            return;
        case 'x':
            await post('x', `${xApi()}/2/tweets`, token, { text, reply: { in_reply_to_tweet_id: commentId } }, 'X reply');
            return;
        default:
            throw unsupported(platform, 'Replying to comments');
    }
}

/** Comment-to-DM ("private reply") for Meta; a DM to the comment author on X. */
export async function sendPrivateReply(platform: string, account: ActionAccount, commentId: string, recipientId: string, text: string, token: string): Promise<void> {
    switch (canonicalEngagementPlatform(platform)) {
        case 'instagram':
            await InstagramPublisher.sendPrivateReply(account.platformAccountId, commentId, text, token);
            return;
        case 'facebook':
            await post('facebook', graph(`${account.platformAccountId}/messages`), token, { recipient: { comment_id: commentId }, message: { text } }, 'Facebook private reply');
            return;
        case 'x':
            await sendDirectMessage(platform, account, recipientId, text, token);
            return;
        default:
            throw unsupported(platform, 'Private replies');
    }
}

export async function sendDirectMessage(platform: string, account: ActionAccount, recipientId: string, text: string, token: string): Promise<void> {
    switch (canonicalEngagementPlatform(platform)) {
        case 'instagram':
            await InstagramPublisher.sendDirectMessage(account.platformAccountId, recipientId, text, token);
            return;
        case 'facebook':
            await post('facebook', graph(`${account.platformAccountId}/messages`), token, { recipient: { id: recipientId }, messaging_type: 'RESPONSE', message: { text } }, 'Facebook message');
            return;
        case 'x':
            await post('x', `${xApi()}/2/dm_conversations/with/${encodeURIComponent(recipientId)}/messages`, token, { text }, 'X direct message');
            return;
        default:
            throw unsupported(platform, 'Direct messages');
    }
}

/** Comment threads in the inbox are stored as `comment:<commentId>`; everything else is a DM thread keyed by user id. */
export const COMMENT_THREAD_PREFIX = 'comment:';
export const commentThreadId = (commentId: string) => `${COMMENT_THREAD_PREFIX}${commentId}`;
export function parseThread(platformThreadId: string): { kind: 'comment'; commentId: string } | { kind: 'dm'; recipientId: string } {
    return platformThreadId.startsWith(COMMENT_THREAD_PREFIX)
        ? { kind: 'comment', commentId: platformThreadId.slice(COMMENT_THREAD_PREFIX.length) }
        : { kind: 'dm', recipientId: platformThreadId };
}

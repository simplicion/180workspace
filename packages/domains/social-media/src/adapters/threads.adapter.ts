/**
 * Threads API Publisher: Official Meta Threads Publishing API.
 * Docs: developers.facebook.com/docs/threads/overview
 */
import { PublishError } from '../publishing/errors';
import { expectOk, pollUntil, providerFetch } from '../publishing/http';
import { PlatformPublisher, PublishInput, PublishOutcome, charLength, checkUrls, checkVideo } from './types';

const threadsBase = 'https://graph.threads.net/v1.0';

async function threadsPost(path: string, token: string, body: Record<string, any>, what: string) {
    const res = await providerFetch('threads', `${threadsBase}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return expectOk('threads', res, what);
}

async function threadsGet(path: string, token: string, what: string) {
    const res = await providerFetch('threads', `${threadsBase}/${path}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    });
    return expectOk('threads', res, what);
}

export class ThreadsPublisher implements PlatformPublisher {
    readonly platform = 'threads' as const;

    validate(input: PublishInput): string[] {
        const issues: string[] = [];
        if (charLength(input.caption) > 500) {
            issues.push('Threads posts are limited to 500 characters.');
        }
        checkUrls(input, issues);

        switch (input.format) {
            case 'video': {
                const v = input.media.find((m) => m.kind === 'video');
                if (!v) issues.push('Threads video posts require a video URL.');
                checkVideo(v, { minSec: 1, maxSec: 300, maxBytes: 1024 * 1024 * 1024 }, 'Threads video', issues);
                break;
            }
            case 'image': {
                const img = input.media.find((m) => m.kind === 'image');
                if (!img) issues.push('Threads image posts require an image URL.');
                break;
            }
            case 'carousel': {
                const items = input.media.filter((m) => m.kind !== 'document');
                if (items.length < 2 || items.length > 10) {
                    issues.push('Threads carousels need between 2 and 10 images or videos.');
                }
                break;
            }
            case 'text':
                if (!input.caption || !input.caption.trim()) {
                    issues.push('Threads text post cannot be empty.');
                }
                break;
        }
        return issues;
    }

    async publish(input: PublishInput, accessToken: string): Promise<PublishOutcome> {
        const userId = input.account.platformAccountId;
        if (!userId) {
            throw new PublishError('ACCOUNT_NOT_CONNECTED', 'Threads publishing requires a platform account ID (Threads user ID).', { platform: this.platform });
        }

        let containerId: string;

        if (input.format === 'video') {
            const v = input.media.find((m) => m.kind === 'video')!;
            const r = await threadsPost(`${userId}/threads`, accessToken, {
                media_type: 'VIDEO',
                video_url: v.url,
                text: input.caption,
            }, 'create Threads video container');
            containerId = r.id;
        } else if (input.format === 'image') {
            const img = input.media.find((m) => m.kind === 'image')!;
            const r = await threadsPost(`${userId}/threads`, accessToken, {
                media_type: 'IMAGE',
                image_url: img.url,
                text: input.caption,
            }, 'create Threads image container');
            containerId = r.id;
        } else if (input.format === 'carousel') {
            const children: string[] = [];
            for (const m of input.media.filter((i) => i.kind !== 'document')) {
                const body: Record<string, any> = { is_carousel_item: true };
                if (m.kind === 'video') {
                    body.media_type = 'VIDEO';
                    body.video_url = m.url;
                } else {
                    body.media_type = 'IMAGE';
                    body.image_url = m.url;
                }
                const cr = await threadsPost(`${userId}/threads`, accessToken, body, 'create Threads carousel item');
                children.push(cr.id);
            }
            const r = await threadsPost(`${userId}/threads`, accessToken, {
                media_type: 'CAROUSEL',
                children: children.join(','),
                text: input.caption,
            }, 'create Threads carousel container');
            containerId = r.id;
        } else {
            // Text only
            const r = await threadsPost(`${userId}/threads`, accessToken, {
                media_type: 'TEXT',
                text: input.caption,
            }, 'create Threads text container');
            containerId = r.id;
        }

        // Wait for container to be ready if media was uploaded
        if (input.format === 'video' || input.format === 'carousel') {
            await pollUntil(
                async () => {
                    const statusRes = await threadsGet(`${containerId}?fields=status,error_message`, accessToken, 'check Threads container status');
                    if (statusRes.status === 'FINISHED' || statusRes.status === 'ERROR') return statusRes;
                    return undefined;
                },
                {
                    attempts: 30,
                    intervalMs: 3_000,
                    onTimeout: () => new PublishError('PROVIDER_TIMEOUT', 'Threads container timed out processing media.', { platform: this.platform }),
                }
            );
        }

        // Publish container
        const pub = await threadsPost(`${userId}/threads_publish`, accessToken, {
            creation_id: containerId,
        }, 'publish Threads container');

        const publishedId = pub.id || containerId;
        const handle = input.account.username || 'user';
        const url = `https://www.threads.net/@${handle}/post/${publishedId}`;

        return {
            externalId: publishedId,
            url,
            state: 'published',
            meta: { containerId, threadsUserId: userId },
        };
    }
}

export class ThreadsAdapter {
    static async replyToThread(userId: string, threadId: string, text: string, accessToken: string): Promise<{ replyId: string }> {
        if (!accessToken || accessToken.startsWith('mock_')) {
            return { replyId: `th_reply_${Math.random().toString(36).substring(2, 10)}` };
        }
        const container = await threadsPost(`${userId}/threads`, accessToken, {
            media_type: 'TEXT',
            text,
            reply_to_id: threadId,
        }, 'create Threads reply container');

        const pub = await threadsPost(`${userId}/threads_publish`, accessToken, {
            creation_id: container.id,
        }, 'publish Threads reply');

        return { replyId: pub.id || container.id };
    }
}


/**
 * Meta publishers: Instagram (Graph API content publishing via media containers) and Facebook Pages.
 * Tokens: the stored token is the Page access token (derived from a long-lived user token, so it does not expire);
 * Instagram professional accounts publish with the token of the Page they are linked to.
 * Docs: developers.facebook.com/docs/instagram-platform/content-publishing, /docs/pages-api/posts, /docs/video-api/guides/reels-publishing
 */
import { META_GRAPH_VERSION, intEnv } from '../publishing/config';
import { PublishError } from '../publishing/errors';
import { expectOk, pollUntil, providerFetch } from '../publishing/http';
import { PlatformPublisher, PublishInput, PublishOutcome, charLength, checkAspect, checkUrls, checkVideo } from './types';

const graph = (path: string) => `https://graph.facebook.com/${META_GRAPH_VERSION()}/${path}`;

async function graphPost(platform: string, path: string, token: string, body: Record<string, any>, what: string) {
    const res = await providerFetch(platform, graph(path), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return expectOk(platform, res, what);
}

async function graphGet(platform: string, path: string, token: string, what: string) {
    const res = await providerFetch(platform, graph(path), { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
    return expectOk(platform, res, what);
}

// ── Instagram ────────────────────────────────────────────────────────────────

export class InstagramPublisher implements PlatformPublisher {
    readonly platform = 'instagram' as const;

    validate(input: PublishInput): string[] {
        const issues: string[] = [];
        if (charLength(input.caption) > 2200) issues.push('Instagram captions are limited to 2,200 characters.');
        if ((input.caption.match(/#[\p{L}\p{N}_]+/gu) || []).length > 30) issues.push('Instagram allows at most 30 hashtags.');
        if ((input.caption.match(/@[\w.]+/g) || []).length > 20) issues.push('Instagram allows at most 20 @mentions.');
        if (input.firstComment && charLength(input.firstComment) > 2200) issues.push('Instagram first comment is limited to 2,200 characters.');
        checkUrls(input, issues);
        switch (input.format) {
            case 'video': {
                const v = input.media.find((m) => m.kind === 'video');
                if (!v) issues.push('Instagram Reels need a video.');
                checkVideo(v, { minSec: 3, maxSec: 900, maxBytes: 1024 * 1024 * 1024, minAspect: 0.01, maxAspect: 10 }, 'Instagram Reel', issues);
                break;
            }
            case 'image': {
                const img = input.media.find((m) => m.kind === 'image');
                if (!img) issues.push('Instagram image posts need an image.');
                else {
                    checkAspect(img, { minAspect: 0.8, maxAspect: 1.91 }, 'Instagram image', issues);
                    if (img.sizeBytes && img.sizeBytes > 8 * 1024 * 1024) issues.push('Instagram images must be at most 8 MB.');
                    if (/\.(png|gif|webp)(\?|$)/i.test(img.url)) issues.push('Instagram only accepts JPEG images.');
                }
                break;
            }
            case 'carousel': {
                const items = input.media.filter((m) => m.kind !== 'document');
                if (items.length < 2 || items.length > 10) issues.push('Instagram carousels need 2 to 10 images or videos.');
                items.filter((m) => m.kind === 'video').forEach((m, i) => checkVideo(m, { minSec: 3, maxSec: 60 }, `Carousel video ${i + 1}`, issues));
                items.filter((m) => m.kind === 'image').forEach((m, i) => checkAspect(m, { minAspect: 0.8, maxAspect: 1.91 }, `Carousel image ${i + 1}`, issues));
                break;
            }
            default:
                issues.push(`Instagram cannot publish ${input.format} posts (use a Reel, image or carousel).`);
        }
        return issues;
    }

    private async waitForContainer(id: string, token: string) {
        await pollUntil(
            async () => {
                const s = await graphGet('instagram', `${id}?fields=status_code,status`, token, 'Instagram container status');
                if (s.status_code === 'FINISHED' || s.status_code === 'PUBLISHED') return true;
                if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') {
                    throw new PublishError('PROVIDER_ERROR', `Instagram could not process the media: ${s.status || s.status_code}`, { platform: 'instagram' });
                }
                return undefined;
            },
            {
                attempts: intEnv('IG_CONTAINER_POLL_ATTEMPTS', 60),
                intervalMs: intEnv('IG_CONTAINER_POLL_MS', 5000),
                onTimeout: () => new PublishError('PROVIDER_TIMEOUT', 'Instagram is still processing the media; try again shortly.', { retryable: true, platform: 'instagram' }),
            },
        );
    }

    async publish(input: PublishInput, token: string): Promise<PublishOutcome> {
        const ig = input.account.platformAccountId;
        let creationId: string;

        if (input.format === 'carousel') {
            const children: string[] = [];
            for (const m of input.media.filter((x) => x.kind !== 'document')) {
                const body = m.kind === 'video' ? { media_type: 'VIDEO', video_url: m.url, is_carousel_item: true } : { image_url: m.url, is_carousel_item: true };
                const c = await graphPost('instagram', `${ig}/media`, token, body, 'Instagram carousel item');
                children.push(c.id);
            }
            for (const c of children) await this.waitForContainer(c, token);
            const parent = await graphPost('instagram', `${ig}/media`, token, { media_type: 'CAROUSEL', children: children.join(','), caption: input.caption }, 'Instagram carousel container');
            creationId = parent.id;
        } else if (input.format === 'video') {
            const v = input.media.find((m) => m.kind === 'video')!;
            const body: Record<string, any> = {
                media_type: 'REELS',
                video_url: v.url,
                caption: input.caption,
                share_to_feed: input.platformMeta.shareToFeed !== false,
            };
            if (input.platformMeta.coverUrl || input.thumbnailUrl) body.cover_url = input.platformMeta.coverUrl || input.thumbnailUrl;
            if (input.platformMeta.thumbOffsetMs != null) body.thumb_offset = Number(input.platformMeta.thumbOffsetMs);
            const c = await graphPost('instagram', `${ig}/media`, token, body, 'Instagram Reel container');
            creationId = c.id;
        } else {
            const img = input.media.find((m) => m.kind === 'image')!;
            const c = await graphPost('instagram', `${ig}/media`, token, { image_url: img.url, caption: input.caption }, 'Instagram image container');
            creationId = c.id;
        }

        await this.waitForContainer(creationId, token);
        const published = await graphPost('instagram', `${ig}/media_publish`, token, { creation_id: creationId }, 'Instagram publish');
        const mediaId = String(published.id);

        let url: string | null = null;
        try {
            const info = await graphGet('instagram', `${mediaId}?fields=permalink`, token, 'Instagram permalink');
            url = info.permalink || null;
        } catch {
            url = null;
        }

        let warning: string | undefined;
        if (input.firstComment?.trim()) {
            try {
                await graphPost('instagram', `${mediaId}/comments`, token, { message: input.firstComment }, 'Instagram first comment');
            } catch (e: any) {
                warning = `Posted, but the first comment failed: ${e.message}`;
            }
        }
        return { externalId: mediaId, url, state: 'published', meta: { creationId }, warning };
    }

    /** Replies publicly to an Instagram comment */
    static async replyToComment(commentId: string, message: string, token: string): Promise<{ id: string }> {
        if (!token || token.startsWith('mock_')) {
            return { id: `mock_reply_${Date.now()}` };
        }
        return graphPost('instagram', `${commentId}/replies`, token, { message }, 'Instagram reply to comment');
    }

    /** Likes an Instagram comment */
    static async likeComment(commentId: string, token: string): Promise<{ success: boolean }> {
        if (!token || token.startsWith('mock_')) {
            return { success: true };
        }
        return graphPost('instagram', `${commentId}/likes`, token, {}, 'Instagram like comment');
    }

    /**
     * Sends a private reply (Comment-to-DM) via Messenger API for Instagram.
     * Note: Must be executed within 7 days of the comment.
     */
    static async sendPrivateReply(pageOrAccountId: string, commentId: string, messageText: string, token: string): Promise<{ recipient_id: string; message_id: string }> {
        if (!token || token.startsWith('mock_')) {
            return { recipient_id: 'mock_recipient', message_id: `mock_msg_${Date.now()}` };
        }
        return graphPost(
            'instagram',
            `${pageOrAccountId}/messages`,
            token,
            {
                recipient: { comment_id: commentId },
                message: { text: messageText },
            },
            'Instagram private reply to comment'
        );
    }

    /**
     * Sends a direct message to an Instagram user (within active 24-hr messaging window).
     */
    static async sendDirectMessage(pageOrAccountId: string, recipientId: string, messageText: string, token: string): Promise<{ recipient_id: string; message_id: string }> {
        if (!token || token.startsWith('mock_')) {
            return { recipient_id: recipientId, message_id: `mock_msg_${Date.now()}` };
        }
        return graphPost(
            'instagram',
            `${pageOrAccountId}/messages`,
            token,
            {
                recipient: { id: recipientId },
                message: { text: messageText },
            },
            'Instagram direct message'
        );
    }
}

// ── Facebook Pages ───────────────────────────────────────────────────────────

export class FacebookPublisher implements PlatformPublisher {
    readonly platform = 'facebook' as const;

    private isReel(input: PublishInput) {
        const f = String(input.platformMeta.facebookFormat || input.platformMeta.format || '').toLowerCase();
        return input.format === 'video' && (f === 'reel' || f === 'reels');
    }

    validate(input: PublishInput): string[] {
        const issues: string[] = [];
        if (charLength(input.caption) > 63206) issues.push('Facebook posts are limited to 63,206 characters.');
        checkUrls(input, issues);
        switch (input.format) {
            case 'text':
                if (!input.caption.trim()) issues.push('Facebook text posts need a message.');
                break;
            case 'video': {
                const v = input.media.find((m) => m.kind === 'video');
                if (!v) issues.push('Facebook video posts need a video.');
                if (this.isReel(input)) checkVideo(v, { minSec: 3, maxSec: 90, minAspect: 0.5, maxAspect: 0.57 }, 'Facebook Reel', issues);
                else checkVideo(v, { maxSec: 4 * 3600, maxBytes: 1024 * 1024 * 1024 }, 'Facebook video', issues);
                break;
            }
            case 'image':
                if (!input.media.some((m) => m.kind === 'image')) issues.push('Facebook photo posts need an image.');
                input.media.forEach((m) => m.sizeBytes && m.sizeBytes > 10 * 1024 * 1024 && issues.push('Facebook photos must be at most 10 MB.'));
                break;
            case 'carousel': {
                const imgs = input.media.filter((m) => m.kind === 'image');
                if (imgs.length < 2 || imgs.length > 30) issues.push('Facebook multi-photo posts need 2 to 30 images.');
                if (input.media.some((m) => m.kind !== 'image')) issues.push('Facebook multi-photo posts can only contain images.');
                break;
            }
            default:
                issues.push(`Facebook cannot publish ${input.format} posts.`);
        }
        return issues;
    }

    async publish(input: PublishInput, token: string): Promise<PublishOutcome> {
        const page = input.account.platformAccountId;
        let objectId: string;
        let url: string;
        const meta: Record<string, any> = {};

        if (input.format === 'text') {
            const r = await graphPost('facebook', `${page}/feed`, token, { message: input.caption }, 'Facebook post');
            objectId = r.id;
            url = `https://www.facebook.com/${r.id}`;
        } else if (input.format === 'image') {
            const img = input.media.find((m) => m.kind === 'image')!;
            const r = await graphPost('facebook', `${page}/photos`, token, { url: img.url, message: input.caption }, 'Facebook photo');
            objectId = r.post_id || r.id;
            url = `https://www.facebook.com/${objectId}`;
        } else if (input.format === 'carousel') {
            const ids: string[] = [];
            for (const m of input.media.filter((x) => x.kind === 'image')) {
                const r = await graphPost('facebook', `${page}/photos`, token, { url: m.url, published: false }, 'Facebook photo upload');
                ids.push(r.id);
            }
            const r = await graphPost('facebook', `${page}/feed`, token, { message: input.caption, attached_media: ids.map((id) => ({ media_fbid: id })) }, 'Facebook multi-photo post');
            objectId = r.id;
            url = `https://www.facebook.com/${r.id}`;
            meta.photoIds = ids;
        } else if (this.isReel(input)) {
            const v = input.media.find((m) => m.kind === 'video')!;
            const start = await graphPost('facebook', `${page}/video_reels`, token, { upload_phase: 'start' }, 'Facebook Reel start');
            const videoId = String(start.video_id);
            const up = await providerFetch('facebook', `https://rupload.facebook.com/video-upload/${META_GRAPH_VERSION()}/${videoId}`, {
                method: 'POST',
                headers: { Authorization: `OAuth ${token}`, file_url: v.url },
            });
            await expectOk('facebook', up, 'Facebook Reel upload');
            const fin = await graphPost('facebook', `${page}/video_reels`, token, { upload_phase: 'finish', video_id: videoId, video_state: 'PUBLISHED', description: input.caption }, 'Facebook Reel publish');
            if (fin.success === false) throw new PublishError('PROVIDER_ERROR', 'Facebook did not accept the Reel.', { platform: 'facebook' });
            objectId = videoId;
            url = `https://www.facebook.com/reel/${videoId}`;
        } else {
            const v = input.media.find((m) => m.kind === 'video')!;
            const body: Record<string, any> = { file_url: v.url, description: input.caption };
            if (input.title) body.title = input.title.slice(0, 255);
            const r = await graphPost('facebook', `${page}/videos`, token, body, 'Facebook video');
            objectId = String(r.id);
            url = `https://www.facebook.com/${page}/videos/${objectId}`;
        }

        let warning: string | undefined;
        if (input.firstComment?.trim()) {
            try {
                await graphPost('facebook', `${objectId}/comments`, token, { message: input.firstComment }, 'Facebook first comment');
            } catch (e: any) {
                warning = `Posted, but the first comment failed: ${e.message}`;
            }
        }
        return { externalId: objectId, url, state: 'published', meta, warning };
    }
}

export interface InstagramPublishParams {
    accessToken: string;
    igUserId: string;
    caption: string;
    videoUrl?: string;
    imageUrl?: string;
    mediaType?: 'REELS' | 'IMAGE' | 'CAROUSEL';
    shareToFeed?: boolean;
}

export interface FacebookPublishParams {
    accessToken: string;
    pageId: string;
    message: string;
    videoUrl?: string;
    photoUrl?: string;
}

export class MetaAdapter {
    static async publishInstagramMedia(params: InstagramPublishParams): Promise<{ mediaId: string; liveUrl: string }> {
        const { accessToken, igUserId, caption, videoUrl, imageUrl, mediaType = 'REELS' } = params;
        if (!accessToken || accessToken.startsWith('mock_') || !igUserId) {
            const shortcode = Math.random().toString(36).substring(2, 9);
            return {
                mediaId: `mock_ig_${Date.now()}`,
                liveUrl: `https://www.instagram.com/reel/C_${shortcode}/`,
            };
        }
        const pub = new InstagramPublisher();
        const outcome = await pub.publish({
            platform: 'instagram',
            postId: 'legacy',
            variantId: 'legacy',
            account: { id: 'legacy', platformAccountId: igUserId, accountName: 'Legacy', metadata: {} },
            format: videoUrl || mediaType === 'REELS' ? 'video' : 'image',
            caption,
            media: videoUrl ? [{ kind: 'video', url: videoUrl }] : imageUrl ? [{ kind: 'image', url: imageUrl }] : [],
            platformMeta: { shareToFeed: params.shareToFeed ?? true },
        }, accessToken);
        return { mediaId: outcome.externalId, liveUrl: outcome.url };
    }

    static async publishFacebookPost(params: FacebookPublishParams): Promise<{ postId: string; liveUrl: string }> {
        const { accessToken, pageId, message, videoUrl, photoUrl } = params;
        if (!accessToken || accessToken.startsWith('mock_') || !pageId) {
            const mockPostId = `${pageId}_${Date.now()}`;
            return {
                postId: mockPostId,
                liveUrl: `https://www.facebook.com/${pageId}/posts/${mockPostId}`,
            };
        }
        const pub = new FacebookPublisher();
        const outcome = await pub.publish({
            platform: 'facebook',
            postId: 'legacy',
            variantId: 'legacy',
            account: { id: 'legacy', platformAccountId: pageId, accountName: 'Legacy', metadata: {} },
            format: videoUrl ? 'video' : photoUrl ? 'image' : 'text',
            caption: message,
            media: videoUrl ? [{ kind: 'video', url: videoUrl }] : photoUrl ? [{ kind: 'image', url: photoUrl }] : [],
            platformMeta: {},
        }, accessToken);
        return { postId: outcome.externalId, liveUrl: outcome.url };
    }
}


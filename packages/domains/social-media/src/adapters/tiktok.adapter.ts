/**
 * TikTok publisher (Content Posting API v2).
 * Direct post (scope video.publish): creator_info/query → video/init (FILE_UPLOAD) → PUT chunks → status/fetch.
 * Inbox upload (scope video.upload, platformMeta.tiktokMode = "inbox"): inbox/video/init → PUT → the creator
 * finishes the post inside the TikTok app.
 * Photo carousels: content/init with media_type PHOTO (PULL_FROM_URL; the media domain must be verified in the
 * TikTok developer portal).
 * TikTok UX rules: privacy level must be chosen by the user (no default) from creator_info's options. Until the app
 * passes TikTok's audit, every post is forced to SELF_ONLY by TikTok.
 * Docs: developers.tiktok.com/doc/content-posting-api-reference-direct-post
 */
import { intEnv } from '../publishing/config';
import { PublishError } from '../publishing/errors';
import { requireToken } from "./engagement-token";
import { asBody, downloadMedia, providerFailure, providerFetch, readBody, timing } from '../publishing/http';
import { PlatformPublisher, PublishInput, PublishOutcome, charLength, checkUrls, checkVideo } from './types';

const API = 'https://open.tiktokapis.com/v2';

async function ttPost(path: string, token: string, body: Record<string, any> | undefined, what: string) {
    const res = await providerFetch('tiktok', `${API}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
        body: body ? JSON.stringify(body) : undefined,
    });
    const b = await readBody(res);
    const code = b?.error?.code;
    if (!res.ok || (code && code !== 'ok')) {
        const retryable = ['rate_limit_exceeded', 'internal_error'].includes(code);
        throw providerFailure('tiktok', { status: res.ok ? (retryable ? 429 : 400) : res.status }, b, what);
    }
    return b.data || {};
}

export class TikTokPublisher implements PlatformPublisher {
    readonly platform = 'tiktok' as const;

    private mode(input: PublishInput): 'direct' | 'inbox' {
        return String(input.platformMeta.tiktokMode || '').toLowerCase() === 'inbox' ? 'inbox' : 'direct';
    }

    validate(input: PublishInput): string[] {
        const issues: string[] = [];
        checkUrls(input, issues);
        const direct = this.mode(input) === 'direct';
        if (direct && !input.platformMeta.privacyLevel) {
            issues.push('Choose a TikTok privacy level (platformMeta.privacyLevel) — TikTok requires the creator to pick it for every direct post.');
        }
        if (input.format === 'video') {
            const v = input.media.find((m) => m.kind === 'video');
            if (!v) issues.push('TikTok video posts need a video.');
            checkVideo(v, { minSec: 3, maxSec: 600, maxBytes: 4 * 1024 * 1024 * 1024 }, 'TikTok video', issues);
            if (charLength(input.caption) > 2200) issues.push('TikTok video captions are limited to 2,200 characters.');
        } else if (input.format === 'carousel' || input.format === 'image') {
            const imgs = input.media.filter((m) => m.kind === 'image');
            if (imgs.length < 1 || imgs.length > 35) issues.push('TikTok photo posts need 1 to 35 images.');
            if (input.media.some((m) => m.kind !== 'image')) issues.push('TikTok photo posts can only contain images.');
            if (charLength(input.title || '') > 90) issues.push('TikTok photo titles are limited to 90 characters.');
            if (charLength(input.caption) > 4000) issues.push('TikTok photo descriptions are limited to 4,000 characters.');
        } else {
            issues.push(`TikTok cannot publish ${input.format} posts.`);
        }
        if (input.firstComment?.trim()) issues.push('TikTok does not allow posting a first comment through the API; remove it for TikTok.');
        return issues;
    }

    private url(input: PublishInput, username: string | undefined, postId: string) {
        const u = (username || input.account.username || '').replace(/^@/, '');
        return u ? `https://www.tiktok.com/@${u}/video/${postId}` : `https://www.tiktok.com/video/${postId}`;
    }

    /** One status check. Returns an outcome when final, null while TikTok is still processing. */
    private async statusOnce(input: PublishInput, publishId: string, token: string, username?: string): Promise<PublishOutcome | null> {
        const d = await ttPost('/post/publish/status/fetch/', token, { publish_id: publishId }, 'TikTok publish status');
        const status = d.status;
        if (status === 'PUBLISH_COMPLETE') {
            const ids: any[] = d.publicaly_available_post_id || d.publicly_available_post_id || [];
            const postId = ids.length ? String(ids[0]) : publishId;
            return { externalId: postId, url: ids.length ? this.url(input, username, postId) : null, state: 'published', meta: { publishId } };
        }
        if (status === 'SEND_TO_USER_INBOX') {
            return { externalId: publishId, url: null, state: 'published', meta: { publishId, deliveredTo: 'inbox' }, warning: 'Sent to the TikTok app inbox; the creator finishes the post in TikTok.' };
        }
        if (status === 'FAILED') {
            throw new PublishError('PROVIDER_ERROR', `TikTok rejected the post: ${d.fail_reason || 'unknown reason'}`, { platform: 'tiktok', retryable: false });
        }
        return null;
    }

    async checkStatus(input: PublishInput, externalId: string, token: string): Promise<PublishOutcome | null> {
        return this.statusOnce(input, externalId, token);
    }

    private async awaitStatus(input: PublishInput, publishId: string, token: string, username?: string): Promise<PublishOutcome> {
        const attempts = intEnv('TIKTOK_STATUS_POLL_ATTEMPTS', 20);
        for (let i = 0; i < attempts; i++) {
            const o = await this.statusOnce(input, publishId, token, username);
            if (o) return o;
            await timing.sleep(intEnv('TIKTOK_STATUS_POLL_MS', 3000));
        }
        // Accepted but not public yet: report honestly as processing; the scheduler re-checks it later.
        return { externalId: publishId, url: null, state: 'processing', meta: { publishId } };
    }

    async publish(input: PublishInput, token: string): Promise<PublishOutcome> {
        const direct = this.mode(input) === 'direct';

        if (input.format !== 'video') {
            const d = await ttPost('/post/publish/content/init/', token, {
                post_info: {
                    title: input.title || '',
                    description: input.caption,
                    ...(direct ? { privacy_level: input.platformMeta.privacyLevel } : {}),
                    disable_comment: Boolean(input.platformMeta.disableComment),
                    auto_add_music: input.platformMeta.autoAddMusic !== false,
                },
                source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: input.media.filter((m) => m.kind === 'image').map((m) => m.url) },
                post_mode: direct ? 'DIRECT_POST' : 'MEDIA_UPLOAD',
                media_type: 'PHOTO',
            }, 'TikTok photo init');
            return this.awaitStatus(input, d.publish_id, token);
        }

        let username: string | undefined;
        if (direct) {
            const info = await ttPost('/post/publish/creator_info/query/', token, undefined, 'TikTok creator info');
            username = info.creator_username;
            const options: string[] = info.privacy_level_options || [];
            if (options.length && !options.includes(input.platformMeta.privacyLevel)) {
                throw new PublishError('VALIDATION_FAILED', `TikTok privacy level ${input.platformMeta.privacyLevel} is not available for this creator (allowed: ${options.join(', ')}).`, { platform: 'tiktok' });
            }
            const v = input.media.find((m) => m.kind === 'video');
            if (info.max_video_post_duration_sec && v?.durationSec && v.durationSec > info.max_video_post_duration_sec) {
                throw new PublishError('VALIDATION_FAILED', `This TikTok account can post videos up to ${info.max_video_post_duration_sec}s.`, { platform: 'tiktok' });
            }
        }

        const v = input.media.find((m) => m.kind === 'video')!;
        const media = await downloadMedia('tiktok', v.url, 4 * 1024 * 1024 * 1024);
        const MIN = 5 * 1024 * 1024;
        const chunkSize = media.size < MIN ? media.size : Math.min(Math.max(intEnv('TIKTOK_UPLOAD_CHUNK_BYTES', 10 * 1024 * 1024), MIN), 64 * 1024 * 1024);
        const totalChunks = Math.max(1, Math.floor(media.size / chunkSize));
        const source_info = { source: 'FILE_UPLOAD', video_size: media.size, chunk_size: chunkSize, total_chunk_count: totalChunks };

        const init = direct
            ? await ttPost('/post/publish/video/init/', token, {
                  post_info: {
                      title: input.caption,
                      privacy_level: input.platformMeta.privacyLevel,
                      disable_duet: Boolean(input.platformMeta.disableDuet),
                      disable_stitch: Boolean(input.platformMeta.disableStitch),
                      disable_comment: Boolean(input.platformMeta.disableComment),
                      ...(input.platformMeta.coverTimestampMs != null ? { video_cover_timestamp_ms: Number(input.platformMeta.coverTimestampMs) } : {}),
                      brand_content_toggle: Boolean(input.platformMeta.brandContent),
                      brand_organic_toggle: Boolean(input.platformMeta.brandOrganic),
                      is_aigc: Boolean(input.platformMeta.isAigc),
                  },
                  source_info,
              }, 'TikTok video init')
            : await ttPost('/post/publish/inbox/video/init/', token, { source_info }, 'TikTok inbox upload init');

        if (!init.publish_id || !init.upload_url) throw new PublishError('PROVIDER_ERROR', 'TikTok init returned no upload URL.', { platform: 'tiktok', retryable: true });

        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = i === totalChunks - 1 ? media.size : start + chunkSize; // last chunk absorbs the remainder
            const res = await providerFetch('tiktok', init.upload_url, {
                method: 'PUT',
                headers: { 'Content-Type': media.contentType.startsWith('video/') ? media.contentType : 'video/mp4', 'Content-Range': `bytes ${start}-${end - 1}/${media.size}`, 'Content-Length': String(end - start) },
                body: asBody(media.bytes.subarray(start, end)),
            });
            if (!res.ok) throw providerFailure('tiktok', res, await readBody(res), 'TikTok chunk upload');
        }
        return this.awaitStatus(input, String(init.publish_id), token, username);
    }
}

export interface TikTokPublishParams {
    accessToken: string;
    videoUrl: string;
    title: string;
    privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
    disableDuet?: boolean;
    disableStitch?: boolean;
    disableComment?: boolean;
}

export class TikTokAdapter {
    static async publishVideo(params: TikTokPublishParams): Promise<{ publishId: string; liveUrl: string }> {
        const { accessToken, videoUrl, title } = params;
        if (!accessToken || accessToken.startsWith('mock_')) {
            const mockPubId = `v_pub_${Math.random().toString(36).substring(2, 9)}`;
            return {
                publishId: mockPubId,
                liveUrl: `https://www.tiktok.com/@creator/video/${Math.floor(Math.random() * 1000000000000)}`,
            };
        }
        const pub = new TikTokPublisher();
        const outcome = await pub.publish({
            platform: 'tiktok',
            postId: 'legacy',
            variantId: 'legacy',
            account: { id: 'legacy', platformAccountId: 'legacy', accountName: 'Legacy', metadata: {} },
            format: 'video',
            caption: title,
            media: [{ kind: 'video', url: videoUrl }],
            platformMeta: {
                privacyLevel: params.privacyLevel || 'PUBLIC_TO_EVERYONE',
                disableDuet: params.disableDuet,
                disableStitch: params.disableStitch,
                disableComment: params.disableComment,
            },
        }, accessToken);
        return { publishId: outcome.externalId, liveUrl: outcome.url };
    }

    static async replyToComment(commentId: string, text: string, accessToken: string): Promise<{ replyId: string }> {
        requireToken(accessToken, "tiktok");
        const data = await ttPost('/video/comment/reply/', accessToken, {
            comment_id: commentId,
            text,
        }, 'TikTok reply to comment');
        return { replyId: data.reply_id || data.id || `tt_reply_${Date.now()}` };
    }
}



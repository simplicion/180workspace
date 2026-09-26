/**
 * X (Twitter) publisher: API v2 posts + media upload v2 (chunked).
 * Media: POST /2/media/upload/initialize → POST /2/media/upload/{id}/append (multipart, segment_index) →
 *        POST /2/media/upload/{id}/finalize → GET /2/media/upload?command=STATUS&media_id= until succeeded
 * Post:  POST /2/tweets { text, media: { media_ids } }; first comment = a reply to the new post.
 * Requires OAuth 2.0 user context with tweet.write + media.write, and an X API tier that allows posting.
 * Verified 2026-09-27 against docs.x.com/x-api/media/quickstart/media-upload-chunked + best-practices and
 * docs.x.com/x-api/getting-started/pricing: up to 4 images (≤ 5 MB, JPG/PNG/GIF/WEBP) OR 1 GIF (≤ 15 MB) OR 1 video
 * (≤ 512 MB via chunked upload, 0.5s–20min for standard accounts, aspect 1:3–3:1, ≤ 60 fps); chunks ≤ 5 MB.
 * Since 2026-02-06 the X API is pay-per-use (no free write tier): each created post consumes paid credits, so an
 * app without credits gets HTTP 402/403, mapped below to a non-retryable, clearly worded error.
 */
import { intEnv } from '../publishing/config';
import { PublishError } from '../publishing/errors';
import { asBody, downloadMedia, expectOk, pollUntil, providerFailure, providerFetch, readBody } from '../publishing/http';
import { PlatformPublisher, PublishInput, PublishOutcome, checkUrls, checkVideo } from './types';

const API = () => (process.env.X_API_BASE_URL?.trim() || 'https://api.x.com').replace(/\/+$/, '');

/** X counts URLs as 23 characters and most CJK / emoji as 2 (twitter-text weighting, simplified). */
export function weightedTweetLength(text: string): number {
    const urlRe = /https?:\/\/\S+/g;
    const withoutUrls = text.replace(urlRe, '');
    const urls = (text.match(urlRe) || []).length;
    let n = 0;
    for (const ch of Array.from(withoutUrls)) {
        const cp = ch.codePointAt(0)!;
        n += cp <= 0x10ff || (cp >= 0x2000 && cp <= 0x200d) || (cp >= 0x2010 && cp <= 0x201f) || (cp >= 0x2032 && cp <= 0x2037) ? 1 : 2;
    }
    return n + urls * 23;
}

const isGif = (m: { url: string; mimeType?: string }) => m.mimeType === 'image/gif' || /\.gif(\?|$)/i.test(m.url);

/** X-specific failure mapping: no paid credits / not enrolled → clear, non-retryable; duplicate text → validation. */
export function xFailure(res: { status: number }, body: any, what: string): PublishError {
    const detail = String(body?.detail || body?.title || body?.errors?.[0]?.message || '');
    const type = String(body?.type || '');
    if (res.status === 402 || /credit|client-not-enrolled|enrol|payment/i.test(`${type} ${detail}`)) {
        return new PublishError('PUBLISH_NOT_CONFIGURED', `${what}: the X developer app has no posting access (pay-per-use credits are required since 2026-02). ${detail}`.trim(), { platform: 'x', details: { httpStatus: res.status } });
    }
    if (res.status === 403 && /duplicate/i.test(detail)) {
        return new PublishError('VALIDATION_FAILED', `${what}: X rejects posts identical to a recent one. Change the text.`, { platform: 'x' });
    }
    return providerFailure('x', res, body, what);
}

export class XPublisher implements PlatformPublisher {
    readonly platform = 'x' as const;

    private maxChars(input: PublishInput) {
        return input.account.metadata?.longPostsEnabled ? 25000 : 280;
    }

    validate(input: PublishInput): string[] {
        const issues: string[] = [];
        const max = this.maxChars(input);
        if (weightedTweetLength(input.caption) > max) issues.push(`X posts are limited to ${max} characters (URLs count as 23).`);
        if (input.firstComment && weightedTweetLength(input.firstComment) > max) issues.push(`X reply (first comment) is limited to ${max} characters.`);
        checkUrls(input, issues);
        const videos = input.media.filter((m) => m.kind === 'video');
        const images = input.media.filter((m) => m.kind === 'image');
        if (input.media.some((m) => m.kind === 'document')) issues.push('X cannot attach documents.');
        if (videos.length > 1) issues.push('X allows one video per post.');
        if (videos.length && images.length) issues.push('X cannot mix video and images in one post.');
        if (images.length > 4) issues.push('X allows at most 4 images per post.');
        checkVideo(videos[0], { minSec: 0.5, maxSec: 20 * 60, maxBytes: 512 * 1024 * 1024, minAspect: 1 / 3, maxAspect: 3 }, 'X video', issues);
        const gifs = images.filter(isGif);
        if (gifs.length && images.length > 1) issues.push('X allows one animated GIF per post, without other images.');
        images.forEach((m) => {
            const cap = isGif(m) ? 15 : 5;
            if (m.sizeBytes && m.sizeBytes > cap * 1024 * 1024) issues.push(`X ${isGif(m) ? 'GIFs' : 'images'} must be at most ${cap} MB.`);
        });
        if (input.format === 'text' && !input.caption.trim()) issues.push('X posts need text or media.');
        return issues;
    }

    private async uploadMedia(url: string, kind: 'video' | 'image', token: string): Promise<string> {
        const media = await downloadMedia('x', url, kind === 'video' ? 512 * 1024 * 1024 : isGif({ url }) ? 15 * 1024 * 1024 : 5 * 1024 * 1024);
        const mediaType = kind === 'video' ? (media.contentType.startsWith('video/') ? media.contentType : 'video/mp4') : media.contentType.startsWith('image/') ? media.contentType : 'image/jpeg';
        const auth = { Authorization: `Bearer ${token}` };

        const init = await providerFetch('x', `${API()}/2/media/upload/initialize`, {
            method: 'POST',
            headers: { ...auth, 'Content-Type': 'application/json' },
            body: JSON.stringify({ media_type: mediaType, total_bytes: media.size, media_category: kind === 'video' ? 'tweet_video' : mediaType === 'image/gif' ? 'tweet_gif' : 'tweet_image' }),
        });
        const initBody = await expectOk('x', init, 'X media initialize');
        const mediaId: string = initBody.data?.id || initBody.data?.media_id || initBody.media_id_string;
        if (!mediaId) throw new PublishError('PROVIDER_ERROR', 'X media initialize returned no media id.', { platform: 'x', retryable: true });

        const chunk = Math.min(intEnv('X_UPLOAD_CHUNK_BYTES', 4 * 1024 * 1024), 5 * 1024 * 1024);
        for (let i = 0, off = 0; off < media.size; i++, off += chunk) {
            const form = new FormData();
            form.append('segment_index', String(i));
            form.append('media', new Blob([asBody(media.bytes.subarray(off, Math.min(off + chunk, media.size)))]), 'chunk');
            const r = await providerFetch('x', `${API()}/2/media/upload/${mediaId}/append`, { method: 'POST', headers: auth, body: form });
            await expectOk('x', r, 'X media append');
        }

        const fin = await providerFetch('x', `${API()}/2/media/upload/${mediaId}/finalize`, { method: 'POST', headers: auth });
        const finBody = await expectOk('x', fin, 'X media finalize');
        let info = finBody.data?.processing_info;
        if (info && info.state !== 'succeeded') {
            await pollUntil(
                async () => {
                    const s = await providerFetch('x', `${API()}/2/media/upload?command=STATUS&media_id=${encodeURIComponent(mediaId)}`, { method: 'GET', headers: auth });
                    const sb = await expectOk('x', s, 'X media status');
                    info = sb.data?.processing_info;
                    if (!info || info.state === 'succeeded') return true;
                    if (info.state === 'failed') throw new PublishError('PROVIDER_ERROR', `X could not process the media: ${info.error?.message || 'failed'}`, { platform: 'x' });
                    return undefined;
                },
                {
                    attempts: intEnv('X_MEDIA_POLL_ATTEMPTS', 60),
                    intervalMs: Math.max(1000, Number(info.check_after_secs || 0) * 1000) || intEnv('X_MEDIA_POLL_MS', 3000),
                    onTimeout: () => new PublishError('PROVIDER_TIMEOUT', 'X is still processing the media; try again shortly.', { retryable: true, platform: 'x' }),
                },
            );
        }
        return mediaId;
    }

    private async tweet(body: Record<string, any>, token: string, what: string) {
        const r = await providerFetch('x', `${API()}/2/tweets`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!r.ok) throw xFailure(r, await readBody(r), what);
        const b = await expectOk('x', r, what);
        if (!b.data?.id) throw new PublishError('PROVIDER_ERROR', `${what} returned no id.`, { platform: 'x' });
        return String(b.data.id);
    }

    async publish(input: PublishInput, token: string): Promise<PublishOutcome> {
        const mediaIds: string[] = [];
        for (const m of input.media.filter((x) => x.kind === 'video' || x.kind === 'image').slice(0, 4)) {
            mediaIds.push(await this.uploadMedia(m.url, m.kind as 'video' | 'image', token));
        }
        const body: Record<string, any> = { text: input.caption };
        if (mediaIds.length) body.media = { media_ids: mediaIds };
        const id = await this.tweet(body, token, 'X post');
        const handle = input.account.username?.replace(/^@/, '');

        let warning: string | undefined;
        if (input.firstComment?.trim()) {
            try {
                await this.tweet({ text: input.firstComment, reply: { in_reply_to_tweet_id: id } }, token, 'X reply');
            } catch (e: any) {
                warning = `Posted, but the reply failed: ${e.message}`;
            }
        }
        return { externalId: id, url: handle ? `https://x.com/${handle}/status/${id}` : `https://x.com/i/web/status/${id}`, state: 'published', meta: { mediaIds }, warning };
    }
}

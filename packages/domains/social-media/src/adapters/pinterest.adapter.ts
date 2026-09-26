/**
 * Pinterest API v5 publisher.
 * Verified 2026-09-27 against the official OpenAPI description (github.com/pinterest/api-description, v5/openapi.yaml)
 * and developers.pinterest.com/docs/api/v5/pins-create:
 *   POST /v5/pins requires board_id + media_source; title ≤ 100, description ≤ 800, link ≤ 2048, alt_text ≤ 500.
 *   media_source: image_url | multiple_image_urls (2–5 items, carousel) | video_id (+ cover_image_url or
 *   cover_image_key_frame_time).
 *   Video: POST /v5/media {media_type:'video'} → multipart POST of upload_parameters + file to upload_url →
 *   GET /v5/media/{id} until status succeeded (registered | processing | succeeded | failed) → create the Pin.
 */
import { intEnv } from '../publishing/config';
import { PublishError } from '../publishing/errors';
import { asBody, downloadMedia, expectOk, pollUntil, providerFailure, providerFetch, readBody } from '../publishing/http';
import { PlatformPublisher, PublishInput, PublishOutcome, charLength, checkUrls, checkVideo } from './types';

const pinterestBase = () => (process.env.PINTEREST_API_BASE_URL?.trim() || 'https://api.pinterest.com/v5').replace(/\/+$/, '');

async function pinPost(path: string, token: string, body: Record<string, any>, what: string) {
    const res = await providerFetch('pinterest', `${pinterestBase()}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return expectOk('pinterest', res, what);
}

const boardOf = (input: PublishInput) => input.platformMeta?.boardId || input.account.metadata?.defaultBoardId || input.account.metadata?.boardId;

export class PinterestPublisher implements PlatformPublisher {
    readonly platform = 'pinterest' as const;

    validate(input: PublishInput): string[] {
        const issues: string[] = [];
        if (input.title && charLength(input.title) > 100) issues.push('Pinterest Pin titles are limited to 100 characters.');
        if (charLength(input.caption) > 800) issues.push('Pinterest Pin descriptions are limited to 800 characters.');
        const link = input.platformMeta?.link;
        if (link != null && (!/^https?:\/\/\S+$/i.test(String(link)) || String(link).length > 2048)) issues.push('Pinterest destination link must be an http(s) URL of at most 2,048 characters.');
        input.media.forEach((m) => m.altText && charLength(m.altText) > 500 && issues.push('Pinterest alt text is limited to 500 characters.'));
        checkUrls(input, issues);

        const images = input.media.filter((m) => m.kind === 'image');
        const video = input.media.find((m) => m.kind === 'video');
        if (!images.length && !video) issues.push('Pinterest requires at least one image or video Pin.');
        if (input.format === 'carousel') {
            if (images.length < 2 || images.length > 5) issues.push('Pinterest carousel Pins need 2 to 5 images.');
            if (video) issues.push('Pinterest carousel Pins can only contain images.');
        } else if (input.format === 'video') {
            if (!video) issues.push('Pinterest video Pins need a video.');
            checkVideo(video, { minSec: 4, maxSec: 15 * 60, maxBytes: 2 * 1024 * 1024 * 1024 }, 'Pinterest video', issues);
        } else if (input.format === 'text' || input.format === 'document') {
            issues.push(`Pinterest cannot publish ${input.format} posts (Pins need an image or video).`);
        }

        if (!boardOf(input)) {
            issues.push('Choose a Pinterest board for this Pin (platformMeta.boardId) or set a default board on the account.');
        }
        return issues;
    }

    /** Registers a video upload, sends the bytes to the pre-signed upload URL and waits until Pinterest has it. */
    private async uploadVideo(url: string, token: string): Promise<string> {
        const reg = await pinPost('media', token, { media_type: 'video' }, 'register Pinterest video upload');
        const mediaId = String(reg.media_id || '');
        if (!mediaId || !reg.upload_url) throw new PublishError('PROVIDER_ERROR', 'Pinterest did not return an upload URL for the video.', { platform: 'pinterest', retryable: true });

        const media = await downloadMedia('pinterest', url, 2 * 1024 * 1024 * 1024);
        const form = new FormData();
        for (const [k, v] of Object.entries(reg.upload_parameters || {})) form.append(k, String(v));
        form.append('file', new Blob([asBody(media.bytes)], { type: media.contentType }), 'video.mp4');
        const up = await providerFetch('pinterest', String(reg.upload_url), { method: 'POST', body: form });
        if (!up.ok) throw providerFailure('pinterest', up, await readBody(up), 'Pinterest video upload');

        await pollUntil(
            async () => {
                const r = await providerFetch('pinterest', `${pinterestBase()}/media/${encodeURIComponent(mediaId)}`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
                const s = await expectOk('pinterest', r, 'Pinterest video status');
                if (s.status === 'succeeded') return true;
                if (s.status === 'failed') throw new PublishError('PROVIDER_ERROR', 'Pinterest could not process the video.', { platform: 'pinterest', details: { mediaId } });
                return undefined;
            },
            {
                attempts: intEnv('PINTEREST_MEDIA_POLL_ATTEMPTS', 60),
                intervalMs: intEnv('PINTEREST_MEDIA_POLL_MS', 5000),
                onTimeout: () => new PublishError('PROVIDER_TIMEOUT', 'Pinterest is still processing the video; the Pin will be retried.', { retryable: true, platform: 'pinterest' }),
            },
        );
        return mediaId;
    }

    async publish(input: PublishInput, accessToken: string): Promise<PublishOutcome> {
        const boardId = boardOf(input);
        if (!boardId) {
            throw new PublishError('VALIDATION_FAILED', 'Pinterest requires a destination boardId (select or configure a board).', { platform: this.platform });
        }
        const images = input.media.filter((m) => m.kind === 'image');
        const video = input.media.find((m) => m.kind === 'video');
        if (!images.length && !video) {
            throw new PublishError('VALIDATION_FAILED', 'Pinterest Pin requires an image or video.', { platform: this.platform });
        }

        let media_source: Record<string, any>;
        if (input.format === 'carousel' && images.length >= 2) {
            media_source = { source_type: 'multiple_image_urls', items: images.slice(0, 5).map((m) => ({ url: m.url, ...(m.altText ? { description: m.altText } : {}) })) };
        } else if (video && (input.format === 'video' || !images.length)) {
            const mediaId = await this.uploadVideo(video.url, accessToken);
            const cover = input.platformMeta?.coverUrl || input.thumbnailUrl;
            media_source = cover
                ? { source_type: 'video_id', media_id: mediaId, cover_image_url: cover }
                : { source_type: 'video_id', media_id: mediaId, cover_image_key_frame_time: Number(input.platformMeta?.coverKeyFrameMs ?? 0) };
        } else {
            media_source = { source_type: 'image_url', url: images[0].url };
        }

        const body: Record<string, any> = {
            board_id: String(boardId),
            title: input.title || Array.from(input.caption).slice(0, 100).join('').trim(),
            description: input.caption,
            media_source,
        };
        if (input.platformMeta?.boardSectionId) body.board_section_id = String(input.platformMeta.boardSectionId);
        if (input.platformMeta?.link) body.link = String(input.platformMeta.link);
        const alt = images[0]?.altText;
        if (alt && media_source.source_type === 'image_url') body.alt_text = alt;

        const r = await pinPost('pins', accessToken, body, 'create Pinterest Pin');
        const pinId = String(r.id);
        return {
            externalId: pinId,
            url: `https://www.pinterest.com/pin/${pinId}/`,
            state: 'published',
            meta: { boardId, pinId, sourceType: media_source.source_type },
        };
    }
}

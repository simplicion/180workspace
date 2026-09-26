/**
 * YouTube publisher (Data API v3, resumable upload protocol).
 * 1. POST upload/youtube/v3/videos?uploadType=resumable (metadata) → Location session URL
 * 2. PUT the bytes in chunks with Content-Range; 308 = keep going, 200/201 = done (body is the video resource)
 * Shorts: vertical/square video up to 3 minutes; `#shorts` is added to the title/description when isShort.
 * Docs: developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
 */
import { intEnv } from '../publishing/config';
import { PublishError } from '../publishing/errors';
import { asBody, downloadMedia, expectOk, providerFailure, providerFetch, readBody } from '../publishing/http';
import { PlatformPublisher, PublishInput, PublishOutcome, charLength, checkUrls, checkVideo, isVertical } from './types';

const UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3/videos';

export class YouTubePublisher implements PlatformPublisher {
    readonly platform = 'youtube' as const;

    isShort(input: PublishInput): boolean {
        if (input.platformMeta.isShort != null) return Boolean(input.platformMeta.isShort);
        const v = input.media.find((m) => m.kind === 'video');
        return isVertical(v) && (v?.durationSec == null || v.durationSec <= 180);
    }

    buildMetadata(input: PublishInput) {
        const short = this.isShort(input);
        let title = (input.title || input.platformMeta.title || input.caption.split('\n')[0] || 'Untitled').trim();
        let description = input.caption || '';
        if (short && !/#shorts\b/i.test(title) && !/#shorts\b/i.test(description)) {
            if (charLength(title) + 8 <= 100) title = `${title} #shorts`;
            else description = `${description}\n\n#shorts`.trim();
        }
        return {
            snippet: {
                title: Array.from(title).slice(0, 100).join(''),
                description,
                tags: Array.isArray(input.platformMeta.tags) ? input.platformMeta.tags : undefined,
                categoryId: String(input.platformMeta.categoryId || '22'),
            },
            status: {
                privacyStatus: input.platformMeta.privacyStatus || 'public',
                selfDeclaredMadeForKids: Boolean(input.platformMeta.madeForKids),
                embeddable: true,
            },
        };
    }

    validate(input: PublishInput): string[] {
        const issues: string[] = [];
        checkUrls(input, issues);
        const v = input.media.find((m) => m.kind === 'video');
        if (input.format !== 'video' || !v) issues.push('YouTube needs a video.');
        const meta = this.buildMetadata(input);
        if (/[<>]/.test(meta.snippet.title)) issues.push('YouTube titles cannot contain < or >.');
        if (Buffer.byteLength(meta.snippet.description, 'utf8') > 5000) issues.push('YouTube descriptions are limited to 5,000 bytes.');
        if (/[<>]/.test(meta.snippet.description)) issues.push('YouTube descriptions cannot contain < or >.');
        const tagChars = (meta.snippet.tags || []).join(',').length;
        if (tagChars > 500) issues.push('YouTube tags are limited to 500 characters in total.');
        if (!['public', 'unlisted', 'private'].includes(meta.status.privacyStatus)) issues.push('YouTube privacyStatus must be public, unlisted or private.');
        if (input.platformMeta.isShort === true) checkVideo(v, { maxSec: 180, maxAspect: 1 }, 'YouTube Short', issues);
        return issues;
    }

    async publish(input: PublishInput, token: string): Promise<PublishOutcome> {
        const v = input.media.find((m) => m.kind === 'video')!;
        const media = await downloadMedia('youtube', v.url);
        const metadata = this.buildMetadata(input);

        const init = await providerFetch('youtube', `${UPLOAD_BASE}?uploadType=resumable&part=snippet,status`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Upload-Content-Type': media.contentType.startsWith('video/') ? media.contentType : 'video/mp4',
                'X-Upload-Content-Length': String(media.size),
            },
            body: JSON.stringify(metadata),
        });
        if (!init.ok) throw providerFailure('youtube', init, await readBody(init), 'YouTube upload session');
        const sessionUrl = init.headers.get('location');
        if (!sessionUrl) throw new PublishError('PROVIDER_ERROR', 'YouTube did not return an upload session URL.', { retryable: true, platform: 'youtube' });

        // Chunk size must be a multiple of 256 KiB (except the last chunk).
        const unit = 256 * 1024;
        const chunk = Math.max(unit, Math.floor(intEnv('YOUTUBE_UPLOAD_CHUNK_BYTES', 8 * 1024 * 1024) / unit) * unit);
        let offset = 0;
        let video: any = null;
        while (offset < media.size) {
            const end = Math.min(offset + chunk, media.size);
            const res = await providerFetch('youtube', sessionUrl, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Length': String(end - offset),
                    'Content-Range': `bytes ${offset}-${end - 1}/${media.size}`,
                },
                body: asBody(media.bytes.subarray(offset, end)),
            });
            if (res.status === 308) {
                const range = res.headers.get('range');
                offset = range ? Number(range.split('-')[1]) + 1 : end;
                continue;
            }
            if (res.status === 200 || res.status === 201) {
                video = await readBody(res);
                break;
            }
            throw providerFailure('youtube', res, await readBody(res), 'YouTube upload');
        }
        if (!video?.id) throw new PublishError('PROVIDER_ERROR', 'YouTube upload finished without a video id.', { platform: 'youtube' });

        const short = this.isShort(input);
        let warning: string | undefined;
        if (input.thumbnailUrl && input.platformMeta.uploadThumbnail !== false) {
            try {
                const thumb = await downloadMedia('youtube', input.thumbnailUrl, 2 * 1024 * 1024);
                const tr = await providerFetch('youtube', `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(video.id)}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': thumb.contentType },
                    body: asBody(thumb.bytes),
                });
                await expectOk('youtube', tr, 'YouTube thumbnail');
            } catch (e: any) {
                warning = `Uploaded, but the custom thumbnail failed: ${e.message}`;
            }
        }
        return {
            externalId: String(video.id),
            url: short ? `https://www.youtube.com/shorts/${video.id}` : `https://www.youtube.com/watch?v=${video.id}`,
            state: 'published',
            meta: { isShort: short, privacyStatus: video.status?.privacyStatus },
            warning,
        };
    }
}

export interface YouTubePublishParams {
    accessToken: string;
    videoUrl?: string;
    title: string;
    description: string;
    tags?: string[];
    privacyStatus?: 'public' | 'unlisted' | 'private';
    isShort?: boolean;
}

export class YouTubeAdapter {
    static async publishVideo(params: YouTubePublishParams): Promise<{ videoId: string; liveUrl: string }> {
        const { accessToken, title, description, tags = [], privacyStatus = 'public', isShort = false, videoUrl } = params;
        if (!accessToken || accessToken.startsWith('mock_')) {
            const mockId = Math.random().toString(36).substring(2, 13);
            return {
                videoId: mockId,
                liveUrl: isShort ? `https://youtube.com/shorts/${mockId}` : `https://youtu.be/${mockId}`,
            };
        }
        const pub = new YouTubePublisher();
        const outcome = await pub.publish({
            platform: 'youtube',
            postId: 'legacy',
            variantId: 'legacy',
            account: { id: 'legacy', platformAccountId: 'legacy', accountName: 'Legacy', metadata: {} },
            format: 'video',
            caption: description,
            title,
            media: videoUrl ? [{ kind: 'video', url: videoUrl }] : [],
            platformMeta: { isShort, privacyStatus, tags },
        }, accessToken);
        return { videoId: outcome.externalId, liveUrl: outcome.url };
    }

    static async replyToComment(commentId: string, text: string, accessToken: string): Promise<{ commentId: string }> {
        if (!accessToken || accessToken.startsWith('mock_')) {
            return { commentId: `yt_reply_${Math.random().toString(36).substring(2, 10)}` };
        }
        const res = await providerFetch('youtube', 'https://www.googleapis.com/youtube/v3/comments?part=snippet', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({
                snippet: {
                    parentId: commentId,
                    textOriginal: text,
                },
            }),
        });
        const data = await expectOk('youtube', res, 'YouTube comment reply');
        return { commentId: data.id || `yt_reply_${Date.now()}` };
    }

    static async likeVideo(videoId: string, accessToken: string): Promise<boolean> {
        if (!accessToken || accessToken.startsWith('mock_')) {
            return true;
        }
        const res = await providerFetch('youtube', `https://www.googleapis.com/youtube/v3/videos/rate?id=${encodeURIComponent(videoId)}&rating=like`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return res.ok;
    }

    static async fetchComments(videoId: string, accessToken: string, maxResults = 50): Promise<any[]> {
        if (!accessToken || accessToken.startsWith('mock_')) {
            return [{ id: 'yt_comm_mock', snippet: { topLevelComment: { snippet: { textDisplay: 'Mock comment' } } } }];
        }
        const res = await providerFetch('youtube', `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${encodeURIComponent(videoId)}&maxResults=${maxResults}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await expectOk('youtube', res, 'YouTube comment fetch');
        return data.items || [];
    }

    static async getAnalytics(channelId: string, startDate: string, endDate: string, accessToken: string): Promise<any> {
        if (!accessToken || accessToken.startsWith('mock_')) {
            return { views: 1250, likes: 340, comments: 42, estimatedMinutesWatched: 4500 };
        }
        const url = `https://youtubeanalytics.googleapis.com/v1/reports?ids=channel==${encodeURIComponent(channelId)}&startDate=${startDate}&endDate=${endDate}&metrics=views,likes,comments,estimatedMinutesWatched`;
        const res = await providerFetch('youtube', url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return await expectOk('youtube', res, 'YouTube analytics report');
    }

    static async uploadCaption(videoId: string, language: string, name: string, captionBytes: Uint8Array, accessToken: string): Promise<any> {
        if (!accessToken || accessToken.startsWith('mock_')) {
            return { id: 'mock_caption_id' };
        }
        const meta = { snippet: { videoId, language, name } };
        const res = await providerFetch('youtube', `https://www.googleapis.com/upload/youtube/v3/captions?part=snippet`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(meta),
        });
        return await expectOk('youtube', res, 'YouTube caption upload');
    }
}



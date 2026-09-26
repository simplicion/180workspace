/**
 * Reddit API publisher (POST https://oauth.reddit.com/api/submit, scope `submit`).
 * Verified 2026-09-27 against reddit.com/dev/api#POST_api_submit and the Reddit Data API wiki
 * (support.reddithelp.com "Data API Wiki"):
 *   kind link | self | image | video | videogif; sr, title (≤ 300 chars), url (link), text (self, ≤ 40,000 chars),
 *   nsfw, spoiler, flair_id / flair_text, sendreplies, resubmit, api_type=json. Errors come back as HTTP 200 with
 *   `json.errors` ([code, message, field]). Free OAuth tier: 100 queries/min per client id (X-Ratelimit-* headers);
 *   a unique, descriptive User-Agent is mandatory.
 * Native image/video uploads (kind=image|video) need the S3 lease flow (/api/media/asset.json) and only report the
 * new post id over a websocket, so this publisher posts media as a **link post** to the public media URL and says so
 * in `meta.postedAs`. The capability matrix marks Reddit video/image as link-only.
 */
import { PublishError } from '../publishing/errors';
import { expectOk, providerFetch } from '../publishing/http';
import { PlatformPublisher, PublishInput, PublishOutcome, charLength, checkUrls } from './types';

const redditBase = () => (process.env.REDDIT_API_BASE_URL?.trim() || 'https://oauth.reddit.com').replace(/\/+$/, '');

/** Reddit requires `<platform>:<app id>:<version> (by /u/<username>)`; REDDIT_USER_AGENT overrides it. */
export function redditUserAgent(): string {
    const custom = process.env.REDDIT_USER_AGENT?.trim();
    if (custom) return custom;
    const owner = process.env.REDDIT_DEVELOPER_USERNAME?.trim();
    return `server:com.workspace180.social:1.1${owner ? ` (by /u/${owner})` : ''}`;
}

const titleOf = (input: PublishInput) => String(input.title || input.platformMeta?.title || '').trim();

export class RedditPublisher implements PlatformPublisher {
    readonly platform = 'reddit' as const;

    validate(input: PublishInput): string[] {
        const issues: string[] = [];
        const title = titleOf(input) || input.caption.split('\n')[0].trim();
        if (!title) issues.push('Reddit submissions require a title.');
        else if (charLength(title) > 300) issues.push('Reddit titles are limited to 300 characters.');
        const hasLink = input.media.some((m) => m.kind === 'image' || m.kind === 'video') || Boolean(input.platformMeta?.link);
        if (!hasLink && charLength(input.caption) > 40000) issues.push('Reddit text posts are limited to 40,000 characters.');
        if (input.media.filter((m) => m.kind !== 'document').length > 1) issues.push('Reddit link posts carry one image or video URL (galleries are not supported here).');
        if (input.media.some((m) => m.kind === 'document')) issues.push('Reddit cannot attach documents.');
        const sr = String(input.platformMeta?.subreddit || input.account.metadata?.defaultSubreddit || '').replace(/^\/?r\//i, '');
        if (sr && !/^[A-Za-z0-9_]{2,21}$/.test(sr) && !/^u_[A-Za-z0-9_-]{3,20}$/.test(sr)) issues.push(`"${sr}" is not a valid subreddit name.`);
        checkUrls(input, issues);
        return issues;
    }

    async publish(input: PublishInput, accessToken: string): Promise<PublishOutcome> {
        const sr = String(input.platformMeta?.subreddit || input.account.metadata?.defaultSubreddit || `u_${input.account.username || 'user'}`).replace(/^\/?r\//i, '');
        const title = titleOf(input) || Array.from(input.caption.split('\n')[0].trim()).slice(0, 300).join('');

        const params = new URLSearchParams();
        params.append('api_type', 'json');
        params.append('sr', sr);
        params.append('title', title);
        params.append('resubmit', 'true');
        params.append('sendreplies', input.platformMeta?.sendReplies === false ? 'false' : 'true');
        if (input.platformMeta?.nsfw) params.append('nsfw', 'true');
        if (input.platformMeta?.spoiler) params.append('spoiler', 'true');
        if (input.platformMeta?.flairId) params.append('flair_id', String(input.platformMeta.flairId));
        if (input.platformMeta?.flairText) params.append('flair_text', String(input.platformMeta.flairText).slice(0, 64));

        const media = input.media.find((m) => m.kind === 'video' || m.kind === 'image');
        const linkUrl = media?.url || input.platformMeta?.link;
        if (linkUrl) {
            params.append('kind', 'link');
            params.append('url', String(linkUrl));
        } else {
            params.append('kind', 'self');
            params.append('text', input.caption);
        }

        const res = await providerFetch('reddit', `${redditBase()}/api/submit`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'User-Agent': redditUserAgent(),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        const r = await expectOk('reddit', res, 'submit Reddit post');
        const errors: any[] = r.json?.errors || [];
        if (errors.length) {
            const codes = errors.map((e) => (Array.isArray(e) ? e[0] : e?.code)).filter(Boolean);
            const text = errors.map((e) => (Array.isArray(e) ? `${e[0]}: ${e[1]}` : JSON.stringify(e))).join('; ');
            // RATELIMIT ("you are doing that too much") is transient; everything else needs a content/subreddit fix.
            const retryable = codes.includes('RATELIMIT');
            const code = codes.some((c) => ['SUBREDDIT_NOEXIST', 'SUBREDDIT_NOTALLOWED', 'NO_SELFS', 'NO_LINKS', 'SUBMIT_VALIDATION_FLAIR_REQUIRED', 'TOO_LONG', 'NO_TEXT', 'BAD_URL'].includes(c)) ? 'VALIDATION_FAILED' : 'PROVIDER_ERROR';
            throw new PublishError(code, `Reddit rejected the submission: ${text}`, { platform: this.platform, retryable, details: { redditErrors: codes } });
        }

        const postData = r.json?.data || {};
        const id = String(postData.name || (postData.id ? `t3_${String(postData.id).replace(/^t3_/, '')}` : ''));
        if (!id) throw new PublishError('OUTCOME_UNKNOWN', 'Reddit accepted the request but returned no post id; check the subreddit before retrying.', { platform: this.platform });
        const postUrl = postData.url || `https://www.reddit.com/r/${sr}/comments/${id.replace(/^t3_/, '')}`;

        return {
            externalId: id,
            url: postUrl,
            state: 'published',
            meta: { subreddit: sr, postedAs: linkUrl ? 'link' : 'self' },
        };
    }
}

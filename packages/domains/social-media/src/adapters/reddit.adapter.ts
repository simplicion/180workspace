/**
 * Reddit API Publisher.
 * Docs: www.reddit.com/dev/api/#POST_api_submit
 */
import { PublishError } from '../publishing/errors';
import { expectOk, providerFetch } from '../publishing/http';
import { PlatformPublisher, PublishInput, PublishOutcome, charLength, checkUrls } from './types';

const redditBase = 'https://oauth.reddit.com';

export class RedditPublisher implements PlatformPublisher {
    readonly platform = 'reddit' as const;

    validate(input: PublishInput): string[] {
        const issues: string[] = [];
        const title = input.title || input.caption;
        if (!title || !title.trim()) {
            issues.push('Reddit submissions require a title.');
        } else if (charLength(title) > 300) {
            issues.push('Reddit titles are limited to 300 characters.');
        }
        checkUrls(input, issues);
        return issues;
    }

    async publish(input: PublishInput, accessToken: string): Promise<PublishOutcome> {
        const sr = input.platformMeta?.subreddit || input.account.metadata?.defaultSubreddit || `u_${input.account.username || 'user'}`;
        const title = input.title || (input.caption.length > 280 ? `${input.caption.slice(0, 277)}...` : input.caption);

        const params = new URLSearchParams();
        params.append('api_type', 'json');
        params.append('sr', sr.replace(/^r\//, ''));
        params.append('title', title);
        params.append('resubmit', 'true');

        const media = input.media[0];
        if (media && (media.kind === 'video' || media.kind === 'image')) {
            params.append('kind', 'link');
            params.append('url', media.url);
        } else {
            params.append('kind', 'self');
            params.append('text', input.caption);
        }

        const res = await providerFetch('reddit', `${redditBase}/api/submit`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'User-Agent': '180Workspace/1.0',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        const r = await expectOk('reddit', res, 'submit Reddit post');
        const errors = r.json?.errors;
        if (errors && errors.length) {
            throw new PublishError('PROVIDER_ERROR', `Reddit rejected submission: ${JSON.stringify(errors)}`, { platform: this.platform });
        }

        const postData = r.json?.data || {};
        const externalId = postData.id || postData.name || `t3_${Date.now()}`;
        const postUrl = postData.url || `https://www.reddit.com/r/${sr}/comments/${externalId}`;

        return {
            externalId,
            url: postUrl,
            state: 'published',
            meta: { subreddit: sr, raw: postData },
        };
    }
}

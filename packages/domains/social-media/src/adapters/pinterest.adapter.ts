/**
 * Pinterest API v5 Publisher.
 * Docs: developers.pinterest.com/docs/api/v5/#tag/pins
 */
import { PublishError } from '../publishing/errors';
import { expectOk, providerFetch } from '../publishing/http';
import { PlatformPublisher, PublishInput, PublishOutcome, charLength, checkUrls } from './types';

const pinterestBase = 'https://api.pinterest.com/v5';

async function pinPost(path: string, token: string, body: Record<string, any>, what: string) {
    const res = await providerFetch('pinterest', `${pinterestBase}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return expectOk('pinterest', res, what);
}

export class PinterestPublisher implements PlatformPublisher {
    readonly platform = 'pinterest' as const;

    validate(input: PublishInput): string[] {
        const issues: string[] = [];
        if (input.title && charLength(input.title) > 100) {
            issues.push('Pinterest Pin titles are limited to 100 characters.');
        }
        if (charLength(input.caption) > 500) {
            issues.push('Pinterest Pin descriptions are limited to 500 characters.');
        }
        checkUrls(input, issues);

        const hasMedia = input.media.some((m) => m.kind === 'image' || m.kind === 'video');
        if (!hasMedia) {
            issues.push('Pinterest requires at least one image or video Pin.');
        }

        const boardId = input.platformMeta?.boardId || input.account.metadata?.defaultBoardId;
        if (!boardId) {
            // Non-fatal warning or required note
        }

        return issues;
    }

    async publish(input: PublishInput, accessToken: string): Promise<PublishOutcome> {
        const boardId = input.platformMeta?.boardId || input.account.metadata?.defaultBoardId || input.account.metadata?.boardId;
        if (!boardId) {
            throw new PublishError('VALIDATION_FAILED', 'Pinterest requires a destination boardId (select or configure a board).', { platform: this.platform });
        }

        const media = input.media.find((m) => m.kind === 'image') || input.media.find((m) => m.kind === 'video');
        if (!media) {
            throw new PublishError('VALIDATION_FAILED', 'Pinterest Pin requires an image or video.', { platform: this.platform });
        }

        const body: Record<string, any> = {
            board_id: boardId,
            title: input.title || input.caption.slice(0, 100).trim(),
            description: input.caption,
            media_source: {
                source_type: 'image_url',
                url: media.url,
            },
        };

        if (input.platformMeta?.link) {
            body.link = input.platformMeta.link;
        }

        const r = await pinPost('pins', accessToken, body, 'create Pinterest Pin');
        const pinId = r.id;
        const url = `https://www.pinterest.com/pin/${pinId}/`;

        return {
            externalId: pinId,
            url,
            state: 'published',
            meta: { boardId, pinId },
        };
    }
}

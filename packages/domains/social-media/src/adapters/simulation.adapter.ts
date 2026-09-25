/**
 * Omni-Platform Simulation Engine.
 * Enables end-to-end publishing, testing, and UI validation across all 8 networks
 * immediately without waiting for third-party developer API keys or approval review.
 */
import type { PublishPlatform } from '../publishing/config';
import { PlatformPublisher, PublishInput, PublishOutcome } from './types';

export class SimulatedPlatformPublisher implements PlatformPublisher {
    constructor(
        readonly platform: PublishPlatform,
        private readonly realPublisher?: PlatformPublisher
    ) {}

    validate(input: PublishInput): string[] {
        // Run authentic platform validation rules so user gets genuine validity feedback
        if (this.realPublisher) {
            return this.realPublisher.validate(input);
        }
        return [];
    }

    async publish(input: PublishInput, _accessToken: string): Promise<PublishOutcome> {
        // Simulate realistic network round-trip latency
        const delay = 350 + Math.floor(Math.random() * 250);
        await new Promise((resolve) => setTimeout(resolve, delay));

        const simId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const handle = input.account.username || 'creator';

        let permalink: string;
        switch (this.platform) {
            case 'instagram':
                permalink = `https://www.instagram.com/p/C_${simId}/`;
                break;
            case 'threads':
                permalink = `https://www.threads.net/@${handle}/post/${simId}`;
                break;
            case 'facebook':
                permalink = `https://www.facebook.com/permalink.php?story_fbid=${simId}`;
                break;
            case 'youtube':
                permalink = `https://youtu.be/sim_${simId}`;
                break;
            case 'linkedin':
                permalink = `https://www.linkedin.com/feed/update/urn:li:share:${simId}`;
                break;
            case 'x':
                permalink = `https://x.com/${handle}/status/${simId}`;
                break;
            case 'pinterest':
                permalink = `https://www.pinterest.com/pin/${simId}/`;
                break;
            case 'reddit':
                const sr = input.platformMeta?.subreddit || 'u_' + handle;
                permalink = `https://www.reddit.com/r/${sr}/comments/${simId}`;
                break;
            default:
                permalink = `https://${this.platform}.com/post/${simId}`;
        }

        return {
            externalId: `sim_${this.platform}_${simId}`,
            url: permalink,
            state: 'published',
            meta: {
                simulated: true,
                platform: this.platform,
                accountName: input.account.accountName,
                format: input.format,
                mediaCount: input.media.length,
                simulatedAt: new Date().toISOString(),
            },
        };
    }
}

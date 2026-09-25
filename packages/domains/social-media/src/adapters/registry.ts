import { isSimulationMode, type PublishPlatform } from '../publishing/config';
import { FacebookPublisher, InstagramPublisher } from './meta.adapter';
import { LinkedInPublisher } from './linkedin.adapter';
import { PinterestPublisher } from './pinterest.adapter';
import { RedditPublisher } from './reddit.adapter';
import { SimulatedPlatformPublisher } from './simulation.adapter';
import { ThreadsPublisher } from './threads.adapter';
import { TikTokPublisher } from './tiktok.adapter';
import { XPublisher } from './twitter.adapter';
import type { PlatformPublisher } from './types';
import { YouTubePublisher } from './youtube.adapter';

const defaults = (): Record<PublishPlatform, PlatformPublisher> => ({
    instagram: new InstagramPublisher(),
    facebook: new FacebookPublisher(),
    threads: new ThreadsPublisher(),
    youtube: new YouTubePublisher(),
    linkedin: new LinkedInPublisher(),
    x: new XPublisher(),
    tiktok: new TikTokPublisher(),
    pinterest: new PinterestPublisher(),
    reddit: new RedditPublisher(),
});

let registry = defaults();

export function getPublisher(platform: PublishPlatform): PlatformPublisher {
    const live = registry[platform];
    if (isSimulationMode()) {
        return new SimulatedPlatformPublisher(platform, live);
    }
    return live;
}

/** Test hook: override one platform's publisher (call resetPublishers() afterwards). */
export function setPublisher(platform: PublishPlatform, publisher: PlatformPublisher) {
    registry = { ...registry, [platform]: publisher };
}

export function resetPublishers() {
    registry = defaults();
}

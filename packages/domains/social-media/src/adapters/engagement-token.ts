import { PublishError } from '../publishing/errors';

/** Engagement calls never fake a result: without a token the call fails (the dispatcher logs it). */
export function requireToken(token: string | null | undefined, platform: string): asserts token is string {
    if (!token) throw new PublishError('REAUTH_REQUIRED', `No access token for ${platform}; reconnect the account.`, { platform: platform as any });
}

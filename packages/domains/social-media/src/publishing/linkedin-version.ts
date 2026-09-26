/**
 * LinkedIn Marketing API version (`LinkedIn-Version: YYYYMM`). LinkedIn supports each monthly version for ~12 months
 * and then rejects it; 202507 (the old default in config.ts) is past sunset as of 2026-09. Verified 2026-09-27 at
 * learn.microsoft.com/linkedin/marketing/versioning (supported: 202510 … 202609; 202510 sunsets 2026-10-15).
 * LINKEDIN_API_VERSION overrides the default; a value older than 12 months is logged once because LinkedIn will
 * answer 426/400 for it.
 */
export const LINKEDIN_DEFAULT_API_VERSION = '202609';

let warned = false;

export function linkedInApiVersion(now: Date = new Date()): string {
    const v = process.env.LINKEDIN_API_VERSION?.trim() || LINKEDIN_DEFAULT_API_VERSION;
    if (!warned && isLinkedInVersionSunset(v, now)) {
        warned = true;
        console.error(`[social-publishing] LINKEDIN_API_VERSION=${v} is older than 12 months; LinkedIn will reject it. Use a current YYYYMM version.`);
    }
    return v;
}

export function isLinkedInVersionSunset(v: string, now: Date = new Date()): boolean {
    const m = /^(\d{4})(\d{2})$/.exec(v);
    if (!m) return true;
    const months = (now.getUTCFullYear() - Number(m[1])) * 12 + (now.getUTCMonth() + 1 - Number(m[2]));
    return months >= 12;
}

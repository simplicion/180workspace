import api from '../api';

/**
 * Platform Team (Command Center) and shooting-script API. Contract: docs/social-studio-mobile/PLATFORM_TEAM.md.
 * Every response is `{ success, data }`; errors carry `{ code, error }` (e.g. 503 AI_NOT_CONFIGURED).
 */

export const COMMAND_PLATFORMS = [
    { id: 'instagram', label: 'Instagram', carousel: true },
    { id: 'linkedin', label: 'LinkedIn', carousel: true },
    { id: 'youtube', label: 'YouTube', carousel: false },
    { id: 'x', label: 'X', carousel: false },
    { id: 'facebook', label: 'Facebook', carousel: true },
] as const;
export type CommandPlatform = (typeof COMMAND_PLATFORMS)[number]['id'];

export interface CheckItem { check?: string; name?: string; status: string; detail?: string; feedback?: string }

export interface HookEvaluation {
    hook: string;
    totalScore: number;
    grade: string;
    dealbreaker?: string;
    formulaName?: string;
    recommendations: string[];
}

export interface CopyLint {
    score: number;
    feedCutout: string;
    foldChars: number;
    foldLabel: string;
    isTruncated: boolean;
    weightedLength: number;
    maxChars: number;
    hashtags: string[];
    hashtagMax: number;
    checks: CheckItem[];
    thread?: string[];
    titleLint?: { checks: CheckItem[] };
}

export interface PostMetrics { views: number | null; reach: number | null; likes: number | null; comments: number | null; shares: number | null; saves: number | null; fetchedAt: string }

export interface RankedPost {
    postId?: string;
    account?: string;
    url?: string | null;
    hook: string;
    outlierMultiple: number;
    isOutlier: boolean;
    formulaName?: string | null;
    metrics?: PostMetrics;
    views?: number | null;
    likes?: number | null;
    comments?: number | null;
}

export interface OwnPosts {
    basis: 'views' | 'reach' | 'engagements';
    baseline: number | null;
    published: number;
    measured: number;
    needsMore: number;
    outliers: number;
    provenFormulas: { formulaName: string; count: number }[];
    lastFetchedAt: string | null;
    top: RankedPost[];
}

export interface PlatformOverview {
    platform: string;
    label: string;
    connected: boolean;
    accounts: { id: string; accountName?: string; username?: string; reauthRequired?: boolean }[];
    needsReconnect: number;
    pipeline: { published30d: number; scheduledUpcoming: number; failed30d: number };
    queue: { postId: string; title?: string; status: string; scheduledFor?: string; craftScore: number | null; feedCutout: string; problems: string[]; warnings: string[] }[];
    queueCraftScoreAvg: number | null;
    inbox: {
        unread: number;
        sampled: number;
        bucketCounts: Record<string, number>;
        priority: { conversationId: string; author: string; text: string; bucket: string; nextStep: string; lastMessageAt?: string }[];
    };
    metrics: { socialAccountId: string; source: 'live' | 'stored' | 'unavailable'; followersCount: number | null; reach: number | null; views: number | null; impressions: number | null; engagements: number | null; periodDays: number | null; unavailable?: { message: string } }[];
    metricsError: string | null;
    ownPosts: OwnPosts;
    rewardedSignals: string[];
    playbook: string[];
}

export interface Radar {
    platform: string;
    supported: boolean;
    handles: string[];
    maxHandles?: number;
    scan: null | {
        fetchedAt: string;
        accounts: { handle: string; followers?: number | null; basis?: string; baseline?: number | null; posts?: number; error?: string | null }[];
        top: RankedPost[];
        outliers: number;
    };
}

export interface TimedBeat { timecode: string; durationSec: number; spokenWords: string; role: string; screenText?: string; retentionDevice?: string; flags: string[] }

export interface PlatformDraft {
    hooks: HookEvaluation[];
    winningHook: string;
    onScreenHook: string;
    title?: string;
    titleLint?: { checks: CheckItem[] };
    script?: { beats: TimedBeat[]; totalSeconds: number; wpm: number; teleprompterText: string };
    slides: { headline: string; body: string }[];
    caption: string;
    cta: string;
    hashtags: string[];
    copyLint: CopyLint;
    voice: { overallScore: number; verdict: string };
    thread?: string[];
    unverifiedFigures: string[];
}

export interface ProductionScene {
    index: number;
    timecode: string;
    durationSec: number;
    purpose: string;
    spokenLine: string;
    onScreenText: string;
    shot: string;
    framing: string;
    action: string;
    bRoll: string;
    editCue: string;
    audioCue: string;
    delivery: string;
    flags: string[];
}

export interface ProductionScript {
    totalSeconds: number;
    aspect: string;
    logline: string;
    setup: { location: string; lighting: string; wardrobe: string; props: string[] };
    scenes: ProductionScene[];
    captionStyle: string;
    musicMood: string;
    checklist: string[];
    flags: string[];
}

const base = (platform: string) => `/api/social-media/platform-team/${encodeURIComponent(platform)}`;

/** Message the server sent, or a plain fallback. Used by every panel's error state. */
export function apiErrorMessage(err: any): string {
    return err?.response?.data?.error || err?.message || 'Something went wrong.';
}
export const isAiNotConfigured = (err: any) => err?.response?.data?.code === 'AI_NOT_CONFIGURED';

export const platformTeamService = {
    async overview(platform: string, projectId: string): Promise<PlatformOverview> {
        return (await api.get(`${base(platform)}/overview`, { params: { projectId } })).data.data;
    },
    async refreshMetrics(platform: string, projectId: string): Promise<{ refresh: { updated: number; failed: { reason: string }[] } }> {
        return (await api.post(`${base(platform)}/posts/refresh-metrics`, { projectId })).data.data;
    },
    async radar(platform: string, projectId: string): Promise<Radar> {
        return (await api.get(`${base(platform)}/radar`, { params: { projectId } })).data.data;
    },
    async setRadarHandles(platform: string, projectId: string, handles: string[]): Promise<Radar> {
        return (await api.put(`${base(platform)}/radar`, { projectId, handles })).data.data;
    },
    async scanRadar(platform: string, projectId: string): Promise<Radar> {
        return (await api.post(`${base(platform)}/radar/scan`, { projectId })).data.data;
    },
    async draftReplies(platform: string, projectId: string, conversationId: string): Promise<{ bucket: string; nextStep: string; suggestions: { tone: string; text: string }[] }> {
        return (await api.post(`${base(platform)}/replies/draft`, { projectId, conversationId })).data.data;
    },
    async draft(platform: string, body: { idea: string; format: 'video' | 'carousel' | 'text'; projectId?: string; keywords?: string[] }): Promise<PlatformDraft> {
        return (await api.post(`${base(platform)}/draft`, body)).data.data.draft;
    },
    async scoreHooks(platform: string, hooks: string[], spoken: boolean): Promise<{ ranked: HookEvaluation[] }> {
        return (await api.post(`${base(platform)}/hooks/score`, { hooks, spoken })).data.data;
    },
    async lintCopy(platform: string, caption: string, title?: string): Promise<CopyLint> {
        return (await api.post(`${base(platform)}/copy/lint`, { caption, ...(title ? { title } : {}) })).data.data;
    },
    async shootingScript(projectId: string, pieceId: string, force = false): Promise<ProductionScript> {
        return (await api.post(`/api/social-media/projects/${encodeURIComponent(projectId)}/autopilot/pieces/${encodeURIComponent(pieceId)}/shooting-script`, { force })).data.productionScript;
    },
    async calendars(projectId: string): Promise<{ id?: string; _id?: string; name?: string; brand_name?: string; createdAt?: string }[]> {
        return (await api.get('/api/content-calendar', { params: { projectId, limit: 20, offset: 0 } })).data.calendars || [];
    },
    async pieces(calendarId: string): Promise<any[]> {
        return (await api.get(`/api/content-calendar/${encodeURIComponent(calendarId)}`)).data.pieces || [];
    },
};

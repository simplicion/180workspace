import api from '../api';

/**
 * Autopilot calendar (multi-agent), creative engine (carousels / static posts), calendar-piece raw footage
 * and publish-via-linked-post. Contracts: docs/social-studio-mobile/AUTOPILOT_API.md and CREATIVE_ENGINE.md.
 */

export type AutopilotPlatform = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'x';
export const AUTOPILOT_PLATFORMS: AutopilotPlatform[] = ['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'x'];

export interface StartAutopilotBody {
    days: 7 | 14 | 30;
    startDate?: string; // YYYY-MM-DD in the project timezone; server default = today
    platforms?: AutopilotPlatform[]; // omitted = project target platforms + connected accounts
    goals?: string[]; // max 5, 200 chars each
    name?: string;
    createDrafts?: boolean;
}

export type AutopilotStage = 'queued' | 'research' | 'strategy' | 'hooks_scripts' | 'copy' | 'critic' | 'saving' | 'done';

export interface AutopilotJob {
    jobId: string;
    calendarId: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    stage: AutopilotStage;
    progress: number;
    detail?: string;
    error?: { code: string; message: string };
    startedAt?: string;
    finishedAt?: string;
    totalPieces?: number;
    researchUsed?: boolean;
}

export interface AutopilotScript {
    hook: string;
    body: { beat: string; retentionDevice?: string }[];
    retentionLoop: string;
    cta: string;
    estimatedDurationSec: number;
}

export interface PieceCopy { caption: string; cta: string; hashtags: string[]; postingTime: string }

/** Fields the API adds at the top level of an autopilot piece (see autopilot/persistence.ts expandAutopilotFields). */
export interface AutopilotPieceFields {
    autopilot?: boolean;
    format?: 'reel' | 'carousel' | 'static' | 'text';
    platforms?: AutopilotPlatform[];
    hookType?: string | null;
    spokenHook?: string;
    onScreenHook?: string;
    script?: AutopilotScript | null;
    hasScript?: boolean;
    shotNotes?: string[];
    carouselBrief?: { title: string; slides: { index: number; role: string; headline: string; body: string; visualIdea: string }[] } | null;
    captions?: Partial<Record<AutopilotPlatform, PieceCopy>>;
    sources?: string[];
    critic?: { verdict: 'ok' | 'fixed' | 'flag'; issues: string[] } | null;
    postingTime?: string;
}

export interface CreativeSlide {
    index: number;
    layout: string;
    url: string;
    width: number;
    height: number;
    imageUrl: string | null;
    imageSource: { provider: string; model: string; kind: 'generative' | 'stock'; attribution?: any } | null;
    truncated: boolean;
    contrastOk: boolean;
    minContrast: number;
    version: number;
}

export interface CreativeJob {
    id: string;
    kind: 'carousel' | 'static';
    status: 'queued' | 'designing' | 'sourcing_images' | 'rendering' | 'uploading' | 'completed' | 'failed';
    step: string;
    progress: { done: number; total: number };
    format: 'portrait' | 'square';
    imageMode: 'generative' | 'stock' | 'none' | null;
    pieceId: string | null;
    postId: string | null;
    result: { slides: CreativeSlide[]; mediaUrls: string[]; coverUrl: string; font: { requested: string; used: string; fallback: boolean } } | null;
    warnings: string[];
    error: { code: string; message: string } | null;
    completedAt: string | null;
}

export interface CreativeStatus {
    ai: { configured: boolean };
    imageModel: { configured: boolean; providers: { id: string; model: string }[] };
    stock: { configured: boolean; providers: string[] };
    formats: unknown;
}

export interface StartCreativeBody {
    pieceId?: string;
    postId?: string;
    brief?: string;
    headline?: string;
    slideCount?: number;
    format?: 'portrait' | 'square';
    useImageModel?: boolean;
    allowStockFallback?: boolean;
}

export interface PublishVariantResult {
    id: string;
    platform: string;
    publishStatus: string;
    externalUrl: string | null;
    error: string | null;
    errorCode: string | null;
    retryable: boolean;
}

export interface PublishResult {
    success: boolean;
    simulated?: boolean;
    status: string;
    message: string;
    publishedLinks: Record<string, string>;
    errors?: Record<string, string>;
    warnings?: Record<string, string>;
    variants: PublishVariantResult[];
    retryScheduledFor?: string | null;
}

/** Normalised API error. Most social routes send {code, error}; the piece-media routes send {error: CODE, message}. */
export interface ApiErrorInfo { status: number; code: string; message: string; details?: any }

export function apiError(err: any, fallback = 'Request failed'): ApiErrorInfo {
    const status = Number(err?.response?.status) || 0;
    const d = err?.response?.data || {};
    const errIsCode = typeof d.error === 'string' && /^[A-Z][A-Z0-9_]+$/.test(d.error);
    const code = d.code || (errIsCode ? d.error : '') || (status ? `HTTP_${status}` : 'NETWORK_ERROR');
    const message = d.message || (!errIsCode && d.error) || (status ? fallback : 'Could not reach the server. Check your connection.');
    return { status, code, message, details: d.details };
}

const base = (projectId: string) => `/api/social-media/projects/${encodeURIComponent(projectId)}`;

export const socialAutopilotService = {
    // ---- autopilot calendar
    async startAutopilot(projectId: string, body: StartAutopilotBody): Promise<{ jobId: string; calendarId: string; status: string }> {
        const { data } = await api.post(`${base(projectId)}/autopilot/calendar`, body);
        return { jobId: data.jobId, calendarId: data.calendarId, status: data.status };
    },

    async getAutopilotJob(projectId: string, jobId: string): Promise<AutopilotJob> {
        const { data } = await api.get(`${base(projectId)}/autopilot/jobs/${encodeURIComponent(jobId)}`);
        const { success: _s, ...job } = data;
        return job as AutopilotJob;
    },

    async regeneratePiece(projectId: string, pieceId: string, instruction: string): Promise<{ piece: any; usage: unknown }> {
        const { data } = await api.post(`${base(projectId)}/autopilot/pieces/${encodeURIComponent(pieceId)}/regenerate`, { instruction });
        return { piece: data.piece, usage: data.usage };
    },

    // ---- creative engine
    async getCreativeStatus(projectId: string): Promise<CreativeStatus> {
        const { data } = await api.get(`${base(projectId)}/creative/status`);
        const { success: _s, ...status } = data;
        return status as CreativeStatus;
    },

    async startCarousel(projectId: string, body: StartCreativeBody): Promise<CreativeJob> {
        const { data } = await api.post(`${base(projectId)}/creative/carousels`, body);
        return data.job;
    },

    async startStaticPost(projectId: string, body: StartCreativeBody): Promise<CreativeJob> {
        const { data } = await api.post(`${base(projectId)}/creative/static-posts`, body);
        return data.job;
    },

    async getCreativeJob(projectId: string, jobId: string): Promise<CreativeJob> {
        const { data } = await api.get(`${base(projectId)}/creative/jobs/${encodeURIComponent(jobId)}`);
        return data.job;
    },

    async regenerateSlide(projectId: string, jobId: string, index: number, body: { instruction?: string; regenerateImage?: boolean }): Promise<CreativeJob> {
        const { data } = await api.post(`${base(projectId)}/creative/jobs/${encodeURIComponent(jobId)}/slides/${index}/regenerate`, body);
        return data.job;
    },

    // ---- calendar piece media
    async uploadRawFootage(pieceId: string, file: File, onProgress?: (pct: number) => void, signal?: AbortSignal) {
        const form = new FormData();
        form.append('video', file);
        const { data } = await api.post(`/api/social-media/calendar-pieces/${encodeURIComponent(pieceId)}/raw-footage`, form, {
            signal,
            onUploadProgress: (e: any) => {
                if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
            },
        });
        return data.data as { pieceId: string; url: string; rawMediaUrls: string[]; bytes: number; contentType: string; postId: string | null };
    },

    // ---- publish via the piece's linked post
    async findPostForPiece(pieceId: string, filters: { projectId?: string; calendarId?: string }): Promise<any | null> {
        const { data } = await api.get('/api/social-media/posts', { params: { ...filters, limit: 200 } });
        return (data.posts || []).find((p: any) => p.calendarPieceId === pieceId) || null;
    },

    async publishPost(postId: string): Promise<PublishResult> {
        const { data } = await api.post(`/api/social-media/posts/${encodeURIComponent(postId)}/publish`);
        return data;
    },
};

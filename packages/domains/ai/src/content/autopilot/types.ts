import type { AutopilotPlatform, CarouselBrief, ContentFormat, HookType, Script, Strategy } from './schemas';

/** What every agent knows about the brand. Built from WS1's brand consciousness profile. */
export interface AutopilotBrandContext {
    brandName: string;
    industry: string;
    positioning: string;
    tone: string;
    audience: string;
    forbiddenWords: string[];
    defaultHashtags: string[];
    standardCtas: string[];
    /** Full prompt block describing the brand (WS1 toPromptContext() output when available). */
    promptContext: string;
}

export interface AutopilotRunInput {
    days: 7 | 14 | 30;
    /** YYYY-MM-DD, interpreted in `timezone`. */
    startDate: string;
    timezone: string;
    platforms: AutopilotPlatform[];
    goals: string[];
    brand: AutopilotBrandContext;
    /** Compact, project-scoped memory lines (creator preferences, feedback, performance history). */
    memoryContext?: string[];
}

export interface PieceCopy {
    caption: string;
    cta: string;
    hashtags: string[];
    /** HH:mm local time in the project timezone. */
    postingTime: string;
}

export interface AutopilotPiece {
    slotId: string;
    day: number;
    /** YYYY-MM-DD in the project timezone. */
    date: string;
    weekNumber: number;
    platforms: AutopilotPlatform[];
    primaryPlatform: AutopilotPlatform;
    format: ContentFormat;
    pillar: string;
    topic: string;
    angle: string;
    headline: string;
    hookType: HookType;
    spokenHook: string;
    onScreenHook: string;
    script?: Script;
    shotNotes?: string[];
    carouselBrief?: CarouselBrief;
    visualBrief?: string;
    captions: Partial<Record<AutopilotPlatform, PieceCopy>>;
    timezone: string;
    sources: string[];
    critic: { verdict: 'ok' | 'fixed' | 'flag'; issues: string[] };
    status: 'ready' | 'needs_review';
}

export interface AutopilotRunResult {
    strategy: Strategy;
    pieces: AutopilotPiece[];
    research: { researchUsed: boolean; provider?: string; error?: string; trends?: { topic: string; whyNow: string; sourceUrls: string[] }[] };
    usage: ReturnType<import('./llm').UsageMeter['totals']>;
    provider: string;
}

export type AutopilotStage = 'queued' | 'research' | 'strategy' | 'hooks_scripts' | 'copy' | 'critic' | 'saving' | 'done';

export type ProgressFn = (stage: AutopilotStage, progress: number, detail?: string) => void | Promise<void>;

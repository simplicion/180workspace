/**
 * Typed contracts for every agent in the autopilot calendar pipeline.
 * Each agent must return JSON that validates against one of these schemas; the runner gives it one
 * repair attempt with the validation errors before the stage fails.
 */
import { z } from 'zod';

export const HOOK_TYPES = ['pattern_interrupt', 'curiosity_gap', 'contrarian', 'relatable_pain', 'story'] as const;
export type HookType = (typeof HOOK_TYPES)[number];

export const CONTENT_FORMATS = ['reel', 'carousel', 'static', 'text'] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export const AUTOPILOT_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'x'] as const;
export type AutopilotPlatform = (typeof AUTOPILOT_PLATFORMS)[number];

const platformSchema = z.enum(AUTOPILOT_PLATFORMS);
const hookTypeSchema = z.enum(HOOK_TYPES);
const nonEmpty = (max: number) => z.string().trim().min(1).max(max);

// ---------------------------------------------------------------- strategist

export const StrategySlotSchema = z.object({
    day: z.number().int().min(1).max(31),
    platforms: z.array(platformSchema).min(1).max(6),
    format: z.enum(CONTENT_FORMATS),
    pillar: nonEmpty(80),
    topic: nonEmpty(200),
    angle: nonEmpty(300),
    hookType: hookTypeSchema.optional(),
    goal: z.string().max(120).optional(),
    /** Research URLs this slot is grounded in (must come from the research digest). */
    sourceUrls: z.array(z.string().url()).max(3).optional(),
});
export type StrategySlot = z.infer<typeof StrategySlotSchema>;

export const StrategySchema = z.object({
    audiencePsychology: z.object({
        coreDesires: z.array(nonEmpty(200)).min(1).max(6),
        corePains: z.array(nonEmpty(200)).min(1).max(6),
        objections: z.array(nonEmpty(200)).max(6).default([]),
        triggers: z.array(nonEmpty(200)).max(6).default([]),
    }),
    positioningAngle: nonEmpty(500),
    pillars: z.array(z.object({
        name: nonEmpty(80),
        percent: z.number().min(0).max(100),
        purpose: nonEmpty(300),
    })).min(2).max(6),
    cadence: z.array(z.object({
        platform: platformSchema,
        postsPerWeek: z.number().min(0).max(21),
        bestFormats: z.array(z.enum(CONTENT_FORMATS)).min(1),
    })).min(1),
    contentMix: z.object({
        reel: z.number().min(0).max(100),
        carousel: z.number().min(0).max(100),
        static: z.number().min(0).max(100),
        text: z.number().min(0).max(100),
    }),
    slots: z.array(StrategySlotSchema).min(1).max(120),
});
export type Strategy = z.infer<typeof StrategySchema>;

// ---------------------------------------------------------------- hook & script

export const ScriptSchema = z.object({
    hook: nonEmpty(300),
    body: z.array(z.object({
        beat: nonEmpty(600),
        retentionDevice: z.string().max(200).optional(),
    })).min(1).max(12),
    retentionLoop: nonEmpty(400),
    cta: nonEmpty(300),
    estimatedDurationSec: z.number().int().min(5).max(180),
});
export type Script = z.infer<typeof ScriptSchema>;

export const CarouselBriefSchema = z.object({
    title: nonEmpty(160),
    slides: z.array(z.object({
        index: z.number().int().min(1).max(20),
        role: z.enum(['hook', 'value', 'proof', 'cta']),
        headline: nonEmpty(140),
        body: z.string().max(400).default(''),
        visualIdea: z.string().max(300).default(''),
    })).min(3).max(12),
});
export type CarouselBrief = z.infer<typeof CarouselBriefSchema>;

export const HookScriptItemSchema = z.object({
    slotId: nonEmpty(40),
    headline: nonEmpty(160),
    hookType: hookTypeSchema,
    spokenHook: nonEmpty(300),
    onScreenHook: nonEmpty(90),
    script: ScriptSchema.optional(),
    shotNotes: z.array(nonEmpty(300)).max(15).optional(),
    carouselBrief: CarouselBriefSchema.optional(),
    visualBrief: z.string().max(500).optional(),
});
export type HookScriptItem = z.infer<typeof HookScriptItemSchema>;

export const HookScriptBatchSchema = z.object({ items: z.array(HookScriptItemSchema).min(1) });

// ---------------------------------------------------------------- copy

export const PlatformCopySchema = z.object({
    platform: platformSchema,
    caption: nonEmpty(5000),
    cta: nonEmpty(300),
    hashtags: z.array(z.string().trim().min(2).max(60)).max(30),
    postingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'postingTime must be HH:mm (24h)'),
});
export type PlatformCopy = z.infer<typeof PlatformCopySchema>;

export const CopyItemSchema = z.object({
    slotId: nonEmpty(40),
    copies: z.array(PlatformCopySchema).min(1),
});
export const CopyBatchSchema = z.object({ items: z.array(CopyItemSchema).min(1) });

// ---------------------------------------------------------------- critic

export const CriticReviewSchema = z.object({
    items: z.array(z.object({
        slotId: nonEmpty(40),
        verdict: z.enum(['ok', 'fixed', 'flag']),
        issues: z.array(z.string().max(300)).max(10).default([]),
        fixes: z.array(z.object({
            platform: platformSchema,
            caption: nonEmpty(5000),
        })).max(6).default([]),
        fixedSpokenHook: z.string().max(300).optional(),
    })),
});
export type CriticReview = z.infer<typeof CriticReviewSchema>;

// ---------------------------------------------------------------- research

export const ResearchDigestSchema = z.object({
    trends: z.array(z.object({
        topic: nonEmpty(200),
        whyNow: nonEmpty(400),
        sourceUrls: z.array(z.string().url()).min(1).max(5),
    })).max(10),
});
export type ResearchDigest = z.infer<typeof ResearchDigestSchema>;

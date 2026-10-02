/**
 * Shape normalisers for the autopilot agents' JSON. They only fix structure (wrappers, aliases, number ranges,
 * platform/format compatibility) and fill fields from data the run already has: the strategist's own slot, the
 * brand profile and fixed platform facts. They never write content (no stock hooks, CTAs, captions, pillars or
 * audience insights): anything missing stays missing, so the schema/check rejects it and the agent repairs it.
 */
import { PLATFORM_RULES } from './platform-rules';
import { CONTENT_FORMATS, DESIGN_SYSTEMS, HOOK_TYPES, PSYCHOLOGICAL_JOBS, type AutopilotPlatform } from './schemas';

const strList = (v: unknown, max: number): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x: string) => x.trim()).slice(0, max) : [];
const text = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const wordCount = (s: string) => (s || '').trim().split(/\s+/).filter(Boolean).length;

export interface StrategyNormaliseCtx {
    days: number;
    platforms: AutopilotPlatform[];
    allowedUrls: Set<string>;
    brandPositioning?: string | null;
}

export function normaliseStrategy(raw: any, ctx: StrategyNormaliseCtx): any {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    const out: any = { ...raw };

    const ap = raw.audiencePsychology;
    if (ap && typeof ap === 'object') {
        out.audiencePsychology = {
            coreDesires: strList(ap.coreDesires, 6),
            corePains: strList(ap.corePains, 6),
            objections: strList(ap.objections, 6),
            triggers: strList(ap.triggers, 6),
        };
    }
    // The brand's own positioning is real data; nothing is invented when both are missing.
    out.positioningAngle = text(raw.positioningAngle, 500) ?? text(ctx.brandPositioning, 500);

    if (Array.isArray(raw.pillars)) {
        const pillars = raw.pillars
            .filter((p: any) => p && text(p.name, 80) && text(p.purpose, 300))
            .slice(0, 6)
            .map((p: any) => ({ name: text(p.name, 80)!, percent: Math.max(0, Math.min(100, Number(p.percent) || 0)), purpose: text(p.purpose, 300)! }));
        const sum = pillars.reduce((n: number, p: any) => n + p.percent, 0);
        if (pillars.length && sum > 0) {
            pillars.forEach((p: any) => (p.percent = Math.round((p.percent / sum) * 100)));
            pillars[0].percent += 100 - pillars.reduce((n: number, p: any) => n + p.percent, 0);
        } else if (pillars.length) {
            const even = Math.floor(100 / pillars.length);
            pillars.forEach((p: any, i: number) => (p.percent = i === 0 ? 100 - even * (pillars.length - 1) : even));
        }
        out.pillars = pillars;
    }

    if (Array.isArray(raw.cadence)) {
        out.cadence = raw.cadence
            .filter((c: any) => c && ctx.platforms.includes(c.platform))
            .map((c: any) => {
                const allowed = PLATFORM_RULES[c.platform as AutopilotPlatform].formats;
                const best = strList(c.bestFormats, 4).filter((f) => (allowed as readonly string[]).includes(f));
                return { platform: c.platform, postsPerWeek: Math.max(0, Math.min(21, Number(c.postsPerWeek) || 0)), bestFormats: best.length ? best : [...allowed] };
            });
    }

    if (raw.contentMix && typeof raw.contentMix === 'object') {
        const vals = (['reel', 'carousel', 'static', 'text'] as const).map((k) => Math.max(0, Number(raw.contentMix[k]) || 0));
        const total = vals.reduce((a, b) => a + b, 0);
        if (total > 0) {
            const [r, c, s] = vals.map((v) => Math.round((v / total) * 100));
            out.contentMix = { reel: r, carousel: c, static: s, text: 100 - r - c - s };
        }
    }

    const pillarNames: string[] = Array.isArray(out.pillars) ? out.pillars.map((p: any) => p.name) : [];
    if (Array.isArray(raw.slots)) {
        out.slots = raw.slots
            // A slot without its own topic and angle is not a plan: it is dropped, never filled with a template.
            .filter((s: any) => s && typeof s === 'object' && text(s.topic, 200) && text(s.angle, 300))
            .map((s: any, idx: number) => {
                const day = Math.min(ctx.days, Math.max(1, Math.round(Number(s.day) || (idx % ctx.days) + 1)));
                let platforms = strList(s.platforms, 6).filter((p) => ctx.platforms.includes(p as AutopilotPlatform)) as AutopilotPlatform[];
                if (!platforms.length) platforms = [...ctx.platforms];
                let format = (CONTENT_FORMATS as readonly string[]).includes(s.format) ? s.format : undefined;
                const supported = (f: string) => platforms.some((p) => (PLATFORM_RULES[p].formats as readonly string[]).includes(f));
                if (!format || !supported(format)) format = PLATFORM_RULES[platforms[0]].formats[0];
                const pillarMatch = pillarNames.find((n) => n.toLowerCase() === String(s.pillar || '').toLowerCase());
                return {
                    day,
                    platforms,
                    format,
                    pillar: pillarMatch ?? pillarNames[idx % Math.max(1, pillarNames.length)] ?? text(s.pillar, 80),
                    topic: text(s.topic, 200),
                    angle: text(s.angle, 300),
                    // Labels only: an invalid label is replaced by a rotating valid one (no content is written).
                    hookType: HOOK_TYPES.includes(s.hookType) ? s.hookType : undefined,
                    psychologicalJob: PSYCHOLOGICAL_JOBS.includes(s.psychologicalJob) ? s.psychologicalJob : PSYCHOLOGICAL_JOBS[idx % PSYCHOLOGICAL_JOBS.length],
                    designSystem: DESIGN_SYSTEMS.includes(s.designSystem) ? s.designSystem : undefined,
                    whatContentDelivers: text(s.whatContentDelivers, 1000) ?? text(s.angle, 1000),
                    visualDirection: text(s.visualDirection, 800),
                    targetDurationSec: Number.isFinite(Number(s.targetDurationSec)) ? Math.min(180, Math.max(5, Math.round(Number(s.targetDurationSec)))) : undefined,
                    slideCount: Number.isFinite(Number(s.slideCount)) ? Math.min(12, Math.max(3, Math.round(Number(s.slideCount)))) : undefined,
                    goal: text(s.goal, 120),
                    sourceUrls: strList(s.sourceUrls, 3).filter((u) => ctx.allowedUrls.has(u)),
                };
            });
    }
    return out;
}

export interface HookSlotRef {
    slotId: string;
    format: string;
    topic: string;
    hookType?: string;
    psychologicalJob?: string;
    designSystem?: string;
    whatContentDelivers?: string;
    visualDirection?: string;
    targetDurationSec?: number;
    slideCount?: number;
}

/** Hook/script items: accepts a bare array or {items}, aliases `hook`, string beats, missing slide numbers. */
export function normaliseHookScript(raw: any, chunk: HookSlotRef[]): any {
    if (!raw || typeof raw !== 'object') return raw;
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : [raw];
    const byId = new Map(chunk.map((s) => [s.slotId, s]));
    return {
        items: list
            .filter((it: any) => it && typeof it === 'object')
            .map((it: any, idx: number) => {
                const slotId = text(it.slotId, 40) ?? (list.length === chunk.length ? chunk[idx]?.slotId : undefined);
                const slot = slotId ? byId.get(slotId) : undefined;
                const item: any = {
                    ...it,
                    slotId,
                    headline: text(it.headline, 200) ?? slot?.topic,
                    spokenHook: text(it.spokenHook, 300) ?? text(it.hook, 300),
                    onScreenHook: text(it.onScreenHook, 120),
                    hookType: slot?.hookType ?? it.hookType,
                    psychologicalJob: PSYCHOLOGICAL_JOBS.includes(it.psychologicalJob) ? it.psychologicalJob : slot?.psychologicalJob,
                    designSystem: DESIGN_SYSTEMS.includes(it.designSystem) ? it.designSystem : slot?.designSystem,
                    whatContentDelivers: text(it.whatContentDelivers, 1000) ?? slot?.whatContentDelivers,
                    visualDirection: text(it.visualDirection, 800) ?? slot?.visualDirection,
                };
                if (it.script && typeof it.script === 'object') {
                    const sc = it.script;
                    item.script = {
                        ...sc,
                        hook: text(sc.hook, 300) ?? item.spokenHook,
                        body: Array.isArray(sc.body) ? sc.body.map((b: any) => (typeof b === 'string' ? { beat: b } : b)).filter((b: any) => text(b?.beat, 2000)) : sc.body,
                        retentionLoop: text(sc.retentionLoop, 400),
                        cta: text(sc.cta, 300),
                        estimatedDurationSec: Number.isFinite(Number(sc.estimatedDurationSec)) ? Number(sc.estimatedDurationSec) : slot?.targetDurationSec,
                        psychologicalJob: item.psychologicalJob,
                        visualDirection: item.visualDirection,
                        whatContentDelivers: item.whatContentDelivers,
                    };
                }
                if (it.carouselBrief && typeof it.carouselBrief === 'object') {
                    const cb = it.carouselBrief;
                    item.carouselBrief = {
                        ...cb,
                        title: text(cb.title, 200) ?? item.headline,
                        psychologicalJob: item.psychologicalJob,
                        designSystem: item.designSystem,
                        visualDirection: text(cb.visualDirection, 800) ?? item.visualDirection,
                        whatContentDelivers: text(cb.whatContentDelivers, 1000) ?? item.whatContentDelivers,
                        slides: Array.isArray(cb.slides)
                            ? cb.slides.filter((sl: any) => sl && text(sl.headline, 300)).map((sl: any, i: number) => ({ ...sl, index: Number(sl.index) || i + 1 }))
                            : cb.slides,
                    };
                }
                return item;
            }),
    };
}

/** Problems the hook/script agent must fix (fed back into the repair prompt). Nothing is truncated or padded. */
export function hookScriptProblems(items: any[], chunk: HookSlotRef[]): string[] {
    const problems: string[] = [];
    const byId = new Map(items.map((i) => [i.slotId, i]));
    for (const slot of chunk) {
        const it = byId.get(slot.slotId);
        if (!it) {
            problems.push(`missing item for slotId ${slot.slotId}`);
            continue;
        }
        if (wordCount(it.spokenHook) > 12) problems.push(`${slot.slotId}: spokenHook has ${wordCount(it.spokenHook)} words; rewrite it in at most 12`);
        if (slot.format === 'reel') {
            const sc = it.script;
            if (!sc) problems.push(`${slot.slotId}: reel needs a script`);
            else {
                if (!Array.isArray(sc.body) || sc.body.length < 3) problems.push(`${slot.slotId}: script.body needs 3-6 beats`);
                if (!sc.cta) problems.push(`${slot.slotId}: script.cta is missing`);
                if (!sc.retentionLoop) problems.push(`${slot.slotId}: script.retentionLoop is missing`);
            }
            if (!Array.isArray(it.shotNotes) || it.shotNotes.length < 3) problems.push(`${slot.slotId}: reel needs 3-8 shotNotes`);
        }
        if (slot.format === 'carousel') {
            const slides = it.carouselBrief?.slides;
            // SOP: hook slide + value + takeaway/CTA; a creator who asked for 3 slides gets 3.
            const min = Math.min(4, slot.slideCount ?? 4);
            if (!Array.isArray(slides) || slides.length < min) problems.push(`${slot.slotId}: carouselBrief needs at least ${min} slides${slot.slideCount ? ` (about ${slot.slideCount})` : ''}`);
        }
    }
    return problems;
}

export interface CopyPieceRef {
    slotId: string;
    platforms: string[];
}

/** Copy items: wrappers and platform-name case only. A missing copy stays missing (the check asks for it). */
export function normaliseCopy(raw: any, chunk: CopyPieceRef[]): any {
    if (!raw || typeof raw !== 'object') return raw;
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : [raw];
    const wanted = new Set(chunk.map((p) => p.slotId));
    return {
        items: list
            .filter((it: any) => it && typeof it === 'object' && wanted.has(String(it.slotId)))
            .map((it: any) => ({
                slotId: String(it.slotId),
                copies: (Array.isArray(it.copies) ? it.copies : [])
                    .filter((c: any) => c && typeof c === 'object' && c.platform)
                    .map((c: any) => ({
                        ...c,
                        platform: String(c.platform).toLowerCase().trim(),
                        hashtags: strList(c.hashtags, 30).map((h) => (h.startsWith('#') ? h : `#${h}`)),
                        postingTime: typeof c.postingTime === 'string' ? c.postingTime.trim().padStart(5, '0') : c.postingTime,
                    })),
            })),
    };
}

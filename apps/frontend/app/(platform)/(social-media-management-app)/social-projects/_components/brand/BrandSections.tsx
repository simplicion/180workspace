'use client';

import React, { useEffect, useId, useState } from 'react';
import { Check, ImagePlus, Trash2, X } from 'lucide-react';
import { Button, Input } from '@workspace/ui';
import {
    BRAND_FONTS,
    BRAND_TYPE_OPTIONS,
    CAPTION_PRESET_OPTIONS,
    COLOR_KEYS,
    FIELD_LABELS,
    HEX,
    LOGO_MAX_BYTES,
    LOGO_TYPES,
    PLATFORM_OPTIONS,
    TONE_SUGGESTIONS,
    googleFontHref,
    type BrandDraft,
    type ColorKey,
} from './brand-draft';

type Update = (patch: Partial<BrandDraft>) => void;
type Errors = Partial<Record<string, string>>;

const card = 'rounded-3xl border border-gray-200 bg-white p-4 md:p-6 shadow-lg shadow-black/5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)]';
const textareaClass =
    'w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100';
const chip = (active: boolean) =>
    `min-h-[44px] rounded-2xl border px-4 py-2 text-left text-sm transition-all duration-300 ${
        active
            ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800'
    }`;

export function Field({ label, hint, required, error, htmlFor, children }: {
    label: string; hint?: string; required?: boolean; error?: string; htmlFor?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-900 dark:text-zinc-100">
                {label} {required && <span className="font-normal text-gray-500 dark:text-zinc-400">(needed by the AI)</span>}
            </label>
            {hint && <p className="text-xs text-gray-600 dark:text-gray-400">{hint}</p>}
            {children}
            {error && <p role="alert" aria-live="polite" className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

function TextField({ id, value, onChange, placeholder, maxLength }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number }) {
    return <Input id={id} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-11 dark:border-zinc-800 dark:bg-zinc-950" />;
}

function TextArea({ id, value, onChange, placeholder, rows = 3, maxLength }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; maxLength?: number }) {
    return <textarea id={id} rows={rows} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={textareaClass} />;
}

/** Chips with add/remove. Enter or comma adds. */
export function TagListInput({ id, values, onChange, placeholder, format, max = 30 }: {
    id: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; format?: (s: string) => string; max?: number;
}) {
    const [text, setText] = useState('');
    const add = () => {
        const parts = text.split(',').map((s) => (format ? format(s.trim()) : s.trim())).filter(Boolean);
        const next = [...values];
        for (const p of parts) if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
        onChange(next.slice(0, max));
        setText('');
    };
    return (
        <div className="space-y-2">
            {values.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                    {values.map((v, i) => (
                        <li key={`${v}-${i}`} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 py-1 pl-3 pr-1 text-sm text-gray-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                            {v}
                            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((_, j) => j !== i))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 hover:bg-gray-200 dark:hover:bg-zinc-800">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex gap-2">
                <Input
                    id={id}
                    value={text}
                    placeholder={placeholder}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
                    className="h-11 dark:border-zinc-800 dark:bg-zinc-950"
                />
                <Button type="button" variant="outline" className="h-11" onClick={add} disabled={!text.trim() || values.length >= max}>Add</Button>
            </div>
        </div>
    );
}

// ─── Brand identity ─────────────────────────────────────────────────────────

export function BrandIdentitySection({ draft, update, errors = {} }: { draft: BrandDraft; update: Update; errors?: Errors }) {
    const id = useId();
    return (
        <div className="space-y-6">
            <Field label="Brand name" hint="The name your audience knows. Leave blank to use the project name." htmlFor={`${id}-name`}>
                <TextField id={`${id}-name`} value={draft.brandName} maxLength={120} onChange={(v) => update({ brandName: v })} placeholder="e.g. Acme Coffee" />
            </Field>
            <Field label="Brand type" required>
                <div role="radiogroup" className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {BRAND_TYPE_OPTIONS.map((o) => (
                        <button key={o.id} type="button" role="radio" aria-checked={draft.brandType === o.id} onClick={() => update({ brandType: draft.brandType === o.id ? '' : o.id })} className={chip(draft.brandType === o.id)}>
                            <span className="block font-semibold">{o.label}</span>
                            <span className="block text-xs opacity-75">{o.desc}</span>
                        </button>
                    ))}
                </div>
            </Field>
            <Field label="Positioning" required hint="Who you are for and why you are different, in one or two sentences." error={errors.positioning} htmlFor={`${id}-pos`}>
                <TextArea id={`${id}-pos`} rows={2} maxLength={500} value={draft.positioning} onChange={(v) => update({ positioning: v })} placeholder="e.g. Specialty coffee for people who brew at home and want café results." />
            </Field>
            <Field label="Tagline" error={errors.tagline} htmlFor={`${id}-tag`}>
                <TextField id={`${id}-tag`} value={draft.tagline} maxLength={160} onChange={(v) => update({ tagline: v })} placeholder="e.g. Brew slow. Taste more." />
            </Field>
            <Field label="Description" required hint="What the brand does and sells." htmlFor={`${id}-desc`}>
                <TextArea id={`${id}-desc`} maxLength={2000} value={draft.description} onChange={(v) => update({ description: v })} />
            </Field>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field label="Ideation" hint="The big idea or story behind the brand." htmlFor={`${id}-idea`}>
                    <TextArea id={`${id}-idea`} maxLength={2000} value={draft.ideation} onChange={(v) => update({ ideation: v })} />
                </Field>
                <Field label="Ideology" hint="Beliefs and values the content should reflect." htmlFor={`${id}-ideo`}>
                    <TextArea id={`${id}-ideo`} maxLength={2000} value={draft.ideology} onChange={(v) => update({ ideology: v })} />
                </Field>
            </div>
        </div>
    );
}

// ─── Visual identity ────────────────────────────────────────────────────────

const COLOR_LABELS: Record<ColorKey, string> = { primary: 'Primary', accent: 'Accent', background: 'Background', text: 'Text' };

function ColorField({ k, value, onChange, error }: { k: ColorKey; value: string; onChange: (v: string) => void; error?: string }) {
    const id = useId();
    const [text, setText] = useState(value);
    useEffect(() => setText(value), [value]);
    return (
        <Field label={`${COLOR_LABELS[k]} colour`} required={k === 'primary'} error={error} htmlFor={`${id}-hex`}>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    aria-label={`${COLOR_LABELS[k]} colour picker`}
                    value={HEX.test(value) ? value : '#000000'}
                    onChange={(e) => onChange(e.target.value.toUpperCase())}
                    className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-gray-200 bg-transparent p-1 dark:border-zinc-800"
                />
                <Input
                    id={`${id}-hex`}
                    value={text}
                    placeholder="Not set"
                    maxLength={7}
                    onChange={(e) => {
                        let v = e.target.value.trim();
                        if (v && !v.startsWith('#')) v = `#${v}`;
                        setText(v);
                        if (v === '' || HEX.test(v)) onChange(v.toUpperCase());
                        else onChange(v);
                    }}
                    className="h-11 font-mono uppercase dark:border-zinc-800 dark:bg-zinc-950"
                />
                {value && (
                    <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Clear ${COLOR_LABELS[k]} colour`} onClick={() => onChange('')}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </Field>
    );
}

function useGoogleFont(font: string) {
    useEffect(() => {
        if (!font || typeof document === 'undefined') return;
        const href = googleFontHref(font);
        if (document.querySelector(`link[data-brand-font="${font}"]`)) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.brandFont = font;
        document.head.appendChild(link);
    }, [font]);
}

/** Live preview. Unset colours render as a neutral grey swatch, labelled, never as a made-up brand colour. */
export function BrandPreviewCard({ draft, logoPreview }: { draft: BrandDraft; logoPreview?: string | null }) {
    useGoogleFont(draft.font);
    const c = (k: ColorKey, fallback: string) => (HEX.test(draft.colors[k]) ? draft.colors[k] : fallback);
    const unset = COLOR_KEYS.filter((k) => !HEX.test(draft.colors[k]));
    const logo = logoPreview || draft.logoUrl;
    return (
        <div className="space-y-2">
            <div
                className="overflow-hidden rounded-3xl border border-gray-200 dark:border-zinc-800"
                style={{ background: c('background', '#F4F4F5'), color: c('text', '#18181B'), fontFamily: draft.font ? `'${draft.font}', sans-serif` : undefined }}
            >
                <div className="flex items-center gap-3 p-5">
                    {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo} alt="Brand logo" className="h-10 w-10 rounded-xl object-contain" />
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold" style={{ background: c('primary', '#A1A1AA'), color: c('background', '#FFFFFF') }}>
                            {(draft.brandName || 'B').slice(0, 1).toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="truncate text-base font-bold">{draft.brandName || 'Your brand'}</p>
                        <p className="truncate text-xs opacity-70">{draft.tagline || 'Tagline appears here'}</p>
                    </div>
                </div>
                <div className="space-y-3 px-5 pb-5">
                    <p className="text-2xl font-bold leading-tight tracking-tight">
                        {draft.positioning ? draft.positioning.slice(0, 90) : 'A headline in your brand style'}
                    </p>
                    <span className="inline-block rounded-full px-4 py-2 text-sm font-semibold" style={{ background: c('accent', '#71717A'), color: c('background', '#FFFFFF') }}>
                        {draft.ctas[0] || 'Call to action'}
                    </span>
                    <div className="h-1.5 w-24 rounded-full" style={{ background: c('primary', '#A1A1AA') }} />
                </div>
            </div>
            {unset.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-zinc-400">Grey shows colours you have not set yet: {unset.map((k) => COLOR_LABELS[k].toLowerCase()).join(', ')}.</p>
            )}
        </div>
    );
}

/** Picks a logo file; validates type and size locally. The parent decides when to upload it. */
export function LogoField({ draft, pendingFile, onFile, onRemove, uploading }: {
    draft: BrandDraft; pendingFile: File | null; onFile: (f: File) => void; onRemove: () => void; uploading?: boolean;
}) {
    const id = useId();
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    useEffect(() => {
        if (!pendingFile) { setPreview(null); return; }
        const url = URL.createObjectURL(pendingFile);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [pendingFile]);
    const shown = preview || draft.logoUrl;
    return (
        <Field label="Logo" hint="PNG, JPEG, WebP or SVG, up to 2 MB. A transparent PNG or SVG works best." error={error ?? undefined} htmlFor={`${id}-file`}>
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-950">
                    {shown ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={shown} alt="Logo preview" className="h-full w-full object-contain" />
                    ) : (
                        <ImagePlus className="h-6 w-6 text-gray-400" aria-hidden />
                    )}
                </div>
                <label htmlFor={`${id}-file`} className="inline-flex min-h-[44px] cursor-pointer items-center rounded-2xl border border-gray-200 px-4 text-sm font-medium transition-all duration-300 hover:bg-gray-100 dark:border-zinc-800 dark:hover:bg-zinc-800">
                    {uploading ? 'Uploading…' : shown ? 'Replace logo' : 'Choose file'}
                </label>
                <input
                    id={`${id}-file`}
                    type="file"
                    accept={LOGO_TYPES.join(',')}
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (!f) return;
                        if (!LOGO_TYPES.includes(f.type)) { setError('Use a PNG, JPEG, WebP or SVG file.'); return; }
                        if (f.size > LOGO_MAX_BYTES) { setError('The logo must be 2 MB or smaller.'); return; }
                        setError(null);
                        onFile(f);
                    }}
                />
                {shown && !uploading && (
                    <Button type="button" variant="ghost" className="h-11" onClick={onRemove}>
                        <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                    </Button>
                )}
            </div>
        </Field>
    );
}

export function VisualIdentitySection({ draft, update, errors = {}, logo }: {
    draft: BrandDraft; update: Update; errors?: Errors;
    logo: { pendingFile: File | null; onFile: (f: File) => void; onRemove: () => void; uploading?: boolean };
}) {
    const id = useId();
    const [preview, setPreview] = useState<string | null>(null);
    useEffect(() => {
        if (!logo.pendingFile) { setPreview(null); return; }
        const url = URL.createObjectURL(logo.pendingFile);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [logo.pendingFile]);
    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {COLOR_KEYS.map((k) => (
                        <ColorField key={k} k={k} value={draft.colors[k]} error={errors[`colors.${k}`]} onChange={(v) => update({ colors: { ...draft.colors, [k]: v } })} />
                    ))}
                </div>
                <LogoField draft={draft} {...logo} />
                <Field label="Font" hint="Used for captions, carousels and graphics." htmlFor={`${id}-font`}>
                    <select
                        id={`${id}-font`}
                        value={draft.font}
                        onChange={(e) => update({ font: e.target.value })}
                        className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                    >
                        <option value="">Not chosen yet</option>
                        {BRAND_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                </Field>
                <Field label="Caption style" hint="How captions look on your videos.">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {CAPTION_PRESET_OPTIONS.map((o) => (
                            <button key={o.id} type="button" aria-pressed={draft.captionStylePreset === o.id} onClick={() => update({ captionStylePreset: draft.captionStylePreset === o.id ? '' : o.id })} className={chip(draft.captionStylePreset === o.id)}>
                                <span className="block font-semibold">{o.label}</span>
                                <span className="block text-xs opacity-75">{o.desc}</span>
                            </button>
                        ))}
                    </div>
                </Field>
                <Field label="Logo watermark on videos">
                    <div role="radiogroup" className="flex flex-wrap gap-2">
                        {[{ v: true, l: 'Show watermark' }, { v: false, l: 'No watermark' }].map((o) => (
                            <button key={o.l} type="button" role="radio" aria-checked={draft.watermarkEnabled === o.v} onClick={() => update({ watermarkEnabled: draft.watermarkEnabled === o.v ? null : o.v })} className={chip(draft.watermarkEnabled === o.v)}>
                                {o.l}
                            </button>
                        ))}
                    </div>
                </Field>
            </div>
            <div className="lg:sticky lg:top-6 lg:self-start">
                <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-zinc-100">Live preview</p>
                <BrandPreviewCard draft={draft} logoPreview={preview} />
            </div>
        </div>
    );
}

// ─── Voice ──────────────────────────────────────────────────────────────────

export function VoiceSection({ draft, update }: { draft: BrandDraft; update: Update }) {
    const id = useId();
    return (
        <div className="space-y-6">
            <Field label="Tone of voice" required hint="Describe it in your own words, or start from a suggestion." htmlFor={`${id}-tone`}>
                <TextField id={`${id}-tone`} value={draft.tone} maxLength={200} onChange={(v) => update({ tone: v })} placeholder="e.g. Warm, witty, never salesy" />
                <div className="flex flex-wrap gap-2 pt-1">
                    {TONE_SUGGESTIONS.map((t) => (
                        <button key={t} type="button" onClick={() => update({ tone: t })} className="min-h-[36px] rounded-xl border border-gray-200 px-3 text-xs text-gray-700 transition-all duration-300 hover:bg-gray-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800">
                            {t}
                        </button>
                    ))}
                </div>
            </Field>
            <Field label="Audience" required hint="Who you are talking to: role, situation, what they care about." htmlFor={`${id}-aud`}>
                <TextArea id={`${id}-aud`} rows={2} maxLength={1000} value={draft.audience} onChange={(v) => update({ audience: v })} />
            </Field>
            <Field label="Content pillars" hint="3–5 recurring themes." htmlFor={`${id}-pil`}>
                <TagListInput id={`${id}-pil`} max={12} values={draft.contentPillars} onChange={(v) => update({ contentPillars: v })} placeholder="e.g. Brewing guides" />
            </Field>
            <Field label="Restricted words" hint="The AI will never use these." htmlFor={`${id}-fw`}>
                <TagListInput id={`${id}-fw`} max={100} values={draft.forbiddenWords} onChange={(v) => update({ forbiddenWords: v })} placeholder="e.g. cheap" />
            </Field>
            <Field label="Calls to action" htmlFor={`${id}-cta`}>
                <TagListInput id={`${id}-cta`} max={20} values={draft.ctas} onChange={(v) => update({ ctas: v })} placeholder="e.g. Shop the new roast" />
            </Field>
            <Field label="Hashtags" htmlFor={`${id}-tags`}>
                <TagListInput
                    id={`${id}-tags`}
                    max={30}
                    values={draft.hashtags}
                    onChange={(v) => update({ hashtags: v })}
                    placeholder="e.g. homebrew"
                    format={(s) => { const t = s.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, ''); return t ? `#${t}` : ''; }}
                />
            </Field>
            <Field label="Other guidelines" hint="Anything else the AI must follow." htmlFor={`${id}-gl`}>
                <TextArea id={`${id}-gl`} rows={3} maxLength={4000} value={draft.customGuidelines} onChange={(v) => update({ customGuidelines: v })} />
            </Field>
        </div>
    );
}

// ─── Platforms ──────────────────────────────────────────────────────────────

export function PlatformPicker({ draft, update }: { draft: BrandDraft; update: Update }) {
    return (
        <Field label="Target platforms" required hint="Where this brand publishes.">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {PLATFORM_OPTIONS.map((p) => {
                    const on = draft.targetPlatforms.includes(p.id);
                    return (
                        <button key={p.id} type="button" aria-pressed={on} onClick={() => update({ targetPlatforms: on ? draft.targetPlatforms.filter((x) => x !== p.id) : [...draft.targetPlatforms, p.id] })} className={`${chip(on)} flex items-center justify-between`}>
                            <span className="font-semibold">{p.label}</span>
                            {on && <Check className="h-4 w-4" aria-hidden />}
                        </button>
                    );
                })}
            </div>
        </Field>
    );
}

// ─── Completeness ───────────────────────────────────────────────────────────

export function CompletenessNotice({ missing, percent }: { missing: string[]; percent?: number }) {
    if (!missing.length) {
        return (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Check className="h-4 w-4" aria-hidden /> The AI has everything it needs from this brand{typeof percent === 'number' ? ` (${percent}% complete)` : ''}.
            </div>
        );
    }
    return (
        <div role="status" aria-live="polite" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-semibold">Still missing{typeof percent === 'number' ? ` (${percent}% complete)` : ''}</p>
            <p className="mt-1">{missing.map((m) => FIELD_LABELS[m] || m).join(', ')}. The AI will ask about these or keep them neutral; it will not make them up.</p>
        </div>
    );
}

export { card as brandCardClass };

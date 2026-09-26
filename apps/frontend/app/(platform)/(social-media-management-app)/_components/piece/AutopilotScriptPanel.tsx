'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react';
import { socialAutopilotService, apiError, ApiErrorInfo, AutopilotPieceFields } from '@/lib/services/social-autopilot.service';
import { CopyButton, ErrorPanel } from '../shared/StatePanels';

const HOOK_LABEL: Record<string, string> = {
    pattern_interrupt: 'Pattern interrupt',
    curiosity_gap: 'Curiosity gap',
    contrarian: 'Contrarian',
    relatable_pain: 'Relatable pain',
    story: 'Story',
};

function Field({ label, text, children }: { label: string; text?: string; children?: React.ReactNode }) {
    return (
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{label}</span>
                {text ? <CopyButton text={text} /> : null}
            </div>
            {children ?? <p className="text-sm text-slate-900 dark:text-zinc-100 whitespace-pre-wrap">{text}</p>}
        </div>
    );
}

/**
 * Structured autopilot piece (autopilot.v1): hooks, script beats + retention loop, CTA, shot notes, per-platform
 * captions + hashtags, sources and posting time, each with copy. Regenerate rewrites the piece with an instruction.
 */
export default function AutopilotScriptPanel({
    piece,
    projectId,
    onRegenerated,
}: {
    piece: AutopilotPieceFields & { id?: string; _id?: string };
    projectId?: string;
    onRegenerated: (piece: any) => void;
}) {
    const [instruction, setInstruction] = useState('');
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<ApiErrorInfo | null>(null);
    const pieceId = piece.id || piece._id || '';

    const regenerate = async () => {
        if (!projectId || !pieceId || !instruction.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const res = await socialAutopilotService.regeneratePiece(projectId, pieceId, instruction.trim());
            onRegenerated(res.piece);
            setInstruction('');
            setOpen(false);
        } catch (err) {
            setError(apiError(err, 'Could not regenerate this piece.'));
        } finally {
            setBusy(false);
        }
    };

    const script = piece.script;
    const scriptText = script
        ? [script.hook, ...script.body.map((b) => b.beat), script.retentionLoop, script.cta].filter(Boolean).join('\n\n')
        : '';
    const captions = Object.entries(piece.captions || {});

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5" /> Autopilot {piece.format ? `· ${piece.format}` : ''}
                    {piece.hookType && <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 normal-case tracking-normal">{HOOK_LABEL[piece.hookType] || piece.hookType}</span>}
                </div>
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    disabled={!projectId}
                    title={projectId ? undefined : 'This calendar is not linked to a project'}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-4 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all duration-300 disabled:opacity-40"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </button>
            </div>

            {open && (
                <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5 space-y-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300" htmlFor="regen-instruction">What should change?</label>
                    <textarea
                        id="regen-instruction"
                        rows={3}
                        maxLength={1000}
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="e.g. Make the hook more contrarian and mention our 14-day trial"
                        className="w-full p-3 text-sm rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100"
                    />
                    {error && (
                        <ErrorPanel
                            compact
                            title="Regeneration failed"
                            message={error.message}
                            code={error.code}
                            onRetry={regenerate}
                            secondary={error.code === 'AI_NOT_CONFIGURED' ? { label: 'Open AI settings', href: '/settings/ai' } : { label: 'Cancel', onClick: () => setOpen(false) }}
                        />
                    )}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setOpen(false)} className="min-h-[44px] px-4 text-xs font-semibold text-slate-600 dark:text-zinc-400">Cancel</button>
                        <button type="button" onClick={regenerate} disabled={busy || !instruction.trim()} className="min-h-[44px] px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">
                            {busy ? 'Rewriting…' : 'Rewrite piece'}
                        </button>
                    </div>
                </div>
            )}

            {piece.critic && piece.critic.verdict === 'flag' && piece.critic.issues.length > 0 && (
                <div role="alert" className="p-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Needs review: {piece.critic.issues.join('; ')}</span>
                </div>
            )}

            {piece.spokenHook && <Field label="Spoken hook" text={piece.spokenHook} />}
            {piece.onScreenHook && <Field label="On-screen hook" text={piece.onScreenHook} />}

            {script && (
                <Field label={`Script · ~${script.estimatedDurationSec}s`} text={scriptText}>
                    <ol className="space-y-2 text-sm text-slate-900 dark:text-zinc-100">
                        <li><span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 mr-1">Hook</span>{script.hook}</li>
                        {script.body.map((b, i) => (
                            <li key={i}>
                                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400 mr-1">Beat {i + 1}</span>{b.beat}
                                {b.retentionDevice && <span className="block text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Retention: {b.retentionDevice}</span>}
                            </li>
                        ))}
                        <li><span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 mr-1">Retention loop</span>{script.retentionLoop}</li>
                        <li><span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 mr-1">CTA</span>{script.cta}</li>
                    </ol>
                </Field>
            )}

            {piece.shotNotes && piece.shotNotes.length > 0 && (
                <Field label="Shot notes" text={piece.shotNotes.join('\n')}>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-900 dark:text-zinc-100">
                        {piece.shotNotes.map((n, i) => <li key={i}>{n}</li>)}
                    </ul>
                </Field>
            )}

            {piece.carouselBrief && (
                <Field label={`Carousel brief · ${piece.carouselBrief.title}`} text={piece.carouselBrief.slides.map((s) => `${s.index}. ${s.headline}\n${s.body}`).join('\n\n')}>
                    <ol className="space-y-1.5 text-sm text-slate-900 dark:text-zinc-100">
                        {piece.carouselBrief.slides.map((s) => (
                            <li key={s.index}><span className="text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400 mr-1">{s.index} · {s.role}</span>{s.headline}{s.body ? ` — ${s.body}` : ''}</li>
                        ))}
                    </ol>
                </Field>
            )}

            {captions.map(([platform, c]) => c && (
                <Field
                    key={platform}
                    label={`${platform} caption${c.postingTime ? ` · ${c.postingTime}` : ''}`}
                    text={[c.caption, c.cta, (c.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')].filter(Boolean).join('\n\n')}
                >
                    <p className="text-sm text-slate-900 dark:text-zinc-100 whitespace-pre-wrap">{c.caption}</p>
                    {c.cta && <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">CTA: {c.cta}</p>}
                    {c.hashtags?.length > 0 && (
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 break-words">{c.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}</p>
                            <CopyButton text={c.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')} label="Copy tags" />
                        </div>
                    )}
                </Field>
            ))}

            {piece.postingTime && <Field label="Posting time" text={piece.postingTime} />}

            {piece.sources && piece.sources.length > 0 && (
                <Field label="Research sources" text={piece.sources.join('\n')}>
                    <ul className="space-y-1">
                        {piece.sources.map((s, i) => (
                            <li key={i} className="text-xs break-all">
                                {/^https?:\/\//.test(s) ? (
                                    <a href={s} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                                        {s} <ExternalLink className="w-3 h-3 shrink-0" />
                                    </a>
                                ) : <span className="text-slate-700 dark:text-zinc-300">{s}</span>}
                            </li>
                        ))}
                    </ul>
                </Field>
            )}
        </div>
    );
}

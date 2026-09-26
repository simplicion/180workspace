'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Layers, RefreshCw, Image as ImageIcon, AlertTriangle, ExternalLink } from 'lucide-react';
import { UniversalSkeleton } from '@workspace/ui';
import {
    socialAutopilotService,
    apiError,
    ApiErrorInfo,
    CreativeJob,
    StartCreativeBody,
} from '@/lib/services/social-autopilot.service';
import { ErrorPanel } from '../shared/StatePanels';

const POLL_MS = 2000;
const ACTIVE = ['queued', 'designing', 'sourcing_images', 'rendering', 'uploading'];

/**
 * "Make carousel" / "Make image" for a calendar piece or a post: starts a creative job, polls it, shows the slides
 * and lets the user redo one slide. The backend attaches the slides to the post (creating a draft post for a piece
 * that has none); this component only shows the result.
 */
export default function CarouselMaker({
    projectId,
    pieceId,
    postId,
    kind = 'carousel',
    initialJobId,
    onAttached,
}: {
    projectId: string;
    pieceId?: string;
    postId?: string;
    kind?: 'carousel' | 'static';
    initialJobId?: string | null;
    onAttached?: (job: CreativeJob) => void;
}) {
    const [job, setJob] = useState<CreativeJob | null>(null);
    const [loadingExisting, setLoadingExisting] = useState(!!initialJobId);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<ApiErrorInfo | null>(null);
    const [stockAvailable, setStockAvailable] = useState<boolean | null>(null);
    const [format, setFormat] = useState<'portrait' | 'square'>('portrait');
    const [slideEdit, setSlideEdit] = useState<{ index: number; instruction: string; regenerateImage: boolean } | null>(null);
    const [slideBusy, setSlideBusy] = useState(false);
    const [slideError, setSlideError] = useState<ApiErrorInfo | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastBody = useRef<StartCreativeBody | null>(null);
    const notified = useRef<string | null>(null);

    const poll = useCallback(async (jobId: string) => {
        try {
            const j = await socialAutopilotService.getCreativeJob(projectId, jobId);
            setJob(j);
            if (ACTIVE.includes(j.status)) {
                timer.current = setTimeout(() => poll(jobId), POLL_MS);
            } else if (j.status === 'completed' && onAttached && notified.current !== `${j.id}:${j.completedAt}`) {
                notified.current = `${j.id}:${j.completedAt}`;
                onAttached(j);
            }
        } catch (err) {
            setError(apiError(err, 'Could not read the creative job.'));
        } finally {
            setLoadingExisting(false);
        }
    }, [projectId, onAttached]);

    useEffect(() => {
        if (initialJobId) poll(initialJobId);
        return () => { if (timer.current) clearTimeout(timer.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialJobId, projectId]);

    const start = async (overrides: Partial<StartCreativeBody> = {}) => {
        if (timer.current) clearTimeout(timer.current);
        const body: StartCreativeBody = { ...(pieceId ? { pieceId } : {}), ...(postId ? { postId } : {}), format, ...overrides };
        lastBody.current = body;
        setStarting(true);
        setError(null);
        try {
            const j = kind === 'static'
                ? await socialAutopilotService.startStaticPost(projectId, body)
                : await socialAutopilotService.startCarousel(projectId, body);
            setJob(j);
            timer.current = setTimeout(() => poll(j.id), POLL_MS);
        } catch (err) {
            const info = apiError(err, 'Could not start the creative job.');
            setError(info);
            if (info.code === 'IMAGE_MODEL_NOT_CONFIGURED') {
                socialAutopilotService.getCreativeStatus(projectId)
                    .then((s) => setStockAvailable(s.stock.configured))
                    .catch(() => setStockAvailable(null));
            }
        } finally {
            setStarting(false);
        }
    };

    const regenerateSlide = async () => {
        if (!job || !slideEdit) return;
        setSlideBusy(true);
        setSlideError(null);
        try {
            const body = { ...(slideEdit.instruction.trim() ? { instruction: slideEdit.instruction.trim() } : {}), regenerateImage: slideEdit.regenerateImage };
            const j = await socialAutopilotService.regenerateSlide(projectId, job.id, slideEdit.index, body);
            setJob(j);
            setSlideEdit(null);
            timer.current = setTimeout(() => poll(j.id), POLL_MS);
        } catch (err) {
            setSlideError(apiError(err, 'Could not redo the slide.'));
        } finally {
            setSlideBusy(false);
        }
    };

    const label = kind === 'static' ? 'image' : 'carousel';
    const running = !!job && ACTIVE.includes(job.status);
    const failed = job?.status === 'failed';
    const slides = job?.result?.slides || [];

    return (
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                        {kind === 'static' ? 'Designed image' : 'Carousel slides'}
                    </h4>
                </div>
                {!running && (
                    <div className="flex items-center gap-2">
                        {kind === 'carousel' && (
                            <select
                                aria-label="Slide format"
                                value={format}
                                onChange={(e) => setFormat(e.target.value as any)}
                                className="min-h-[44px] px-3 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200"
                            >
                                <option value="portrait">Portrait 4:5</option>
                                <option value="square">Square 1:1</option>
                            </select>
                        )}
                        <button
                            type="button"
                            onClick={() => start()}
                            disabled={starting || loadingExisting}
                            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-300 disabled:opacity-50"
                        >
                            {slides.length ? <RefreshCw className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                            {starting ? 'Starting…' : slides.length ? `Remake ${label}` : `Make ${label}`}
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <ErrorPanel
                    compact
                    title={error.code === 'IMAGE_MODEL_NOT_CONFIGURED' ? 'No image model is configured' : `Could not make the ${label}`}
                    message={error.message}
                    code={error.code}
                    onRetry={() => start(lastBody.current || {})}
                    secondary={error.code === 'IMAGE_MODEL_NOT_CONFIGURED'
                        ? { label: stockAvailable === false ? 'Make without photos' : 'Use stock photos', onClick: () => start({ useImageModel: false }) }
                        : error.code === 'AI_NOT_CONFIGURED'
                            ? { label: 'Open AI settings', href: '/settings/ai' }
                            : { label: 'Dismiss', onClick: () => setError(null) }}
                />
            )}

            {loadingExisting && <UniversalSkeleton type="card" count={2} />}

            {running && (
                <div className="space-y-2" aria-live="polite">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-zinc-400">
                        <span>{job!.step}</span>
                        <span className="tabular-nums">{job!.progress.done}/{job!.progress.total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${Math.round((job!.progress.done / Math.max(1, job!.progress.total)) * 100)}%` }} />
                    </div>
                    <UniversalSkeleton type="card" count={kind === 'static' ? 1 : 3} />
                </div>
            )}

            {failed && (
                <ErrorPanel
                    compact
                    title={`The ${label} could not be produced`}
                    message={job?.error?.message || 'The job failed.'}
                    code={job?.error?.code}
                    onRetry={() => start(lastBody.current || {})}
                    secondary={job?.error?.code === 'IMAGE_MODEL_NOT_CONFIGURED' || job?.error?.code === 'IMAGE_PROVIDER_ERROR'
                        ? { label: 'Use stock photos', onClick: () => start({ useImageModel: false }) }
                        : { label: 'Dismiss', onClick: () => setJob(null) }}
                />
            )}

            {job && job.warnings.length > 0 && !running && (
                <ul className="space-y-1">
                    {job.warnings.map((w, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {w}
                        </li>
                    ))}
                </ul>
            )}

            {!running && slides.length > 0 && (
                <>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        {job?.postId ? 'Attached to the post as its media.' : 'Rendered.'}
                        {job?.result?.font?.fallback ? ` Font "${job.result.font.requested}" was unavailable; used ${job.result.font.used}.` : ''}
                    </p>
                    <div className={clsx('grid gap-3', kind === 'static' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3')}>
                        {slides.map((s) => (
                            <figure key={`${s.index}-${s.version}`} className="rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                                <a href={s.url} target="_blank" rel="noreferrer" className="block">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={s.url} alt={`Slide ${s.index + 1}`} className="w-full h-auto" loading="lazy" />
                                </a>
                                <figcaption className="p-2 space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-400">
                                        <span>Slide {s.index + 1}</span>
                                        {s.imageSource && (
                                            <span className="inline-flex items-center gap-1" title={s.imageSource.attribution ? JSON.stringify(s.imageSource.attribution) : undefined}>
                                                <ImageIcon className="w-3 h-3" /> {s.imageSource.kind === 'stock' ? `Stock · ${s.imageSource.provider}` : s.imageSource.provider}
                                            </span>
                                        )}
                                    </div>
                                    {(s.truncated || !s.contrastOk) && (
                                        <p className="text-[10px] text-amber-700 dark:text-amber-400">
                                            {s.truncated ? 'Text was shortened to fit. ' : ''}{!s.contrastOk ? `Low contrast (${s.minContrast.toFixed(1)}:1).` : ''}
                                        </p>
                                    )}
                                    <div className="flex gap-1.5">
                                        {kind === 'carousel' && (
                                            <button
                                                type="button"
                                                onClick={() => { setSlideError(null); setSlideEdit({ index: s.index, instruction: '', regenerateImage: false }); }}
                                                className="flex-1 min-h-[36px] text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                            >
                                                Redo slide
                                            </button>
                                        )}
                                        <a href={s.url} target="_blank" rel="noreferrer" className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300" aria-label={`Open slide ${s.index + 1}`}>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </>
            )}

            {slideEdit && (
                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-zinc-950 space-y-3">
                    <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">Redo slide {slideEdit.index + 1}</p>
                    <textarea
                        rows={2}
                        maxLength={1000}
                        value={slideEdit.instruction}
                        onChange={(e) => setSlideEdit({ ...slideEdit, instruction: e.target.value })}
                        placeholder="What should change? e.g. Shorter headline, mention the free trial"
                        className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100"
                    />
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 min-h-[32px]">
                        <input type="checkbox" checked={slideEdit.regenerateImage} onChange={(e) => setSlideEdit({ ...slideEdit, regenerateImage: e.target.checked })} />
                        New photo
                    </label>
                    {slideError && (
                        <ErrorPanel compact title="Could not redo the slide" message={slideError.message} code={slideError.code} onRetry={regenerateSlide} secondary={{ label: 'Cancel', onClick: () => setSlideEdit(null) }} />
                    )}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setSlideEdit(null)} className="min-h-[44px] px-4 text-xs font-semibold text-slate-600 dark:text-zinc-400">Cancel</button>
                        <button
                            type="button"
                            onClick={regenerateSlide}
                            disabled={slideBusy || (!slideEdit.instruction.trim() && !slideEdit.regenerateImage) || (slideEdit.instruction.trim().length > 0 && slideEdit.instruction.trim().length < 2)}
                            className="min-h-[44px] px-4 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                        >
                            {slideBusy ? 'Working…' : 'Redo slide'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

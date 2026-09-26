'use client';

import { useState } from 'react';
import { Send, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import { socialAutopilotService, apiError, ApiErrorInfo, PublishResult } from '@/lib/services/social-autopilot.service';
import { ErrorPanel } from '../shared/StatePanels';

/**
 * Publishes a calendar piece through its linked post (POST /posts/:id/publish) and shows the per-platform result.
 * Never reports success the API did not return.
 */
export default function PiecePublishPanel({
    pieceId,
    platformLabel,
    projectId,
    calendarId,
    onPublished,
}: {
    pieceId: string;
    platformLabel: string;
    projectId?: string;
    calendarId?: string;
    onPublished?: (result: PublishResult) => void;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<ApiErrorInfo | null>(null);
    const [noPost, setNoPost] = useState(false);
    const [result, setResult] = useState<PublishResult | null>(null);

    const publish = async () => {
        setBusy(true);
        setError(null);
        setNoPost(false);
        try {
            const post = await socialAutopilotService.findPostForPiece(pieceId, projectId ? { projectId } : { calendarId });
            if (!post) {
                setNoPost(true);
                return;
            }
            const res = await socialAutopilotService.publishPost(post.id);
            setResult(res);
            onPublished?.(res);
        } catch (err) {
            setError(apiError(err, 'Publishing failed.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={publish}
                disabled={busy}
                className="inline-flex items-center gap-2 min-h-[44px] px-6 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all duration-300 disabled:opacity-50"
            >
                <Send className="w-3.5 h-3.5" />
                {busy ? 'Publishing…' : `Publish to ${platformLabel} now`}
            </button>

            {noPost && (
                <ErrorPanel
                    compact
                    title="No post is linked to this piece"
                    message="Publishing goes through the piece's post. Export the video from Media Studio (or make the carousel) to create it, then publish."
                    code="POST_NOT_FOUND"
                    onRetry={publish}
                    retryLabel="Check again"
                    secondary={projectId ? { label: 'Open project content', href: `/social-projects/${projectId}?tab=content` } : undefined}
                />
            )}

            {error && (
                <ErrorPanel
                    compact
                    title="Publishing failed"
                    message={error.message}
                    code={error.code}
                    onRetry={publish}
                    secondary={projectId ? { label: 'Check connected accounts', href: `/social-projects/${projectId}?tab=publishing` } : { label: 'Dismiss', onClick: () => setError(null) }}
                />
            )}

            {result && (
                <div role="status" aria-live="polite" className={`p-4 rounded-xl border space-y-2 ${result.success ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/5' : 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5'}`}>
                    <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                        {result.message || result.status}
                        {result.simulated ? ' (sandbox simulation, nothing was posted)' : ''}
                    </p>
                    <ul className="space-y-1.5">
                        {(result.variants || []).map((v) => {
                            const ok = v.publishStatus === 'published';
                            const failed = v.publishStatus === 'failed';
                            return (
                                <li key={v.id} className="flex items-start gap-2 text-xs">
                                    {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                        : failed ? <XCircle className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
                                            : <Clock className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />}
                                    <div className="min-w-0">
                                        <span className="font-semibold capitalize text-slate-900 dark:text-zinc-100">{v.platform}</span>
                                        <span className="text-slate-500 dark:text-zinc-400"> · {v.publishStatus}</span>
                                        {v.externalUrl && (
                                            <a href={v.externalUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 hover:underline">
                                                View <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                        {v.error && <p className="text-rose-700 dark:text-rose-400 break-words">{v.errorCode ? `${v.errorCode}: ` : ''}{v.error}{v.retryable ? ' (retryable)' : ''}</p>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    {result.retryScheduledFor && (
                        <p className="text-[11px] text-slate-600 dark:text-zinc-400">Automatic retry scheduled for {new Date(result.retryScheduledFor).toLocaleString()}.</p>
                    )}
                </div>
            )}
        </div>
    );
}

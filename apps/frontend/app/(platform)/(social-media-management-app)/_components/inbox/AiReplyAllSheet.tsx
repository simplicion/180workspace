'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Sparkles, CheckCircle2, XCircle, Clock, MessageSquare } from 'lucide-react';
import { UniversalSkeleton } from '@workspace/ui';
import { Drawer } from '@/components/ui/Drawer';
import {
    socialEngagementService,
    AiReplySuggestion,
    AiReplyDispatchResult,
} from '@/lib/services/social-engagement.service';
import { apiError, ApiErrorInfo } from '@/lib/services/social-autopilot.service';
import { ErrorPanel, EmptyPanel } from '../shared/StatePanels';

/**
 * AI Reply All: draft replies for unanswered conversations -> review / edit / deselect -> dispatch, then show the
 * per-conversation outcome (sent / failed / rate limited). Rate-limited items stay selectable for a re-send.
 */
export default function AiReplyAllSheet({ open, onClose, projectId, onDispatched }: {
    open: boolean;
    onClose: () => void;
    projectId?: string;
    onDispatched?: () => void;
}) {
    const [items, setItems] = useState<AiReplySuggestion[] | null>(null);
    const [error, setError] = useState<ApiErrorInfo | null>(null);
    const [dispatching, setDispatching] = useState(false);
    const [dispatchError, setDispatchError] = useState<ApiErrorInfo | null>(null);
    const [result, setResult] = useState<AiReplyDispatchResult | null>(null);

    const load = async () => {
        setItems(null);
        setError(null);
        setResult(null);
        try {
            setItems(await socialEngagementService.getAiReplyAllSuggestions({ projectId, limit: 20 }));
        } catch (err) {
            setError(apiError(err, 'Could not draft replies.'));
        }
    };

    useEffect(() => { if (open) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, projectId]);

    const selected = (items || []).filter((i) => i.selected && i.canSend !== false && i.suggestedReply.trim());
    const statusOf = (id: string) => result?.results.find((r) => r.conversationId === id);

    const dispatch = async () => {
        if (!selected.length) return;
        setDispatching(true);
        setDispatchError(null);
        try {
            const res = await socialEngagementService.dispatchAiReplyAll(selected.map((i) => ({ conversationId: i.conversationId, replyText: i.suggestedReply.trim() })));
            setResult(res);
            // Keep only rate-limited items selected so a second press re-sends just those.
            setItems((prev) => (prev || []).map((i) => ({ ...i, selected: res.results.some((r) => r.conversationId === i.conversationId && r.status === 'rate_limited') })));
            onDispatched?.();
        } catch (err) {
            setDispatchError(apiError(err, 'Could not send the replies.'));
        } finally {
            setDispatching(false);
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title="AI Reply All"
            description="Review and edit each draft before it is sent. Nothing is sent until you press Send."
            icon={<Sparkles className="w-5 h-5 text-amber-500" />}
            position="right"
            size="max-w-2xl"
            footer={
                <div className="flex items-center justify-between w-full gap-3">
                    <span className="text-xs text-slate-500 dark:text-zinc-400">
                        {result
                            ? `${result.dispatched} sent · ${result.failed} failed · ${result.rateLimited} rate limited`
                            : `${selected.length} of ${items?.length || 0} selected`}
                    </span>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="min-h-[44px] px-4 text-xs font-semibold text-slate-600 dark:text-zinc-400">Close</button>
                        <button
                            type="button"
                            onClick={dispatch}
                            disabled={dispatching || !selected.length}
                            className="min-h-[44px] px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all duration-300"
                        >
                            {dispatching ? 'Sending…' : result?.rateLimited ? `Re-send ${selected.length}` : `Send ${selected.length}`}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {error ? (
                    <ErrorPanel
                        title="Could not draft replies"
                        message={error.message}
                        code={error.code}
                        onRetry={load}
                        secondary={error.code === 'AI_NOT_CONFIGURED' ? { label: 'Open AI settings', href: '/settings/ai' } : { label: 'Close', onClick: onClose }}
                    />
                ) : items === null ? (
                    <UniversalSkeleton type="chat" />
                ) : items.length === 0 ? (
                    <EmptyPanel
                        icon={<MessageSquare className="w-8 h-8" />}
                        title="Nothing waiting for a reply"
                        message="Every conversation's last message is already answered."
                        action={{ label: 'Check again', onClick: load }}
                    />
                ) : (
                    items.map((item, idx) => {
                        const st = statusOf(item.conversationId);
                        const blocked = item.canSend === false;
                        return (
                            <div key={item.conversationId} className={clsx('p-4 rounded-2xl border space-y-3',
                                blocked ? 'border-slate-200 dark:border-zinc-800 opacity-70' : item.selected ? 'border-indigo-300 dark:border-indigo-500/40' : 'border-slate-200 dark:border-zinc-800',
                                'bg-white dark:bg-zinc-900')}>
                                <div className="flex items-start justify-between gap-3">
                                    <label className="flex items-start gap-2.5 min-h-[32px] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-1"
                                            checked={item.selected && !blocked}
                                            disabled={blocked}
                                            onChange={(e) => setItems((prev) => prev!.map((x, j) => (j === idx ? { ...x, selected: e.target.checked } : x)))}
                                        />
                                        <span>
                                            <span className="block text-xs font-bold text-slate-900 dark:text-zinc-100">@{item.participantHandle} <span className="font-normal capitalize text-slate-500 dark:text-zinc-400">· {item.platform}</span></span>
                                            <span className="block text-xs text-slate-600 dark:text-zinc-400 mt-0.5">&ldquo;{item.lastCustomerMessage}&rdquo;</span>
                                        </span>
                                    </label>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        {item.intent && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 capitalize">{item.intent}</span>}
                                        {typeof item.confidence === 'number' && <span className="text-[10px] text-slate-400">{Math.round(item.confidence * 100)}% confident</span>}
                                    </div>
                                </div>
                                <textarea
                                    rows={3}
                                    aria-label={`Reply to ${item.participantHandle}`}
                                    value={item.suggestedReply}
                                    disabled={blocked}
                                    onChange={(e) => setItems((prev) => prev!.map((x, j) => (j === idx ? { ...x, suggestedReply: e.target.value } : x)))}
                                    className="w-full p-3 text-sm rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100"
                                />
                                {blocked && <p className="text-[11px] text-amber-700 dark:text-amber-400">Cannot send now: {item.blockedReason || 'not allowed by the platform'}</p>}
                                {st && (
                                    <p className={clsx('flex items-center gap-1.5 text-[11px] font-semibold',
                                        st.status === 'sent' ? 'text-emerald-700 dark:text-emerald-400' : st.status === 'failed' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400')}>
                                        {st.status === 'sent' ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.status === 'failed' ? <XCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                        {st.status === 'sent' ? 'Sent'
                                            : st.status === 'failed' ? `Failed${st.code ? ` (${st.code})` : ''}: ${st.error || ''}`
                                                : `Rate limited, retry in ${Math.ceil((st.retryAfterMs || 0) / 1000)}s`}
                                    </p>
                                )}
                            </div>
                        );
                    })
                )}
                {dispatchError && (
                    <ErrorPanel compact title="Could not send the replies" message={dispatchError.message} code={dispatchError.code} onRetry={dispatch} secondary={{ label: 'Redraft replies', onClick: load }} />
                )}
            </div>
        </Drawer>
    );
}

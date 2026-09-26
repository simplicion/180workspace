'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { MessageSquare, Search, Sparkles, Send, UserCheck, Bot, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { UniversalSkeleton } from '@workspace/ui';
import api from '@/lib/api';
import { socialEngagementService } from '@/lib/services/social-engagement.service';
import { apiError, ApiErrorInfo } from '@/lib/services/social-autopilot.service';
import { ErrorPanel, EmptyPanel } from '../shared/StatePanels';
import AiReplyAllSheet from './AiReplyAllSheet';

interface Conversation {
    id: string;
    platform: string;
    participantName: string;
    participantHandle: string;
    participantAvatar?: string | null;
    lastMessageSnippet?: string | null;
    lastMessageAt: string;
    isRead: boolean;
    convertedLeadId?: string | null;
    aiAgentActive?: boolean;
    isHumanTakeover?: boolean;
    messages?: { id: string; senderType: string; content: string; createdAt: string }[];
}

const PLATFORMS = ['all', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'];

/** Unified social inbox (all projects, or one project when `projectId` is set). Real data only. */
export default function InboxWorkspace({ projectId }: { projectId?: string }) {
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[] | null>(null);
    const [listError, setListError] = useState<ApiErrorInfo | null>(null);
    const [platform, setPlatform] = useState('all');
    const [search, setSearch] = useState('');
    const [active, setActive] = useState<Conversation | null>(null);
    const [threadError, setThreadError] = useState<ApiErrorInfo | null>(null);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<ApiErrorInfo | null>(null);
    const [suggestions, setSuggestions] = useState<{ tone: string; text: string }[]>([]);
    const [suggesting, setSuggesting] = useState(false);
    const [suggestError, setSuggestError] = useState<ApiErrorInfo | null>(null);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const loadList = useCallback(async () => {
        setListError(null);
        setConversations(null);
        try {
            const { data } = await api.get('/api/social-media/inbox/conversations', {
                params: { projectId, platform: platform !== 'all' ? platform : undefined },
            });
            setConversations(data.conversations || []);
        } catch (err) {
            setListError(apiError(err, 'Could not load conversations.'));
        }
    }, [projectId, platform]);

    useEffect(() => { loadList(); }, [loadList]);

    const openConversation = async (id: string) => {
        setThreadError(null);
        setSuggestions([]);
        setSuggestError(null);
        setSendError(null);
        try {
            const { data } = await api.get(`/api/social-media/inbox/conversations/${id}`);
            setActive(data.conversation);
            setConversations((prev) => prev?.map((c) => (c.id === id ? { ...c, isRead: true } : c)) || prev);
        } catch (err) {
            setThreadError(apiError(err, 'Could not open the conversation.'));
        }
    };

    const patchActive = (patch: Partial<Conversation>) => {
        setActive((prev) => (prev ? { ...prev, ...patch } : prev));
        setConversations((prev) => prev?.map((c) => (c.id === active?.id ? { ...c, ...patch } : c)) || prev);
    };

    const send = async () => {
        if (!active || !reply.trim()) return;
        setSending(true);
        setSendError(null);
        try {
            const { data } = await api.post(`/api/social-media/inbox/conversations/${active.id}/messages`, { content: reply.trim() });
            patchActive({ messages: [...(active.messages || []), data.message].filter(Boolean), lastMessageSnippet: reply.trim() });
            setReply('');
        } catch (err) {
            setSendError(apiError(err, 'The reply was not sent.'));
        } finally {
            setSending(false);
        }
    };

    const suggest = async () => {
        if (!active) return;
        setSuggesting(true);
        setSuggestError(null);
        try {
            const { data } = await api.get(`/api/social-media/inbox/conversations/${active.id}/ai-suggestions`);
            setSuggestions(data.suggestions || []);
        } catch (err) {
            setSuggestError(apiError(err, 'Could not draft suggestions.'));
        } finally {
            setSuggesting(false);
        }
    };

    const toggleAgent = async () => {
        if (!active) return;
        const next = !(active.aiAgentActive && !active.isHumanTakeover);
        setBusyAction('agent');
        try {
            const res = await socialEngagementService.toggleConversationAgent(active.id, next);
            patchActive({ aiAgentActive: !!res.aiAgentActive, isHumanTakeover: !!res.isHumanTakeover });
            toast.success(`AI agent ${res.aiAgentActive ? 'on' : 'off'} for this conversation`);
        } catch (err) {
            toast.error(apiError(err, 'Could not change the AI agent.').message);
        } finally {
            setBusyAction(null);
        }
    };

    const takeover = async () => {
        if (!active) return;
        setBusyAction('takeover');
        try {
            await socialEngagementService.takeoverConversation(active.id);
            patchActive({ isHumanTakeover: true });
            toast.success('You have taken over; the AI agent is paused here.');
        } catch (err) {
            toast.error(apiError(err, 'Could not take over.').message);
        } finally {
            setBusyAction(null);
        }
    };

    const convert = async () => {
        if (!active) return;
        setBusyAction('lead');
        try {
            const res = await socialEngagementService.convertToLead(active.id);
            if (res?.lead?.id) patchActive({ convertedLeadId: res.lead.id });
            toast.success(res?.message || 'Converted to a CRM lead');
        } catch (err) {
            toast.error(apiError(err, 'Could not create the lead.').message);
        } finally {
            setBusyAction(null);
        }
    };

    const q = search.trim().toLowerCase();
    const filtered = (conversations || []).filter((c) => !q
        || c.participantName?.toLowerCase().includes(q)
        || c.participantHandle?.toLowerCase().includes(q)
        || (c.lastMessageSnippet || '').toLowerCase().includes(q));
    const agentOn = !!active?.aiAgentActive && !active?.isHumanTakeover;

    return (
        <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">AI Reply All</h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Draft replies for every unanswered conversation, review them, then send.</p>
                </div>
                <button type="button" onClick={() => setSheetOpen(true)} className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-300">
                    <Sparkles className="w-4 h-4" /> Draft replies
                </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
                {PLATFORMS.map((p) => (
                    <button key={p} type="button" onClick={() => setPlatform(p)} aria-pressed={platform === p}
                        className={clsx('min-h-[44px] px-4 rounded-xl text-xs font-semibold capitalize border whitespace-nowrap transition-all duration-300',
                            platform === p ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300')}>
                        {p === 'all' ? 'All channels' : p}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[520px]">
                {/* List */}
                <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-slate-100 dark:border-zinc-800">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" aria-label="Search conversations"
                                className="w-full min-h-[44px] pl-9 pr-3 text-xs rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {listError ? (
                            <ErrorPanel compact title="Could not load conversations" message={listError.message} code={listError.code} onRetry={loadList}
                                secondary={{ label: 'Check connected accounts', onClick: () => router.push('/social-media-assets') }} />
                        ) : conversations === null ? (
                            <UniversalSkeleton type="activity" count={5} />
                        ) : filtered.length === 0 ? (
                            <EmptyPanel icon={<MessageSquare className="w-8 h-8" />}
                                title={conversations.length ? 'No matches' : 'No conversations yet'}
                                message={conversations.length ? 'Try another search or channel.' : 'Comments and DMs appear here once an account is connected and webhooks are delivering.'}
                                action={conversations.length ? { label: 'Clear search', onClick: () => { setSearch(''); setPlatform('all'); } } : { label: 'Connect an account', onClick: () => router.push('/social-media-assets') }} />
                        ) : filtered.map((c) => (
                            <button key={c.id} type="button" onClick={() => openConversation(c.id)}
                                className={clsx('w-full text-left p-3 rounded-xl flex gap-3 transition-all duration-300 min-h-[44px]',
                                    active?.id === c.id ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/60')}>
                                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-zinc-300 shrink-0 overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {c.participantAvatar ? <img src={c.participantAvatar} alt="" className="w-full h-full object-cover" /> : (c.participantName || '?').slice(0, 1)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={clsx('text-xs truncate text-slate-900 dark:text-zinc-100', !c.isRead && 'font-bold')}>{c.participantName}</span>
                                        <span className="text-[10px] capitalize text-slate-400 shrink-0">{c.platform}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">{c.lastMessageSnippet}</p>
                                    <div className="flex gap-1 mt-1">
                                        {c.aiAgentActive && !c.isHumanTakeover && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300">AI agent</span>}
                                        {c.isHumanTakeover && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">Human</span>}
                                        {c.convertedLeadId && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Lead</span>}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Thread */}
                <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden">
                    {threadError ? (
                        <div className="p-4"><ErrorPanel title="Could not open the conversation" message={threadError.message} code={threadError.code}
                            onRetry={() => active && openConversation(active.id)} secondary={{ label: 'Reload list', onClick: loadList }} /></div>
                    ) : !active ? (
                        <div className="flex-1 flex items-center justify-center p-6 text-xs text-slate-500 dark:text-zinc-400">Select a conversation to read and reply.</div>
                    ) : (
                        <>
                            <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">{active.participantName} <span className="font-normal text-indigo-600 dark:text-indigo-400">@{active.participantHandle}</span></p>
                                    <p className="text-[11px] capitalize text-slate-500 dark:text-zinc-400">{active.platform}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={toggleAgent} disabled={busyAction === 'agent'} aria-pressed={agentOn}
                                        className={clsx('inline-flex items-center gap-1.5 min-h-[44px] px-3 text-xs font-semibold rounded-xl border transition-all duration-300',
                                            agentOn ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/40 dark:bg-purple-500/10 dark:text-purple-300' : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300')}>
                                        <Bot className="w-3.5 h-3.5" /> AI agent: {agentOn ? 'On' : 'Off'}
                                    </button>
                                    {agentOn && (
                                        <button type="button" onClick={takeover} disabled={busyAction === 'takeover'}
                                            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300">
                                            <ShieldCheck className="w-3.5 h-3.5" /> Take over
                                        </button>
                                    )}
                                    {active.convertedLeadId ? (
                                        <span className="inline-flex items-center gap-1.5 min-h-[44px] px-3 text-xs font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                            <UserCheck className="w-3.5 h-3.5" /> CRM lead
                                        </span>
                                    ) : (
                                        <button type="button" onClick={convert} disabled={busyAction === 'lead'}
                                            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50">
                                            <UserCheck className="w-3.5 h-3.5" /> {busyAction === 'lead' ? 'Converting…' : 'Convert to lead'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60 dark:bg-zinc-950/40">
                                {(active.messages || []).length === 0 ? (
                                    <p className="text-xs text-center text-slate-500 dark:text-zinc-400">No messages stored for this conversation.</p>
                                ) : active.messages!.map((m) => {
                                    const mine = m.senderType !== 'participant';
                                    return (
                                        <div key={m.id} className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
                                            <div className={clsx('max-w-[80%] px-3.5 py-2 rounded-2xl text-sm',
                                                mine ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-700')}>
                                                {m.senderType === 'ai_bot' && <span className="block text-[10px] font-bold opacity-80">AI agent</span>}
                                                <p className="whitespace-pre-wrap">{m.content}</p>
                                                <span className="block text-[10px] opacity-60 mt-0.5">{new Date(m.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-3 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                                <div className="flex items-center gap-2 overflow-x-auto">
                                    <button type="button" onClick={suggest} disabled={suggesting}
                                        className="inline-flex items-center gap-1.5 min-h-[36px] px-3 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 shrink-0 disabled:opacity-50">
                                        <Sparkles className="w-3.5 h-3.5" /> {suggesting ? 'Drafting…' : 'Suggest replies'}
                                    </button>
                                    {suggestions.map((s, i) => (
                                        <button key={i} type="button" onClick={() => setReply(s.text)} title={s.text}
                                            className="min-h-[36px] px-3 text-xs rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 max-w-[220px] truncate shrink-0">
                                            {s.tone || `Option ${i + 1}`}: {s.text}
                                        </button>
                                    ))}
                                </div>
                                {suggestError && <ErrorPanel compact title="No suggestions" message={suggestError.message} code={suggestError.code} onRetry={suggest}
                                    secondary={suggestError.code === 'AI_NOT_CONFIGURED' ? { label: 'Open AI settings', href: '/settings/ai' } : { label: 'Write it myself', onClick: () => setSuggestError(null) }} />}
                                {sendError && <ErrorPanel compact title="Reply not sent" message={sendError.message} code={sendError.code} onRetry={send}
                                    secondary={{ label: 'Edit reply', onClick: () => setSendError(null) }} />}
                                <div className="flex gap-2">
                                    <textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to @${active.participantHandle}`} aria-label="Reply"
                                        className="flex-1 p-3 text-sm rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100" />
                                    <button type="button" onClick={send} disabled={sending || !reply.trim()} aria-label="Send reply"
                                        className="min-w-[44px] min-h-[44px] px-4 inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <AiReplyAllSheet open={sheetOpen} onClose={() => setSheetOpen(false)} projectId={projectId} onDispatched={loadList} />
        </div>
    );
}

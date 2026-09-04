'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
    LifeBuoy, Bug, AlertTriangle, CheckCircle2, Clock, 
    Search, RefreshCw, Filter, MessageSquare, Monitor, 
    Building2, Image as ImageIcon, ChevronRight, Sparkles, 
    Tag, ExternalLink, Flame, ShieldAlert, ArrowRight, User
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../lib/superadmin-api';
import { Skeleton, LogoLoader } from '@workspace/ui';
import { clsx } from 'clsx';

const STATUS_OPTS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'waiting_on_customer', label: 'Waiting on Customer' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTS = [
    { value: 'all', label: 'All Priorities' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
];

const SOURCE_OPTS = [
    { value: 'all', label: 'All Sources' },
    { value: 'quick_support', label: '⚡ Quick Bug Reports' },
    { value: 'ticket', label: '🎫 Standard Tickets' },
];

const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'open':
            return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'in_progress':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'waiting_on_customer':
            return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'resolved':
            return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'closed':
            return 'bg-slate-100 text-slate-700 border-slate-200';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
        case 'critical':
        case 'urgent':
            return 'bg-rose-50 text-rose-700 border-rose-200 font-black';
        case 'high':
            return 'bg-orange-50 text-orange-700 border-orange-200 font-bold';
        case 'medium':
            return 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
        default:
            return 'bg-slate-50 text-slate-600 border-slate-200 font-normal';
    }
};

function formatTimeAgo(dateString: string): string {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
}

export default function UnifiedTicketsPage() {
    const router = useRouter();
    const [tickets, setTickets] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');

    const loadTickets = async () => {
        setLoading(true);
        try {
            const { data } = await saApi.get('/tickets', {
                params: {
                    status: statusFilter === 'all' ? undefined : statusFilter,
                    priority: priorityFilter === 'all' ? undefined : priorityFilter,
                    category: sourceFilter === 'quick_support' ? 'quick_support' : undefined,
                    search: search || undefined,
                    limit: 100
                }
            });

            let list = data?.tickets || [];
            if (sourceFilter === 'ticket') {
                list = list.filter((t: any) => t.category !== 'quick_support' && !t.subject?.includes('[Quick Report]'));
            } else if (sourceFilter === 'quick_support') {
                list = list.filter((t: any) => t.category === 'quick_support' || t.subject?.includes('[Quick Report]') || (Array.isArray(t.messages) && t.messages.some((m: any) => m.source === 'quick_support')));
            }

            setTickets(list);
            setTotal(data?.total || list.length);
        } catch (err: any) {
            console.error('Failed to load tickets:', err);
            toast.error('Failed to fetch support tickets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadTickets();
        }, 200);
        return () => clearTimeout(timer);
    }, [search, sourceFilter, statusFilter, priorityFilter]);

    // Metric counters
    const openCount = useMemo(() => tickets.filter(t => t.status === 'open').length, [tickets]);
    const inProgressCount = useMemo(() => tickets.filter(t => t.status === 'in_progress').length, [tickets]);
    const resolvedCount = useMemo(() => tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length, [tickets]);
    const quickReportsCount = useMemo(() => tickets.filter(t => t.category === 'quick_support' || t.subject?.includes('[Quick Report]')).length, [tickets]);

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-300">
            <Toaster position="top-center" />

            {/* ── Page Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 text-white shadow-md shadow-indigo-500/20">
                            <LifeBuoy className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Support & Issue Desk
                        </h1>
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live Command Feed
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Unified triage for customer support tickets, quick bug reports, screenshot attachments, and real-time live assistance.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={loadTickets}
                        disabled={loading}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 text-xs font-bold transition-all flex items-center gap-2 shadow-2xs active:scale-95"
                    >
                        <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin text-indigo-600")} />
                        <span>Sync Stream</span>
                    </button>
                </div>
            </div>

            {/* ── KPI Overview Cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5 space-y-1 border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Active Desk</span>
                        <LifeBuoy className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900">{total || tickets.length}</div>
                    <p className="text-[11px] text-slate-400 font-medium">Tickets & bug reports captured</p>
                </div>

                <div className="glass-card p-5 space-y-1 bg-amber-500/5 border-amber-200/60 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Needs Attention</span>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-700">{openCount}</div>
                    <p className="text-[11px] text-amber-600/80 font-medium">Open / Unresolved threads</p>
                </div>

                <div className="glass-card p-5 space-y-1 bg-sky-500/5 border-sky-200/60 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-700">In Progress</span>
                        <Clock className="w-4 h-4 text-sky-600" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-sky-700">{inProgressCount}</div>
                    <p className="text-[11px] text-sky-600/80 font-medium">Under active investigation</p>
                </div>

                <div className="glass-card p-5 space-y-1 bg-emerald-500/5 border-emerald-200/60 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Resolved & Closed</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-700">{resolvedCount}</div>
                    <p className="text-[11px] text-emerald-600/80 font-medium">Patched or resolved items</p>
                </div>
            </div>

            {/* ── Control & Filter Bar ──────────────────────────────────────── */}
            <div className="glass-card p-4 space-y-3 border border-slate-200/80 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by user, email, company, route, error text, or ID..."
                            className="w-full h-10 pl-10 pr-4 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                        />
                    </div>

                    {/* Filter Selectors Strip */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
                        {/* Source Filter */}
                        <select
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
                            aria-label="Filter by source type"
                        >
                            {SOURCE_OPTS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
                            aria-label="Filter by status"
                        >
                            {STATUS_OPTS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>

                        {/* Priority Filter */}
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all cursor-pointer"
                            aria-label="Filter by priority"
                        >
                            {PRIORITY_OPTS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Feed List ─────────────────────────────────────────────────── */}
            <div className="space-y-3.5">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                                <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-5 w-64 rounded" />
                                    <Skeleton className="h-4 w-40 rounded" />
                                </div>
                            </div>
                            <Skeleton className="h-10 w-28 rounded-lg" />
                        </div>
                    ))
                ) : tickets.length === 0 ? (
                    <div className="glass-card p-16 text-center text-slate-400 space-y-3 border border-slate-200/80">
                        <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto" />
                        <h3 className="text-base font-bold text-slate-900">No Support Reports Found</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                            No tickets match your filter criteria. When customers submit tickets or quick bug reports with screenshots, they will appear here in real-time.
                        </p>
                    </div>
                ) : (
                    tickets.map(ticket => {
                        const rawMessages = Array.isArray(ticket.messages) ? ticket.messages : [];
                        const initialMsg = rawMessages.find((m: any) => m.source === 'quick_support' || (m.attachments && m.attachments.length > 0)) || rawMessages[0] || {};
                        const isQuickSupport = ticket.category === 'quick_support' || initialMsg.source === 'quick_support' || ticket.subject?.includes('[Quick Report]');
                        const routeUrl = initialMsg.routeUrl || ticket.routeUrl;
                        const attachments: any[] = initialMsg.attachments || [];
                        const imageAttachments = attachments.filter((a: any) => {
                            const url = a.dataUrl || a.url || (typeof a === 'string' ? a : '');
                            return typeof url === 'string' && (url.startsWith('data:image') || url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i));
                        });

                        return (
                            <Link
                                key={ticket.id}
                                href={`/superadmin/tickets/${ticket.id}`}
                                className="glass-card p-5 sm:p-6 border border-slate-200/90 hover:border-indigo-400 hover:shadow-md transition-all group flex flex-col gap-3.5 block"
                            >
                                {/* Top Row: Origin, User Info, Badges */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                                            isQuickSupport 
                                                ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                                : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                        }`}>
                                            {isQuickSupport ? (
                                                <Bug className="w-5 h-5" />
                                            ) : (
                                                <MessageSquare className="w-5 h-5" />
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                                    {ticket.userName || 'Tenant User'}
                                                </span>
                                                <span className="text-xs text-slate-400 truncate">({ticket.userEmail || '—'})</span>
                                                <span className="badge-indigo text-[10px] font-bold">
                                                    <Building2 className="w-3 h-3 mr-1 inline" />
                                                    {ticket.companyName || 'Tenant Organization'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-medium flex-wrap">
                                                <span>{formatTimeAgo(ticket.createdAt)}</span>
                                                <span>•</span>
                                                <span className="font-mono">{new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                <span>•</span>
                                                <span className="font-mono text-slate-500 font-semibold">#{ticket.id.slice(-6).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Badges Strip */}
                                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                        {isQuickSupport ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                                <Bug className="w-3 h-3 text-rose-500" />
                                                Quick Bug Report
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                <LifeBuoy className="w-3 h-3 text-indigo-500" />
                                                Support Ticket
                                            </span>
                                        )}

                                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border ${getPriorityBadge(ticket.priority)}`}>
                                            {ticket.priority || 'Medium'}
                                        </span>

                                        <span className={`text-[11px] font-bold uppercase px-3 py-1 rounded-full border ${getStatusBadge(ticket.status)}`}>
                                            {ticket.status?.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </div>

                                {/* Context Badges (Route, IP, Category) */}
                                <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                                    {routeUrl && (
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
                                            <Monitor className="w-3 h-3 text-indigo-500 shrink-0" />
                                            <span className="text-slate-400 font-sans text-[10px]">Route:</span>
                                            <span className="font-bold text-indigo-600">{routeUrl}</span>
                                        </div>
                                    )}

                                    {ticket.category && ticket.category !== 'quick_support' && (
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 capitalize font-sans text-[11px]">
                                            <Tag className="w-3 h-3 text-slate-400" />
                                            <span>{ticket.category.replace(/_/g, ' ')}</span>
                                        </div>
                                    )}

                                    {imageAttachments.length > 0 && (
                                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-sans text-[11px] font-bold">
                                            <ImageIcon className="w-3 h-3" />
                                            <span>{imageAttachments.length} {imageAttachments.length === 1 ? 'Screenshot' : 'Screenshots'}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Subject & Message Excerpt */}
                                <div className="space-y-1">
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                        {ticket.subject}
                                    </h3>
                                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                                        {ticket.message || 'No additional issue description provided.'}
                                    </p>
                                </div>

                                {/* Attached Image Thumbnails Strip */}
                                {imageAttachments.length > 0 && (
                                    <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1">
                                        {imageAttachments.slice(0, 4).map((att: any, idx: number) => {
                                            const url = att.dataUrl || att.url || att;
                                            return (
                                                <div 
                                                    key={idx}
                                                    className="w-16 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-2xs"
                                                >
                                                    <img 
                                                        src={url} 
                                                        alt="Preview" 
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            );
                                        })}
                                        {imageAttachments.length > 4 && (
                                            <div className="w-16 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                                                +{imageAttachments.length - 4} more
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Bottom Row: Replies and Direct CTA */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                                        <span className="flex items-center gap-1 text-indigo-600 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            <span>{rawMessages.length} {rawMessages.length === 1 ? 'Message' : 'Messages'}</span>
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                                        <span>Open Live Chat Desk</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Send, MessageSquare, LifeBuoy, CheckCircle2, Shield,
    Clock, RefreshCw, User, Check, AlertCircle, Sparkles, Wifi,
    Bug, Monitor, Tag, Image as ImageIcon, Eye, X, ChevronDown, 
    ChevronUp, Building2, MapPin, Globe, ExternalLink
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../../lib/superadmin-api';
import { getSocket } from '../../../../lib/socket';
import { useSuperAdmin } from '../../../../lib/superadmin-context';
import { Skeleton, LogoLoader } from '@workspace/ui';
import { clsx } from 'clsx';

const STATUS_OPTS = [
    { value: 'open', label: 'Open', color: 'border-amber-200 bg-amber-50 text-amber-800' },
    { value: 'in_progress', label: 'In Progress', color: 'border-blue-200 bg-blue-50 text-blue-800' },
    { value: 'waiting_on_customer', label: 'Waiting on Customer', color: 'border-purple-200 bg-purple-50 text-purple-800' },
    { value: 'resolved', label: 'Resolved', color: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
    { value: 'closed', label: 'Closed', color: 'border-slate-200 bg-slate-100 text-slate-700' }
];

export default function UnifiedTicketDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { superAdmin } = useSuperAdmin();
    const [ticket, setTicket] = useState<any>(null);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

    const typingTimeoutRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior });
        }
    };

    const load = async (silent: boolean = false) => {
        if (!silent) setRefreshing(true);
        try {
            const { data } = await saApi.get(`/tickets/${id}`);
            setTicket(data?.ticket);
        } catch {
            if (!silent) {
                toast.error('Failed to load ticket details');
                router.push('/superadmin/tickets');
            }
        } finally {
            if (!silent) setRefreshing(false);
        }
    };

    useEffect(() => { 
        if (!id) return;
        load();

        const socket = getSocket();
        if (socket) {
            socket.emit('ticket:join', { ticketId: id });

            const handleNewMessage = (payload: any) => {
                if (payload.ticketId === id) {
                    if (payload.ticket) {
                        setTicket(payload.ticket);
                    } else if (payload.message) {
                        setTicket((prev: any) => {
                            if (!prev) return prev;
                            const msgs = Array.isArray(prev.messages) ? prev.messages : [];
                            const isDup = msgs.some((m: any) => 
                                m.text === payload.message.text && 
                                (m._optimistic || Math.abs(new Date(m.createdAt || m.timestamp || 0).getTime() - new Date(payload.message.createdAt || payload.message.timestamp || 0).getTime()) < 4000)
                            );
                            if (isDup) {
                                return {
                                    ...prev,
                                    status: payload.status || prev.status,
                                    messages: msgs.map((m: any) => (m.text === payload.message.text && m._optimistic ? payload.message : m)),
                                };
                            }
                            return {
                                ...prev,
                                status: payload.status || prev.status,
                                messages: [...msgs, payload.message],
                            };
                        });
                    }
                    setTimeout(() => scrollToBottom('smooth'), 50);
                }
            };

            const handleTyping = (payload: any) => {
                if (payload.ticketId === id && payload.senderRole !== 'superadmin' && payload.senderRole !== 'admin') {
                    setTypingUser(payload.senderName || 'Customer');
                }
            };

            const handleStopTyping = (payload: any) => {
                if (payload.ticketId === id) {
                    setTypingUser(null);
                }
            };

            socket.on('ticket:message', handleNewMessage);
            socket.on('ticket:typing', handleTyping);
            socket.on('ticket:stop_typing', handleStopTyping);

            return () => {
                socket.emit('ticket:leave', { ticketId: id });
                socket.off('ticket:message', handleNewMessage);
                socket.off('ticket:typing', handleTyping);
                socket.off('ticket:stop_typing', handleStopTyping);
            };
        }

        const interval = setInterval(() => {
            load(true);
        }, 5000);
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        if (ticket) {
            scrollToBottom('auto');
        }
    }, [ticket?.messages?.length]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setReply(e.target.value);
        if (!id) return;

        const socket = getSocket();
        if (socket) {
            socket.emit('ticket:typing', {
                ticketId: id,
                senderName: superAdmin?.name || 'Administrator',
                senderRole: 'superadmin'
            });

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('ticket:stop_typing', { ticketId: id });
            }, 2000);
        }
    };

    const sendReply = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!reply.trim() || sending) return;
        
        const text = reply.trim();
        const nowIso = new Date().toISOString();

        // 1. Instant Optimistic Admin Bubble
        const optimisticMsg = {
            senderName: superAdmin?.name || 'Platform Administrator',
            senderRole: 'superadmin',
            text: text,
            createdAt: nowIso,
            timestamp: nowIso,
            _optimistic: true,
        };

        setReply('');
        setTicket((prev: any) => {
            if (!prev) return prev;
            return {
                ...prev,
                status: 'in_progress',
                messages: [...(prev.messages || []), optimisticMsg],
            };
        });
        setTimeout(() => scrollToBottom('smooth'), 10);

        // 2. Direct real-time WebSocket broadcast to tenant
        const socket = getSocket();
        if (socket) {
            socket.emit('ticket:stop_typing', { ticketId: id });
            socket.emit('ticket:message', {
                ticketId: id,
                message: optimisticMsg,
                status: 'in_progress'
            });
        }

        // 3. Persist to database
        setSending(true);
        try { 
            const { data } = await saApi.post(`/tickets/${id}/reply`, { text }); 
            if (data?.ticket) {
                setTicket(data.ticket);
            }
            toast.success('Admin reply sent');
        } catch (err: any) { 
            console.error('Send reply error:', err);
            toast.error(err.response?.data?.error || 'Failed to send reply'); 
            setReply(text); // Restore on error
            setTicket((prev: any) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    messages: (prev.messages || []).filter((m: any) => !m._optimistic || m.createdAt !== nowIso),
                };
            });
        } finally {
            setSending(false);
        }
    };

    const changeStatus = async (status: string) => {
        setUpdatingStatus(true);
        try {
            await saApi.put(`/tickets/${id}/status`, { status });
            await load(true);
            const socket = getSocket();
            if (socket) {
                socket.emit('ticket:message', { ticketId: id, status });
            }
            toast.success(`Status updated to: ${status.replace(/_/g, ' ')}`);
        } catch {
            toast.error('Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    if (!ticket) {
        return (
            <div className="max-w-6xl mx-auto space-y-6 pb-12">
                <Skeleton className="h-6 w-32 rounded-lg" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-40 w-full rounded-3xl" />
                        <Skeleton className="h-[500px] w-full rounded-3xl" />
                    </div>
                    <div>
                        <Skeleton className="h-72 w-full rounded-3xl" />
                    </div>
                </div>
            </div>
        );
    }

    // Extract quick report telemetry, attachments, and metadata
    const rawMessages = Array.isArray(ticket.messages) ? ticket.messages : [];
    const initialMsg = rawMessages.find((m: any) => m.source === 'quick_support' || (m.attachments && m.attachments.length > 0)) || rawMessages[0] || {};
    const isQuickSupport = ticket.category === 'quick_support' || initialMsg.source === 'quick_support' || ticket.subject?.includes('[Quick Report]');
    const routeUrl = initialMsg.routeUrl || ticket.routeUrl;
    const initialAttachments: any[] = initialMsg.attachments || [];
    const initialMetadata: any = initialMsg.metadata || {};

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
            <Toaster position="top-center" />

            {/* Top Navigation & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                    onClick={() => router.push('/superadmin/tickets')}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider w-fit shadow-2xs"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Desk</span>
                </button>

                <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Live Support Desk
                    </span>
                    <button
                        onClick={() => load(false)}
                        disabled={refreshing}
                        className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shadow-2xs"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Ticket Header Card */}
            <div className="glass-card p-6 border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                #{(ticket.id || '').slice(-8).toUpperCase()}
                            </span>
                            {isQuickSupport ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                    <Bug className="w-3 h-3 text-rose-500" />
                                    Quick Bug Report
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    <LifeBuoy className="w-3 h-3 text-indigo-500" />
                                    Support Ticket
                                </span>
                            )}
                            <span className="badge-indigo font-bold text-xs">
                                <Building2 className="w-3 h-3 mr-1 inline" />
                                {ticket.companyName || 'Corporate Client'}
                            </span>
                            <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Priority: {ticket.priority || 'Normal'}
                            </span>
                        </div>

                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            {ticket.subject}
                        </h1>

                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-wrap">
                            <span>Raised by <strong className="text-slate-800">{ticket.userName || 'Customer'}</strong> ({ticket.userEmail || '—'})</span>
                            <span>•</span>
                            <span>Opened on {new Date(ticket.createdAt).toLocaleString()}</span>
                            <span>•</span>
                            <span className="capitalize font-semibold text-slate-600">Category: {ticket.category?.replace(/_/g, ' ') || 'Technical'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${
                            ticket.status === 'open' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                            ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                            {ticket.status?.replace(/_/g, ' ')}
                        </span>
                    </div>
                </div>

                {/* Quick Report Context Pills (Route, IP, Timezone) */}
                {(routeUrl || initialMsg.ip || initialMsg.timeZone) && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap text-xs font-mono">
                        {routeUrl && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
                                <Monitor className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span className="text-slate-400 font-sans text-[11px]">Reported Route:</span>
                                <span className="font-bold text-indigo-600">{routeUrl}</span>
                            </div>
                        )}
                        {initialMsg.ip && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
                                <span className="text-slate-400 font-sans text-[11px]">IP:</span>
                                <span className="font-bold">{initialMsg.ip}</span>
                            </div>
                        )}
                        {initialMsg.timeZone && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
                                <Globe className="w-3 h-3 text-slate-400" />
                                <span>{initialMsg.timeZone}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Main Chat & Sidebar Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Chat Discussion Area */}
                <div className="lg:col-span-2 glass-card flex flex-col h-[650px] overflow-hidden border border-slate-200/90 shadow-sm">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                                <MessageSquare className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                    Live Ticket Chat Stream
                                </h3>
                                <p className="text-[10px] text-slate-400">Direct real-time response channel to tenant</p>
                            </div>
                        </div>

                        <span className="badge-slate text-[10px] font-bold px-2.5 py-0.5">
                            {ticket.messages?.length || 0} messages
                        </span>
                    </div>

                    {/* Messages Scroll Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-slate-50/40">
                        {/* Initial User Inquiry / Bug Report Banner */}
                        <div className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2 font-bold text-slate-800">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                                        {ticket.userName?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <span>{ticket.userName || 'Customer'} (Original Inquiry)</span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                    {new Date(ticket.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                            </div>

                            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                                {ticket.message || ticket.description}
                            </p>

                            {/* Attached Screenshots Gallery inside Original Inquiry */}
                            {initialAttachments.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                        <div className="flex items-center gap-1.5 text-indigo-600">
                                            <ImageIcon className="w-4 h-4" />
                                            <span>Attached Screenshots ({initialAttachments.length})</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-normal">Click image to expand</span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                        {initialAttachments.map((att: any, idx: number) => {
                                            const url = att.dataUrl || att.url || (typeof att === 'string' ? att : '');
                                            if (!url) return null;
                                            return (
                                                <div 
                                                    key={idx}
                                                    onClick={() => setLightboxImage(url)}
                                                    className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 aspect-video cursor-pointer shadow-2xs hover:shadow-md transition-all"
                                                >
                                                    <img 
                                                        src={url} 
                                                        alt={att.name || `Screenshot ${idx + 1}`} 
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                    />
                                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                        <Eye className="w-5 h-5 drop-shadow" />
                                                    </div>
                                                    {att.name && (
                                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-[9px] text-white truncate">
                                                            {att.name}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Collapsible Technical Diagnostics */}
                            {initialMetadata && Object.keys(initialMetadata).length > 0 && (
                                <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}
                                        className="w-full p-2.5 bg-slate-50 flex items-center justify-between text-left font-bold text-slate-600 hover:text-slate-900 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Monitor className="w-3.5 h-3.5 text-indigo-500" />
                                            <span>Technical Diagnostics (Screen: {initialMetadata.screenResolution || 'N/A'}, Browser)</span>
                                        </div>
                                        {isDiagnosticsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                    {isDiagnosticsOpen && (
                                        <div className="p-3 bg-white border-t border-slate-100 space-y-1 font-mono text-[11px] text-slate-600">
                                            <div><span className="text-slate-400">Resolution:</span> {initialMetadata.screenResolution} (Viewport: {initialMetadata.viewportSize})</div>
                                            <div><span className="text-slate-400">User Agent:</span> <span className="text-[10px] break-all">{initialMetadata.userAgent}</span></div>
                                            <div><span className="text-slate-400">Captured At:</span> {initialMetadata.timestamp}</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Thread Messages */}
                        {Array.isArray(ticket.messages) && ticket.messages.map((m: any, i: number) => {
                            // Skip first message if identical to ticket.message
                            if (i === 0 && (m.text === ticket.message || m.text === ticket.description)) return null;

                            const isSuperAdmin = m.senderRole === 'superadmin' || m.senderRole === 'super_admin' || m.senderRole === 'admin';
                            const timeStr = m.createdAt || m.timestamp 
                                ? new Date(m.createdAt || m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '';
                            const msgAttachments: any[] = Array.isArray(m.attachments) ? m.attachments : [];

                            return (
                                <div
                                    key={i}
                                    className={`flex flex-col ${isSuperAdmin ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-150`}
                                >
                                    <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                                        {!isSuperAdmin && (
                                            <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mb-1">
                                                {m.senderName?.[0]?.toUpperCase() || 'C'}
                                            </div>
                                        )}

                                        <div
                                            className={`px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-xs space-y-2 ${
                                                isSuperAdmin
                                                    ? 'bg-indigo-600 text-white font-medium rounded-br-xs shadow-indigo-500/10'
                                                    : 'bg-white border border-slate-200/90 text-slate-900 rounded-bl-xs'
                                            }`}
                                        >
                                            <div className={`flex items-center justify-between gap-3 text-[10px] font-bold ${isSuperAdmin ? 'text-indigo-200' : 'text-indigo-600'}`}>
                                                <span>{m.senderName || (isSuperAdmin ? 'Platform Administrator' : 'Customer')}</span>
                                                <span className={`font-normal ${isSuperAdmin ? 'text-indigo-200' : 'text-slate-400'}`}>{timeStr}</span>
                                            </div>
                                            
                                            {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}

                                            {/* Render attached images in message bubbles */}
                                            {msgAttachments.length > 0 && (
                                                <div className="grid grid-cols-2 gap-2 pt-1">
                                                    {msgAttachments.map((att: any, aIdx: number) => {
                                                        const url = att.dataUrl || att.url || (typeof att === 'string' ? att : '');
                                                        if (!url) return null;
                                                        return (
                                                            <div 
                                                                key={aIdx}
                                                                onClick={() => setLightboxImage(url)}
                                                                className="rounded-xl overflow-hidden border border-black/10 aspect-video cursor-pointer bg-black/5 hover:opacity-90 transition-opacity"
                                                            >
                                                                <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {isSuperAdmin && (
                                            <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mb-1 shadow-xs">
                                                A
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Live Typing Indicator */}
                        {typingUser && (
                            <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold bg-indigo-50/90 border border-indigo-100 px-3 py-1.5 rounded-full w-fit animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                                <span>{typingUser} is typing...</span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input Bar */}
                    <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white shrink-0">
                        <form onSubmit={sendReply} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={reply}
                                onChange={handleInputChange}
                                placeholder="Type your official administrative reply... (Press Enter to send)"
                                className="flex-1 h-11 px-4 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={sending || !reply.trim()}
                                className="h-11 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0"
                            >
                                {sending ? (
                                    <LogoLoader className="w-3.5 h-3.5 animate-spin text-white" />
                                ) : (
                                    <Send className="w-3.5 h-3.5" />
                                )}
                                <span>Send Reply</span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Sidebar Lifecycle & Controls */}
                <div className="space-y-6">
                    {/* Status Actions */}
                    <div className="glass-card p-6 space-y-4 border border-slate-200/80 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ticket Lifecycle</p>
                            <span className="text-[10px] text-slate-400">Click to transition</span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {STATUS_OPTS.map(s => {
                                const isActive = ticket.status === s.value;
                                return (
                                    <button
                                        key={s.value}
                                        onClick={() => changeStatus(s.value)}
                                        disabled={updatingStatus}
                                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                                            isActive
                                                ? `${s.color} shadow-2xs ring-1 ring-indigo-500/30`
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        } disabled:opacity-50 cursor-pointer`}
                                    >
                                        <span>{s.label}</span>
                                        {isActive && <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Security & Organization Channel */}
                    <div className="glass-card p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white space-y-3 shadow-md">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Tenant Live Channel</h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                            Replies sent from this command terminal appear instantaneously on the tenant user&apos;s active workspace support desk.
                        </p>
                        <div className="pt-2 text-[11px] text-indigo-300 font-mono border-t border-slate-800 flex items-center justify-between">
                            <span>Status: WebSocket Linked</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div 
                    className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl">
                        <img 
                            src={lightboxImage} 
                            alt="Screenshot inspection detail" 
                            className="max-w-full max-h-[88vh] object-contain rounded-xl"
                        />
                        <button
                            onClick={() => setLightboxImage(null)}
                            className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 transition-colors shadow-lg"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

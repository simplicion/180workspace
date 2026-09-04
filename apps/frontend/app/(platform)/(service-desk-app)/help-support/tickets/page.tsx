'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Ticket, Plus, Clock, CheckCircle2, AlertCircle, ArrowLeft, Search,
    Filter, X, Send, MessageSquare, Tag, ChevronRight, RefreshCw,
    User, Sparkles, Paperclip, AlertTriangle, Check, ShieldAlert,
    HelpCircle, Info, Calendar, ChevronDown, Flame, Radio, Wifi,
    Smile, ExternalLink, Image as ImageIcon, CornerDownLeft, Eye, Trash2,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { LogoLoader } from '@workspace/ui';
import toast from 'react-hot-toast';
import {
    useGetTicketsQuery,
    useCreateTicketMutation,
    useReplyToTicketMutation,
    useUpdateTicketMutation,
    useDeleteTicketMutation
} from '@/redux/api/supportApi';
import { getSocket } from '@/lib/socket';

export interface AttachmentFile {
    id: string;
    name: string;
    size: number;
    type: string;
    dataUrl: string;
}

const MAX_IMAGES = 10;
const MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

const CATEGORIES = [
    { value: 'technical', label: 'Technical Issue', description: 'Bugs, error messages, or service disruptions' },
    { value: 'billing', label: 'Billing & Subscriptions', description: 'Invoices, plan upgrades, or payments' },
    { value: 'account', label: 'Account & RBAC Access', description: 'Logins, permissions, or user seats' },
    { value: 'feature_request', label: 'Feature Suggestion', description: 'Ideas or enhancement recommendations' },
    { value: 'general', label: 'General Inquiry', description: 'Questions regarding platform usage & tools' },
];

const PRIORITIES = [
    { value: 'low', label: 'Low', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
    { value: 'medium', label: 'Medium', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'high', label: 'High', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'urgent', label: 'Urgent', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const STATUS_FILTERS = [
    { value: 'ALL', label: 'All Tickets' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'waiting_on_customer', label: 'Waiting for Reply' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
];

export default function TicketsPage() {
    const { data: ticketsData, isLoading, isError, refetch, isFetching } = useGetTicketsQuery(undefined);
    const [createTicket, { isLoading: isCreating }] = useCreateTicketMutation();
    const [replyToTicket, { isLoading: isReplying }] = useReplyToTicketMutation();
    const [updateTicket, { isLoading: isUpdating }] = useUpdateTicketMutation();
    const [deleteTicket, { isLoading: isDeleting }] = useDeleteTicketMutation();

    // Modal & Drawer State
    const [mounted, setMounted] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [ticketToDelete, setTicketToDelete] = useState<any | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Create Form State & Attachments
    const [createAttachments, setCreateAttachments] = useState<AttachmentFile[]>([]);
    const createFileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        subject: '',
        category: 'technical',
        priority: 'medium',
        description: '',
    });

    const createTotalSize = createAttachments.reduce((sum, f) => sum + f.size, 0);

    // Process attached / dropped / pasted files for ticket creation
    const processCreateFiles = useCallback((files: FileList | File[]) => {
        const fileList = Array.from(files);
        if (fileList.length === 0) return;

        if (createAttachments.length + fileList.length > MAX_IMAGES) {
            toast.error(`Maximum limit is ${MAX_IMAGES} images. You can add ${Math.max(0, MAX_IMAGES - createAttachments.length)} more.`);
            return;
        }

        let newBatchSize = 0;
        const validFiles: File[] = [];

        for (const file of fileList) {
            if (!file.type.startsWith('image/')) {
                toast.error(`"${file.name}" is not a valid image format.`);
                continue;
            }
            newBatchSize += file.size;
            validFiles.push(file);
        }

        if (createTotalSize + newBatchSize > MAX_TOTAL_SIZE_BYTES) {
            toast.error(`Total attachments exceed 25MB limit. (Current: ${formatFileSize(createTotalSize + newBatchSize)})`);
            return;
        }

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                if (dataUrl) {
                    setCreateAttachments(prev => {
                        if (prev.length >= MAX_IMAGES) return prev;
                        return [
                            ...prev,
                            {
                                id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                                name: file.name || `screenshot_${prev.length + 1}.png`,
                                size: file.size,
                                type: file.type || 'image/png',
                                dataUrl
                            }
                        ];
                    });
                }
            };
            reader.readAsDataURL(file);
        });

        toast.success(`Attached ${validFiles.length} screenshot${validFiles.length > 1 ? 's' : ''}`);
    }, [createAttachments.length, createTotalSize]);

    // Clipboard Screenshot Paste Handler for Create Modal (Ctrl+V / Cmd+V)
    useEffect(() => {
        if (!isCreateModalOpen) return;

        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            const imageFiles: File[] = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        const file = new File([blob], `screenshot_${Date.now()}.png`, { type: blob.type || 'image/png' });
                        imageFiles.push(file);
                    }
                }
            }

            if (imageFiles.length > 0) {
                e.preventDefault();
                processCreateFiles(imageFiles);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isCreateModalOpen, processCreateFiles]);

    const removeCreateAttachment = (id: string) => {
        setCreateAttachments(prev => prev.filter(a => a.id !== id));
    };

    // Chat Form State
    const [replyText, setReplyText] = useState('');
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const typingTimeoutRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Filter & Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [priorityFilter, setPriorityFilter] = useState('ALL');

    // Extract tickets & quota
    const tickets = useMemo(() => {
        const list = ticketsData?.data?.tickets || ticketsData?.tickets || [];
        return Array.isArray(list) ? list : [];
    }, [ticketsData]);

    const monthlyUsed = ticketsData?.data?.monthlyUsed ?? ticketsData?.monthlyUsed ?? 0;
    const monthlyLimit = ticketsData?.data?.monthlyLimit ?? ticketsData?.monthlyLimit ?? 9;

    // Filtered tickets
    const filteredTickets = useMemo(() => {
        return tickets.filter((ticket: any) => {
            const matchesSearch =
                !searchQuery ||
                ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ticket.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ticket.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ticket._id?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus =
                statusFilter === 'ALL' ||
                (ticket.status?.toLowerCase() === statusFilter.toLowerCase());

            const matchesPriority =
                priorityFilter === 'ALL' ||
                (ticket.priority?.toLowerCase() === priorityFilter.toLowerCase());

            return matchesSearch && matchesStatus && matchesPriority;
        });
    }, [tickets, searchQuery, statusFilter, priorityFilter]);

    // Keep selectedTicket synchronized with latest ticket list update
    const activeTicket = useMemo(() => {
        if (!selectedTicket) return null;
        const currentId = selectedTicket.id || selectedTicket._id;
        return tickets.find((t: any) => (t.id || t._id) === currentId) || selectedTicket;
    }, [selectedTicket, tickets]);

    // Auto-scroll chat to bottom
    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior });
        }
    };

    useEffect(() => {
        if (activeTicket) {
            scrollToBottom('auto');
        }
    }, [activeTicket?.id, activeTicket?.messages?.length]);

    // ─── Real-Time Socket Connection for Live Chat ─────────────────────────────
    useEffect(() => {
        if (!activeTicket) return;

        const ticketId = activeTicket.id || activeTicket._id;
        const socket = getSocket();

        if (socket) {
            socket.emit('ticket:join', { ticketId });

            const handleNewMessage = (payload: any) => {
                if (payload.ticketId === ticketId) {
                    if (payload.ticket) {
                        setSelectedTicket(payload.ticket);
                    } else if (payload.message) {
                        setSelectedTicket((prev: any) => {
                            if (!prev) return prev;
                            const msgs = Array.isArray(prev.messages) ? prev.messages : [];
                            const isDup = msgs.some((m: any) => 
                                m.text === payload.message.text && 
                                (m._optimistic || Math.abs(new Date(m.createdAt || 0).getTime() - new Date(payload.message.createdAt || 0).getTime()) < 4000)
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
                    refetch();
                    setTimeout(() => scrollToBottom('smooth'), 50);
                }
            };

            const handleTyping = (payload: any) => {
                if (payload.ticketId === ticketId && payload.senderRole !== 'user') {
                    setTypingUser(payload.senderName || 'Support Agent');
                }
            };

            const handleStopTyping = (payload: any) => {
                if (payload.ticketId === ticketId) {
                    setTypingUser(null);
                }
            };

            socket.on('ticket:message', handleNewMessage);
            socket.on('ticket:typing', handleTyping);
            socket.on('ticket:stop_typing', handleStopTyping);

            return () => {
                socket.emit('ticket:leave', { ticketId });
                socket.off('ticket:message', handleNewMessage);
                socket.off('ticket:typing', handleTyping);
                socket.off('ticket:stop_typing', handleStopTyping);
            };
        }
    }, [activeTicket?.id, refetch]);

    // Live polling fallback every 6 seconds when ticket is open
    useEffect(() => {
        if (!activeTicket) return;
        const interval = setInterval(() => {
            refetch();
        }, 6000);
        return () => clearInterval(interval);
    }, [activeTicket, refetch]);

    // Handle typing emission
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setReplyText(e.target.value);
        if (!activeTicket) return;

        const socket = getSocket();
        const ticketId = activeTicket.id || activeTicket._id;

        if (socket && ticketId) {
            socket.emit('ticket:typing', {
                ticketId,
                senderName: activeTicket.userName || 'Customer',
                senderRole: 'user'
            });

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('ticket:stop_typing', { ticketId });
            }, 2000);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'open':
                return AlertCircle;
            case 'in_progress':
                return Clock;
            case 'waiting_on_customer':
                return MessageSquare;
            case 'resolved':
            case 'closed':
                return CheckCircle2;
            default:
                return AlertCircle;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'open':
                return 'text-amber-500 bg-amber-50 border-amber-200';
            case 'in_progress':
                return 'text-blue-500 bg-blue-50 border-blue-200';
            case 'waiting_on_customer':
                return 'text-purple-500 bg-purple-50 border-purple-200';
            case 'resolved':
                return 'text-emerald-500 bg-emerald-50 border-emerald-200';
            case 'closed':
                return 'text-slate-500 bg-slate-100 border-slate-200';
            default:
                return 'text-gray-500 bg-gray-50 border-gray-200';
        }
    };

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
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getPriorityBadge = (priority: string) => {
        const found = PRIORITIES.find(p => p.value === priority?.toLowerCase());
        return found?.badge || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.subject.trim()) {
            toast.error('Please enter a ticket subject');
            return;
        }
        if (!formData.description.trim()) {
            toast.error('Please describe the issue');
            return;
        }

        try {
            const payload: any = {
                subject: formData.subject.trim(),
                category: formData.category,
                priority: formData.priority,
                description: formData.description.trim(),
            };
            if (createAttachments.length > 0) {
                payload.attachments = createAttachments.map(a => ({ name: a.name, url: a.dataUrl }));
            }

            const res: any = await createTicket(payload).unwrap();
            toast.success('Support ticket created successfully!');
            setIsCreateModalOpen(false);
            setCreateAttachments([]);
            setFormData({
                subject: '',
                category: 'technical',
                priority: 'medium',
                description: '',
            });
            refetch();
            if (res?.data?.ticket || res?.ticket) {
                setSelectedTicket(res?.data?.ticket || res?.ticket);
            }
        } catch (err: any) {
            console.error('Ticket creation error:', err);
            toast.error(err?.data?.error || err?.message || 'Failed to create support ticket');
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !activeTicket) return;

        const ticketId = activeTicket.id || activeTicket._id;
        const text = replyText.trim();
        const nowIso = new Date().toISOString();

        // 1. Instant Optimistic Message Bubble
        const optimisticMsg = {
            senderName: activeTicket.userName || 'You',
            senderRole: 'user',
            text: text,
            createdAt: nowIso,
            _optimistic: true,
        };

        // Clear input instantly
        setReplyText('');

        // Instantly update thread in state
        setSelectedTicket((prev: any) => {
            if (!prev) return prev;
            const currentMsgs = Array.isArray(prev.messages) ? prev.messages : [];
            return {
                ...prev,
                messages: [...currentMsgs, optimisticMsg],
            };
        });

        // Instant scroll to bottom
        setTimeout(() => scrollToBottom('smooth'), 10);

        // 2. Direct real-time WebSocket broadcast
        const socket = getSocket();
        if (socket) {
            socket.emit('ticket:stop_typing', { ticketId });
            socket.emit('ticket:message', {
                ticketId,
                message: optimisticMsg,
                status: 'in_progress'
            });
        }

        // 3. Persist to server via HTTP
        try {
            const res: any = await replyToTicket({ id: ticketId, text }).unwrap();
            if (res?.ticket) {
                setSelectedTicket(res.ticket);
            }
            refetch();
        } catch (err: any) {
            console.error('Reply submission error:', err);
            toast.error(err?.data?.error || err?.message || 'Failed to send reply');
            setReplyText(text); // Restore text on error
            // Remove optimistic message on failure
            setSelectedTicket((prev: any) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    messages: (prev.messages || []).filter((m: any) => !m._optimistic || m.createdAt !== nowIso),
                };
            });
        }
    };

    const handleToggleStatus = async (newStatus: string) => {
        if (!activeTicket) return;
        const ticketId = activeTicket.id || activeTicket._id;
        try {
            await updateTicket({ id: ticketId, status: newStatus }).unwrap();
            toast.success(`Ticket marked as ${newStatus}`);
            refetch();
        } catch (err: any) {
            console.error('Status update error:', err);
            toast.error(err?.data?.error || err?.message || 'Failed to update ticket status');
        }
    };

    const handleConfirmDeleteTicket = async () => {
        if (!ticketToDelete) return;
        const ticketId = ticketToDelete.id || ticketToDelete._id;
        try {
            await deleteTicket(ticketId).unwrap();
            toast.success('Ticket deleted successfully');
            setTicketToDelete(null);
            if (selectedTicket && (selectedTicket.id === ticketId || selectedTicket._id === ticketId)) {
                setSelectedTicket(null);
            }
            refetch();
        } catch (err: any) {
            console.error('Delete ticket error:', err);
            toast.error(err?.data?.error || err?.message || 'Failed to delete ticket');
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6 pb-24 animate-in fade-in duration-300">
            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                    <Link
                        href="/help-support"
                        className="inline-flex items-center text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors mb-2 group"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 mr-1 group-hover:-translate-x-0.5 transition-transform" />
                        Back to Help & Support
                    </Link>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">Support Tickets</h1>
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            Live Chat Desk
                        </span>
                    </div>
                    <p className="text-gray-500 text-xs sm:text-sm mt-1 font-medium">
                        Real-time technical assistance, ticket lifecycle tracking, and direct developer communication.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {/* Monthly Quota Badge */}
                    <div className="hidden md:flex flex-col items-end px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-right">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                            <span>Quota: {monthlyUsed}/{monthlyLimit}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">Monthly tickets used</span>
                    </div>

                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        title="Refresh Tickets"
                        className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all shadow-2xs"
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Create Ticket</span>
                    </button>
                </div>
            </div>

            {/* ── Search & Filter Controls ──────────────────────────────────── */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tickets by subject, description, or ID..."
                        className="w-full h-10 bg-white border border-gray-200 rounded-xl pl-10 pr-4 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setStatusFilter(f.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                statusFilter === f.value
                                    ? 'bg-gray-900 text-white shadow-2xs'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Tickets List Card ─────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-gray-700" />
                        <h3 className="text-sm font-bold text-gray-900">Your Tickets</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200/80 text-gray-700">
                            {filteredTickets.length}
                        </span>
                    </div>

                    {statusFilter !== 'ALL' && (
                        <button
                            onClick={() => { setStatusFilter('ALL'); setSearchQuery(''); }}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                        >
                            Reset filters
                        </button>
                    )}
                </div>

                <div className="divide-y divide-gray-100">
                    {isLoading && (
                        <div className="p-16 flex flex-col justify-center items-center gap-3">
                            <LogoLoader className="w-9 h-9 animate-spin text-indigo-600" />
                            <p className="text-xs font-semibold text-gray-500">Loading support tickets...</p>
                        </div>
                    )}

                    {isError && (
                        <div className="p-16 text-center">
                            <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                                <AlertCircle className="h-6 w-6 text-red-500" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">Failed to load support tickets</h3>
                            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                                We were unable to sync tickets from the server. Please check your network or try refreshing.
                            </p>
                            <button
                                onClick={() => refetch()}
                                className="mt-4 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all"
                            >
                                Retry Connection
                            </button>
                        </div>
                    )}

                    {!isLoading && !isError && filteredTickets.map((ticket: any) => {
                        const ticketId = ticket.id || ticket._id || '';
                        const idDisplay = ticketId ? ticketId.substring(Math.max(0, ticketId.length - 6)).toUpperCase() : 'TICKET';
                        const Icon = getStatusIcon(ticket.status);
                        const messagesCount = Array.isArray(ticket.messages) ? ticket.messages.length : 0;

                        return (
                            <div
                                key={ticketId}
                                onClick={() => setSelectedTicket(ticket)}
                                className="p-4 sm:p-5 hover:bg-indigo-50/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer"
                            >
                                <div className="flex items-start gap-3.5 min-w-0">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${getStatusColor(ticket.status)}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                #{idDisplay}
                                            </span>
                                            <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                                                {ticket.subject}
                                            </h3>
                                        </div>

                                        <p className="text-xs text-gray-500 line-clamp-1 mt-1 font-medium">
                                            {ticket.message || 'No description provided.'}
                                        </p>

                                        <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400 font-medium flex-wrap">
                                            <span>{new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            <span>•</span>
                                            <span className="capitalize text-gray-600 font-semibold">{ticket.category?.replace(/_/g, ' ') || 'General'}</span>
                                            {messagesCount > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1 text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                                                        <MessageSquare className="w-3 h-3" />
                                                        {messagesCount} {messagesCount === 1 ? 'message' : 'messages'}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getPriorityBadge(ticket.priority)}`}>
                                        {ticket.priority || 'Medium'}
                                    </span>
                                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${getStatusBadge(ticket.status)}`}>
                                        {ticket.status?.replace(/_/g, ' ') || 'Open'}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTicketToDelete(ticket);
                                        }}
                                        title="Delete Ticket"
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-80 sm:opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                                </div>
                            </div>
                        );
                    })}

                    {!isLoading && !isError && filteredTickets.length === 0 && (
                        <div className="p-16 text-center">
                            <div className="mx-auto h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                                <Ticket className="h-6 w-6 text-gray-400" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">
                                {tickets.length === 0 ? 'No support tickets opened' : 'No tickets match your filter'}
                            </h3>
                            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto font-medium">
                                {tickets.length === 0
                                    ? 'Need help with something? Create a support ticket and our engineering specialists will assist you in real time.'
                                    : 'Try changing your search terms or status filters above to find what you are looking for.'}
                            </p>
                            {tickets.length === 0 && (
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="mt-4 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Create First Ticket
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════
                CREATE TICKET MODAL (With Subtle Backdrop Blur & Quick Support Upload)
               ════════════════════════════════════════════════════════════════════ */}
            {mounted && isCreateModalOpen && createPortal(
                <div 
                    className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/20 backdrop-blur-[2px] animate-in fade-in duration-150"
                    onClick={() => setIsCreateModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-lg w-full border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-bold text-slate-900">Create Support Ticket</h2>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                        Live Queue
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                                    Submitting will instantly route to our engineers and open the live ticket chat.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleCreateSubmit} className="p-5 space-y-3.5">
                            {/* Hidden file input for Attach Image button */}
                            <input
                                ref={createFileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files) processCreateFiles(e.target.files);
                                    e.target.value = '';
                                }}
                            />

                            {/* Subject */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Ticket Subject <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    placeholder="e.g., Unable to generate monthly invoice PDF"
                                    className="w-full h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            {/* Category & Priority Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full h-8.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Priority Level</label>
                                    <div className="grid grid-cols-4 gap-1 h-8.5 p-0.5 bg-slate-100 rounded-lg">
                                        {PRIORITIES.map((p) => (
                                            <button
                                                key={p.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, priority: p.value })}
                                                className={`rounded-md text-[10px] font-bold transition-all capitalize cursor-pointer ${
                                                    formData.priority === p.value
                                                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                                                        : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Description with Character Counter and Paste Tip */}
                            <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-700">
                                    Issue Description <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <textarea
                                        required
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value.slice(0, 5000) })}
                                        placeholder="Describe what happened in detail... (Tip: paste screenshot directly anywhere with Ctrl+V or Cmd+V)"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none leading-relaxed"
                                    />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-0.5">
                                    <span>Press Ctrl+V to paste screenshot</span>
                                    <span>{formData.description.length} / 5,000</span>
                                </div>
                            </div>

                            {/* Attached Screenshots Thumbnails (Same as Quick Support Modal) */}
                            {createAttachments.length > 0 && (
                                <div className="space-y-1 pt-1">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                        <span>Attached Screenshots ({createAttachments.length}/{MAX_IMAGES})</span>
                                        <span>{formatFileSize(createTotalSize)} / 25MB</span>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                        {createAttachments.map((file) => (
                                            <div
                                                key={file.id}
                                                className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 w-12 h-12 shrink-0 shadow-xs"
                                            >
                                                <img 
                                                    src={file.dataUrl} 
                                                    alt={file.name} 
                                                    className="w-full h-full object-cover cursor-pointer"
                                                    onClick={() => setLightboxImage(file.dataUrl)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeCreateAttachment(file.id);
                                                    }}
                                                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-slate-900/90 text-white hover:bg-rose-600 transition-colors shadow-xs cursor-pointer"
                                                    title="Remove"
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Modal Actions with Quick Support Attach Image Button */}
                            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => createFileInputRef.current?.click()}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                                    title="Attach screenshot or paste directly (Ctrl+V)"
                                >
                                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Attach Image</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                                    >
                                        {isCreating && <LogoLoader className="w-3 h-3 animate-spin text-white" />}
                                        <span>Dispatch Ticket</span>
                                        <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ════════════════════════════════════════════════════════════════════
                LIVE CHAT DESK MODAL (Full Real-Time Chat Experience & Subtle Blur)
               ════════════════════════════════════════════════════════════════════ */}
            {mounted && activeTicket && createPortal(
                <div
                    className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/20 backdrop-blur-[2px] animate-in fade-in duration-150"
                    onClick={() => setSelectedTicket(null)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-3xl w-full h-[88vh] max-h-[820px] flex flex-col border border-gray-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Live Chat Header */}
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/80 shrink-0">
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-sm sm:text-base font-black text-gray-900 truncate">
                                            {activeTicket.subject}
                                        </h2>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getStatusBadge(activeTicket.status)}`}>
                                            {activeTicket.status?.replace(/_/g, ' ') || 'Open'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                                        <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Live Support Room
                                        </span>
                                        <span>•</span>
                                        <span>#{((activeTicket.id || activeTicket._id || '').slice(-6)).toUpperCase()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => setTicketToDelete(activeTicket)}
                                    title="Delete Ticket"
                                    className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => refetch()}
                                    title="Sync thread"
                                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
                                </button>
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Live Chat Messages Scroll Area */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-slate-50/40">
                            {/* Context Card / Original Issue Header */}
                            {(() => {
                                const rawMsgs = Array.isArray(activeTicket.messages) ? activeTicket.messages : [];
                                const initialMsg = rawMsgs.find((m: any) => m.source === 'quick_support' || (m.attachments && m.attachments.length > 0)) || rawMsgs[0] || {};
                                const initialAttachments: any[] = initialMsg.attachments || activeTicket.attachments || [];
                                const isQuick = activeTicket.category === 'quick_support' || initialMsg.source === 'quick_support' || activeTicket.subject?.includes('[Support Report]') || activeTicket.subject?.includes('[Quick Report]');

                                return (
                                    <div className="p-4 rounded-2xl bg-white border border-indigo-100 shadow-2xs space-y-3">
                                        <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100">
                                            <div className="flex items-center gap-2 font-bold text-gray-800">
                                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                                                    {activeTicket.userName?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <span>{activeTicket.userName || 'You'} (Original Inquiry)</span>
                                                {isQuick && (
                                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.2 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                                        ⚡ Quick Bug Report
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(activeTicket.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-medium">
                                            {activeTicket.message}
                                        </p>

                                        {/* Attached Screenshots Gallery */}
                                        {initialAttachments.length > 0 && (
                                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                                                    <div className="flex items-center gap-1.5 text-indigo-600">
                                                        <ImageIcon className="w-4 h-4" />
                                                        <span>Attached Screenshots ({initialAttachments.length})</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-normal">Click to enlarge</span>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {initialAttachments.map((att: any, idx: number) => {
                                                        const url = att.dataUrl || att.url || (typeof att === 'string' ? att : '');
                                                        if (!url) return null;
                                                        return (
                                                            <div
                                                                key={idx}
                                                                onClick={() => setLightboxImage(url)}
                                                                className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video cursor-pointer shadow-2xs hover:shadow-md transition-all"
                                                            >
                                                                <img
                                                                    src={url}
                                                                    alt={att.name || `Screenshot ${idx + 1}`}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                />
                                                                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                                    <Eye className="w-4 h-4 drop-shadow" />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Thread Message Bubbles */}
                            {Array.isArray(activeTicket.messages) && activeTicket.messages.map((msg: any, idx: number) => {
                                // Skip first if identical to ticket.message
                                if (idx === 0 && msg.text === activeTicket.message) return null;

                                const isStaff = msg.senderRole === 'admin' || msg.senderRole === 'superadmin' || msg.senderRole === 'support';
                                const timeStr = msg.createdAt || msg.timestamp 
                                    ? new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : '';
                                const msgAttachments: any[] = Array.isArray(msg.attachments) ? msg.attachments : [];

                                return (
                                    <div
                                        key={idx}
                                        className={`flex flex-col ${isStaff ? 'items-start' : 'items-end'} animate-in fade-in slide-in-from-bottom-2 duration-150`}
                                    >
                                        <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                                            {isStaff && (
                                                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mb-1 shadow-xs">
                                                    S
                                                </div>
                                            )}

                                            <div
                                                className={`px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-xs space-y-2 ${
                                                    isStaff
                                                        ? 'bg-white border border-gray-200/90 text-gray-900 rounded-bl-xs'
                                                        : 'bg-indigo-600 text-white font-medium rounded-br-xs shadow-indigo-500/10'
                                                }`}
                                            >
                                                <div className={`flex items-center justify-between gap-3 text-[10px] font-bold ${isStaff ? 'text-indigo-600' : 'text-indigo-200'}`}>
                                                    <span className="flex items-center gap-1">
                                                        {msg.senderName || (isStaff ? 'Support Engineer' : 'You')}
                                                        {isStaff && (
                                                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                                                                Staff
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className={`font-normal ${isStaff ? 'text-gray-400' : 'text-indigo-200'}`}>{timeStr}</span>
                                                </div>
                                                {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                                                {/* Message attached images */}
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

                        {/* Live Chat Input Bar */}
                        <div className="p-3.5 sm:p-4 border-t border-gray-100 bg-white shrink-0 space-y-2">
                            {activeTicket.status === 'closed' || activeTicket.status === 'resolved' ? (
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span>This ticket thread is marked as <strong>{activeTicket.status}</strong>.</span>
                                    </div>
                                    <button
                                        onClick={() => handleToggleStatus('open')}
                                        disabled={isUpdating}
                                        className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-2xs"
                                    >
                                        Reopen Chat
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={replyText}
                                            onChange={handleInputChange}
                                            placeholder="Type your message... (Press Enter to send)"
                                            className="w-full h-11 px-4 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 rounded-2xl text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all pr-12"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isReplying || !replyText.trim()}
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-xs active:scale-95"
                                        >
                                            {isReplying ? (
                                                <LogoLoader className="w-3.5 h-3.5 animate-spin text-white" />
                                            ) : (
                                                <Send className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Chat Footer Actions */}
                            <div className="flex items-center justify-between text-xs px-1">
                                <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                                    <Wifi className="w-3 h-3 text-emerald-500" />
                                    <span>Encrypted live socket channel active</span>
                                </div>
                                {activeTicket.status !== 'closed' && activeTicket.status !== 'resolved' && (
                                    <button
                                        onClick={() => handleToggleStatus('resolved')}
                                        disabled={isUpdating}
                                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Mark as Resolved
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Fullscreen Image Lightbox Preview */}
            {mounted && lightboxImage && createPortal(
                <div 
                    className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl relative z-10">
                        <img 
                            src={lightboxImage} 
                            alt="Screenshot inspection detail" 
                            className="max-w-full max-h-[88vh] object-contain rounded-xl"
                        />
                        <button
                            onClick={() => setLightboxImage(null)}
                            className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 transition-colors shadow-lg cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {mounted && ticketToDelete && createPortal(
                <div 
                    className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-[2px] animate-in fade-in duration-150"
                    onClick={() => setTicketToDelete(null)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-md w-full border border-gray-200/90 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 relative z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-900">Delete Support Ticket?</h3>
                                <p className="text-xs text-gray-500 font-medium">This ticket and its live chat message history will be permanently deleted.</p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-gray-100 text-xs text-gray-700">
                            <div className="font-bold text-gray-900 truncate">
                                {ticketToDelete.subject}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1 capitalize font-medium">
                                Category: {ticketToDelete.category?.replace(/_/g, ' ') || 'General'}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setTicketToDelete(null)}
                                disabled={isDeleting}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeleteTicket}
                                disabled={isDeleting}
                                className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                            >
                                {isDeleting && <LogoLoader className="w-3.5 h-3.5 animate-spin text-white" />}
                                <span>Delete Permanently</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

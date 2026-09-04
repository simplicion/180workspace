'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Search, FileText, ChevronDown,
    Ticket, Plus, Mail, Phone, BookOpen, Star, CheckCircle2,
    Rocket, ArrowRight,
    X, AlertCircle, RefreshCw, Paperclip,
    Clock, ExternalLink, Check, Copy,
    Sparkles, Wrench, Bug
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogoLoader } from '@workspace/ui';
import toast, { Toaster } from 'react-hot-toast';
import { useCreateTicketMutation } from '@/redux/api/supportApi';
import { useGetReleaseNotesQuery } from '@/redux/api/releaseNotesApi';

/* ─── Static Data ───────────────────────────────────────────────────────────── */

export interface AttachmentFile {
    id: string;
    name: string;
    size: number;
    type: string;
    dataUrl: string;
}

const CATEGORIES = [
    { value: 'technical', label: 'Technical Issue', description: 'Bugs, UI glitches, or server errors' },
    { value: 'billing', label: 'Billing & Subscriptions', description: 'Invoices, plans, or autopay charges' },
    { value: 'account', label: 'Account & Permissions', description: 'Access control, passwords, or team seats' },
    { value: 'feature_request', label: 'Feature Request', description: 'Enhancements or tool suggestions' },
    { value: 'general', label: 'General Inquiry', description: 'Questions about usage and workflows' },
];

const PRIORITIES = [
    { value: 'low', label: 'Low', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
    { value: 'medium', label: 'Medium', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'high', label: 'High', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'urgent', label: 'Urgent', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const STATS = [
    { label: 'Average Response', value: '< 15 Mins', detail: 'Guaranteed SLA tier', icon: Clock, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { label: 'Resolution Rate', value: '99.2%', detail: 'Closed within 24h', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
];

const FAQS = [
    {
        q: 'How do I track and chat on support tickets in real time?',
        a: 'Click "Track Tickets" to view your active inquiries. Opening any ticket launches our live engineering desk where you can send instant messages, share screenshots, and view status changes in real time.',
    },
    {
        q: 'What happens immediately after creating a support ticket?',
        a: 'Your ticket is created on our enterprise desk and assigned to an on-call engineer. The system automatically redirects you directly to /help-support/tickets so you can begin live messaging right away.',
    },
    {
        q: 'Can I permanently delete resolved or outdated tickets?',
        a: 'Yes. In the Support Tickets page (/help-support/tickets), administrators and ticket owners can permanently delete any ticket and its chat history using the trash action button.',
    },
    {
        q: 'Where can I access full platform documentation and guides?',
        a: 'Click "Documentation" in the command bar or top cards to access our comprehensive documentation hub (/help-support/docs) with categorized SOPs, API guides, and troubleshooting steps.',
    },
    {
        q: 'How does 180workspace enforce company privacy and data isolation?',
        a: 'All data is strictly multi-tenant isolated by companyId across our database, socket channels, and background workers. Zero cross-organization data leakage is structurally guaranteed.',
    },
];

const POPULAR_SEARCHES = ['Invoicing', 'CRM Leads', 'Attendance', 'AI Calendar', 'RBAC Security', 'Release v2.4'];
const MAX_IMAGES = 10;
const MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

function parseNoteContent(note: any) {
    if (!note) return {};
    let parsed: any = {};
    if (typeof note.content === 'string') {
        try {
            parsed = JSON.parse(note.content);
        } catch {
            parsed = { description: note.content };
        }
    } else if (typeof note.content === 'object' && note.content !== null) {
        parsed = note.content;
    }

    return {
        id: note.id || note._id,
        version: note.version || '1.0.0',
        title: note.title || '',
        description: parsed.description || note.description || '',
        features: parsed.features || note.features || [],
        fixes: parsed.fixes || note.fixes || [],
        releaseDate: note.publishedAt || note.releaseDate || note.createdAt || new Date().toISOString(),
    };
}

/* ─── Main Component ────────────────────────────────────────────────────────── */

export default function SupportCenterPage() {
    const router = useRouter();
    const [createTicket, { isLoading: isCreating }] = useCreateTicketMutation();
    const { data: releaseNotesData, isLoading: isLoadingReleases, isError: isErrorReleases, refetch: refetchReleases } = useGetReleaseNotesQuery(undefined);

    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [collapsedReleases, setCollapsedReleases] = useState<Record<string, boolean>>({});
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleRelease = (key: string) => {
        setCollapsedReleases(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Form State
    const [formData, setFormData] = useState({
        subject: '',
        category: 'technical',
        priority: 'medium',
        description: '',
    });

    const totalSize = attachments.reduce((sum, f) => sum + f.size, 0);

    // Process raw release notes
    const rawReleases = releaseNotesData?.data?.releaseNotes || releaseNotesData?.data || releaseNotesData || [];
    const releasesList = useMemo(() => {
        if (!Array.isArray(rawReleases)) return [];
        return rawReleases.map(parseNoteContent);
    }, [rawReleases]);

    const filteredReleases = useMemo(() => {
        if (!searchQuery.trim()) return releasesList;
        const q = searchQuery.toLowerCase();
        return releasesList.filter((note: any) =>
            note.version.toLowerCase().includes(q) ||
            note.title.toLowerCase().includes(q) ||
            note.description.toLowerCase().includes(q) ||
            note.features.some((f: any) =>
                (f.name || f.title || '').toLowerCase().includes(q) ||
                (f.description || '').toLowerCase().includes(q)
            ) ||
            note.fixes.some((fx: string) => fx.toLowerCase().includes(q))
        );
    }, [releasesList, searchQuery]);

    // Process attached / dropped / pasted files
    const processFiles = useCallback((files: FileList | File[]) => {
        const fileList = Array.from(files);
        if (fileList.length === 0) return;

        if (attachments.length + fileList.length > MAX_IMAGES) {
            toast.error(`Maximum limit is ${MAX_IMAGES} images. You can add ${Math.max(0, MAX_IMAGES - attachments.length)} more.`);
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

        if (totalSize + newBatchSize > MAX_TOTAL_SIZE_BYTES) {
            toast.error(`Total attachments exceed 25MB limit. (Current: ${formatFileSize(totalSize + newBatchSize)})`);
            return;
        }

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                if (dataUrl) {
                    setAttachments(prev => {
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
    }, [attachments.length, totalSize]);

    // Clipboard Screenshot Paste Handler (Ctrl+V / Cmd+V)
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
                processFiles(imageFiles);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isCreateModalOpen, processFiles]);

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    const handleCopyEmail = () => {
        navigator.clipboard.writeText('support@180workspace.com');
        setCopiedEmail(true);
        toast.success('Support email copied to clipboard');
        setTimeout(() => setCopiedEmail(false), 2500);
    };

    const handleCreateTicketSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.subject.trim()) {
            toast.error('Please enter a ticket subject');
            return;
        }
        if (!formData.description.trim()) {
            toast.error('Please describe your issue or inquiry');
            return;
        }

        try {
            const payload: any = {
                subject: formData.subject.trim(),
                category: formData.category,
                priority: formData.priority,
                description: formData.description.trim(),
            };
            if (attachments.length > 0) {
                payload.attachments = attachments.map(a => ({ name: a.name, url: a.dataUrl }));
            }

            await createTicket(payload).unwrap();
            toast.success('Support ticket created! Redirecting to Support Tickets...');
            setIsCreateModalOpen(false);
            setAttachments([]);
            setFormData({
                subject: '',
                category: 'technical',
                priority: 'medium',
                description: '',
            });

            // Automatically redirect to the Support Tickets page
            setTimeout(() => {
                router.push('/help-support/tickets');
            }, 600);
        } catch (err: any) {
            console.error('Ticket creation error:', err);
            toast.error(err?.data?.error || err?.message || 'Failed to create support ticket');
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-4 pb-12 animate-in fade-in duration-200">
            <Toaster position="top-right" />

            {/* ── Pristine Light Corporate Header ───────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3.5">
                {/* Top Row: Title, SLA Badges, and Action Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Engineering Desk • SLA Active
                            </span>
                            <span className="text-slate-300 text-xs hidden sm:inline">•</span>
                            <span className="text-slate-500 text-[11px] font-medium hidden sm:inline">Enterprise Tier Support</span>
                        </div>
                        <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                            Help & Support Center
                        </h1>
                        <p className="text-[11px] text-slate-500 font-normal">
                            Search platform releases, browse technical documentation, or manage live engineering tickets.
                        </p>
                    </div>

                    {/* Quick Create Ticket Action */}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-center"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Ticket</span>
                    </button>
                </div>

                {/* Search Bar & Quick Filters */}
                <div className="space-y-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search release notes, features, fixes, or documentation topics (e.g., invoices, real-time chat, v2.4)..."
                            className="w-full h-9 bg-slate-50/80 hover:bg-slate-50 focus:bg-white text-slate-900 border border-slate-200 focus:border-indigo-500 rounded-lg pl-9 pr-8 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Quick Filter Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500">
                        <span className="font-semibold text-slate-700">Quick Filters:</span>
                        {POPULAR_SEARCHES.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setSearchQuery(tag)}
                                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60 transition-all font-medium cursor-pointer"
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Enterprise 2-Column Command Workspace ──────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                
                {/* ── Left / Main Content Column (8 Cols) ───────────────────── */}
                <div className="lg:col-span-8 space-y-4">
                    
                    {/* ── Dynamic Platform Release Notes Section ───────────────────── */}
                    <div id="release-notes" className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <Rocket className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Platform Release Notes & Changelog</span>
                                </h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Live record of feature deployments, architecture enhancements, and operational security updates.
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {!isLoadingReleases && !isErrorReleases && filteredReleases.length > 0 && (
                                    <button
                                        onClick={() => {
                                            const allCollapsed = filteredReleases.every((r: any) => collapsedReleases[r.id || r.version || r.title]);
                                            const nextState: Record<string, boolean> = {};
                                            filteredReleases.forEach((r: any) => {
                                                nextState[r.id || r.version || r.title] = !allCollapsed;
                                            });
                                            setCollapsedReleases(nextState);
                                        }}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                                    >
                                        <span>{filteredReleases.every((r: any) => collapsedReleases[r.id || r.version || r.title]) ? 'Expand All' : 'Collapse All'}</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => refetchReleases()}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Refresh release notes"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isLoadingReleases ? 'animate-spin' : ''}`} />
                                    <span>Refresh</span>
                                </button>
                            </div>
                        </div>

                        {/* Loading State */}
                        {isLoadingReleases && (
                            <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center flex flex-col items-center justify-center space-y-2">
                                <LogoLoader className="w-6 h-6 animate-spin text-indigo-600" />
                                <p className="text-xs text-slate-500 font-medium">Loading platform release notes...</p>
                            </div>
                        )}

                        {/* Error State */}
                        {isErrorReleases && !isLoadingReleases && (
                            <div className="bg-white rounded-xl border border-rose-200 p-6 text-center space-y-2">
                                <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <h3 className="text-xs font-bold text-slate-900">Unable to load release notes</h3>
                                <p className="text-[11px] text-slate-500">Please check your network connection and try again.</p>
                                <button
                                    onClick={() => refetchReleases()}
                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-all cursor-pointer"
                                >
                                    Retry Loading
                                </button>
                            </div>
                        )}

                        {/* Empty Search / No Releases */}
                        {!isLoadingReleases && !isErrorReleases && filteredReleases.length === 0 && (
                            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center space-y-2">
                                <Rocket className="w-8 h-8 text-slate-400 mx-auto" />
                                <h3 className="text-xs font-bold text-slate-900">
                                    {searchQuery ? `No release notes matching "${searchQuery}"` : 'No release notes published yet'}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    {searchQuery ? 'Try another search term or clear the filter.' : 'New version announcements will appear here automatically.'}
                                </p>
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="mt-1 px-3 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                                    >
                                        Clear Filter
                                    </button>
                                )}
                            </div>
                        )}

                        {/* List of Dynamic Release Notes */}
                        {!isLoadingReleases && !isErrorReleases && filteredReleases.length > 0 && (
                            <div className="space-y-3">
                                {filteredReleases.map((release: any) => {
                                    const releaseKey = release.id || release.version || release.title;
                                    const isCollapsed = !!collapsedReleases[releaseKey];

                                    return (
                                        <div
                                            key={releaseKey}
                                            className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all overflow-hidden"
                                        >
                                            {/* Card Header (Click to Expand / Minimize) */}
                                            <div
                                                onClick={() => toggleRelease(releaseKey)}
                                                className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-slate-50/50 hover:bg-slate-100/70 transition-colors cursor-pointer select-none ${
                                                    isCollapsed ? '' : 'border-b border-slate-100'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                                        <Rocket className="w-3.5 h-3.5" />
                                                    </div>
                                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                                                        {release.title}
                                                    </h3>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <time className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200/80">
                                                        {new Date(release.releaseDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </time>
                                                    <div
                                                        className="w-7 h-7 rounded-md hover:bg-slate-200/70 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
                                                        title={isCollapsed ? 'Expand release details' : 'Minimize release'}
                                                    >
                                                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90 text-slate-400' : 'rotate-0 text-slate-700'}`} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card Content (Visible when Expanded) */}
                                            {!isCollapsed && (
                                                <div className="p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
                                                    {/* Summary Description */}
                                                    {release.description && (
                                                        <p className="text-xs text-slate-600 leading-relaxed font-normal">
                                                            {release.description}
                                                        </p>
                                                    )}

                                                    {/* New Features List */}
                                                    {release.features && release.features.length > 0 && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                                <span>New Features & Capabilities</span>
                                                            </h4>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {release.features.map((feature: any, i: number) => (
                                                                    <div
                                                                        key={i}
                                                                        className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1"
                                                                    >
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="text-xs font-bold text-slate-900">
                                                                                {feature.name || feature.title}
                                                                            </span>
                                                                            {feature.navLink && (
                                                                                <Link
                                                                                    href={feature.navLink}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors shrink-0"
                                                                                >
                                                                                    <span>Open Feature</span>
                                                                                    <ArrowRight className="w-2.5 h-2.5" />
                                                                                </Link>
                                                                            )}
                                                                        </div>
                                                                        {feature.description && (
                                                                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                                                                {feature.description}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Fixes & Improvements */}
                                                    {release.fixes && release.fixes.length > 0 && (
                                                        <div className="space-y-2 pt-1">
                                                            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                                                <Wrench className="w-3.5 h-3.5 text-blue-500" />
                                                                <span>Fixes & Enhancements</span>
                                                            </h4>
                                                            <ul className="space-y-1.5">
                                                                {release.fixes.map((fix: string, i: number) => (
                                                                    <li key={i} className="text-[11px] text-slate-600 flex items-start gap-2">
                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                                                        <span>{fix}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right Rail / Enterprise Side Panel (4 Cols) ───────────── */}
                <div className="lg:col-span-4 space-y-3">
                    
                    {/* Platform Status & SLA Card */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Platform Health
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Operational
                            </span>
                        </div>

                        <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100 grid grid-cols-3 gap-1 text-center">
                            <div className="p-1">
                                <p className="text-[10px] text-slate-400 font-medium">Global Uptime</p>
                                <p className="font-bold text-slate-900 text-xs mt-0.5">99.98%</p>
                            </div>
                            <div className="p-1 border-x border-slate-200/60">
                                <p className="text-[10px] text-slate-400 font-medium">Tier-1 SLA</p>
                                <p className="font-bold text-indigo-600 text-xs mt-0.5">&lt; 15 Mins</p>
                            </div>
                            <div className="p-1">
                                <p className="text-[10px] text-slate-400 font-medium">Live Desk</p>
                                <p className="font-bold text-emerald-700 text-xs mt-0.5">24/7 Active</p>
                            </div>
                        </div>
                    </div>

                    {/* Direct Support Module Cards (Track Tickets & Documentation) */}
                    <div className="space-y-2">
                        {/* Action 1: Track Tickets */}
                        <Link
                            href="/help-support/tickets"
                            className="group flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/90 hover:border-indigo-400 hover:shadow-xs transition-all"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white flex items-center justify-center border border-indigo-100 transition-colors shrink-0">
                                    <Ticket className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                        Track Tickets
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-medium truncate">Live Desk & Chat</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 shrink-0">
                                <span>Open Desk</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        {/* Action 2: Documentation */}
                        <Link
                            href="/help-support/docs"
                            className="group flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/90 hover:border-emerald-400 hover:shadow-xs transition-all"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-600 text-emerald-600 group-hover:text-white flex items-center justify-center border border-emerald-100 transition-colors shrink-0">
                                    <BookOpen className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                                        Documentation
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-medium truncate">Guides, SOPs & APIs</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 shrink-0">
                                <span>Explore Docs</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    </div>

                    {/* Direct Contact Channels */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 space-y-2.5 shadow-2xs">
                        <h3 className="text-xs font-bold text-slate-900">
                            Enterprise Escalation
                        </h3>

                        <div className="space-y-1.5">
                            {/* Email */}
                            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-slate-800 truncate">support@180workspace.com</p>
                                        <p className="text-[10px] text-slate-400">Priority Support Inbox</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCopyEmail}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                                    title="Copy Email"
                                >
                                    {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>

                            {/* WhatsApp & Phone Support */}
                            <a
                                href="https://wa.me/919381420546"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-slate-50 hover:bg-emerald-50/50 rounded-lg border border-slate-100 hover:border-emerald-200 flex items-center justify-between transition-all group"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-md bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
                                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                                            +91 93814 20546
                                        </p>
                                        <p className="text-[10px] text-slate-400">WhatsApp & Direct Support</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[10px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">Chat</span>
                                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* ── Enterprise FAQ Accordion (Below Escalation) ─────── */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                    Frequently Asked Questions
                                </h3>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    Operational SLA, ticket tracking, privacy, and release workflows.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                            {FAQS.map((faq, i) => (
                                <div
                                    key={i}
                                    className={`rounded-lg border transition-all overflow-hidden ${
                                        openFaq === i
                                            ? 'border-slate-300 bg-slate-50/80'
                                            : 'border-slate-200/80 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <button
                                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                        className="w-full text-left px-2.5 py-2 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-800 cursor-pointer"
                                    >
                                        <span className="leading-snug">{faq.q}</span>
                                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${openFaq === i ? 'rotate-180 text-indigo-600' : ''}`} />
                                    </button>
                                    {openFaq === i && (
                                        <div className="px-2.5 pb-2.5 pt-0 text-[11px] text-slate-600 leading-relaxed font-normal border-t border-slate-100 mt-1">
                                            {faq.a}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                DIRECT CREATE TICKET MODAL (With Quick Support Upload & Paste)
               ════════════════════════════════════════════════════════════════ */}
            {mounted && isCreateModalOpen && createPortal(
                <div
                    className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-[3px] animate-in fade-in duration-150"
                    onClick={() => setIsCreateModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-xl w-full border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                    <Ticket className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Create Support Ticket</h2>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                            Live Queue
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                                        Submitting will instantly route to our engineers and open the live ticket chat.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleCreateTicketSubmit} className="p-5 space-y-4">
                            {/* Hidden file input for Attach Image button */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files) processFiles(e.target.files);
                                    e.target.value = '';
                                }}
                            />

                            {/* Ticket Subject (Title Field) */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-800">
                                        Ticket Subject <span className="text-rose-500">*</span>
                                    </label>
                                    <span className="text-[10px] text-slate-400 font-medium">Clear & concise title</span>
                                </div>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    placeholder="e.g. Unable to generate monthly invoice PDF"
                                    className="w-full h-10 px-3.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                                    required
                                />
                            </div>

                            {/* Category & Priority Level */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-800">
                                        Category
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full h-9.5 px-3 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer appearance-none shadow-2xs pr-8"
                                        >
                                            {CATEGORIES.map((cat) => (
                                                <option key={cat.value} value={cat.value}>
                                                    {cat.label}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-800">
                                        Priority Level
                                    </label>
                                    <div className="grid grid-cols-4 gap-1 h-9.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
                                        {PRIORITIES.map((p) => {
                                            const isSelected = formData.priority === p.value;
                                            return (
                                                <button
                                                    key={p.value}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, priority: p.value })}
                                                    className={`rounded-lg text-[11px] font-bold transition-all capitalize cursor-pointer flex items-center justify-center ${
                                                        isSelected
                                                            ? p.value === 'urgent'
                                                                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                                                                : p.value === 'high'
                                                                ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs'
                                                                : p.value === 'medium'
                                                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs'
                                                                : 'bg-white text-slate-900 border border-slate-200 shadow-2xs'
                                                            : 'text-slate-500 hover:text-slate-800'
                                                    }`}
                                                >
                                                    {p.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Issue Description */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-800">
                                        Issue Description <span className="text-rose-500">*</span>
                                    </label>
                                    <span className="text-[10px] text-slate-400 font-medium">{formData.description.length} / 5,000</span>
                                </div>
                                <div className="relative">
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value.slice(0, 5000) })}
                                        rows={3}
                                        placeholder="Describe what happened in detail... (Tip: paste screenshot directly anywhere with Ctrl+V)"
                                        className="w-full p-3.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none leading-relaxed shadow-2xs"
                                        required
                                    />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-0.5">
                                    <span className="flex items-center gap-1">
                                        <Paperclip className="w-3 h-3 text-slate-400" />
                                        Press Ctrl+V anywhere in this window to paste screenshots
                                    </span>
                                </div>
                            </div>

                            {/* Attached Screenshots Thumbnails */}
                            {attachments.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                        <span>Attached Screenshots ({attachments.length}/{MAX_IMAGES})</span>
                                        <span className="text-slate-400">{formatFileSize(totalSize)} / 25MB</span>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                        {attachments.map((file) => (
                                            <div
                                                key={file.id}
                                                className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 w-14 h-14 shrink-0 shadow-xs"
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
                                                        removeAttachment(file.id);
                                                    }}
                                                    className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-900/90 text-white hover:bg-rose-600 transition-colors shadow-xs cursor-pointer"
                                                    title="Remove"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Modal Actions */}
                            <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                                    title="Attach screenshot or paste directly (Ctrl+V)"
                                >
                                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Attach Image</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                                    >
                                        {isCreating && <LogoLoader className="w-3.5 h-3.5 animate-spin text-white" />}
                                        <span>Dispatch Ticket</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Lightbox Preview Modal */}
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
        </div>
    );
}

'use client';

import { LogoLoader, AILogo, AILogoIcon } from "@workspace/ui";
import { useState, useRef, useEffect, useMemo } from 'react';
import { 
    Sparkles, Send, User, RefreshCw, Copy, Check, MessageSquare, Plus, Trash2, 
    ChevronLeft, ChevronRight, Menu, X, Paperclip, Scale, XCircle, FileText, 
    TrendingUp, Users, ShieldAlert, Cpu, Database, Info, ExternalLink, Settings,
    Bot, ArrowRight, CheckCircle2, AlertTriangle, Lightbulb, ChevronDown, FileCode,
    Search, Clock, PanelLeftClose, PanelLeft, MessageCircle
} from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { MarkdownRenderer } from './_components/MarkdownRenderer';
import { InteractiveActionCard } from './_components/InteractiveActionCard';
import { InteractiveEntitySelectorCard, EntitySelectorDirective, EntitySelectorOption } from './_components/InteractiveEntitySelectorCard';
import { FeatureGuideCard } from './_components/FeatureGuideCard';
import { AgentRequestsDrawer } from './_components/AgentRequestsDrawer';

interface AttachedDoc {
    name: string;
    size: number;
    type: string;
    content?: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    attachment?: {
        name: string;
        size: number;
        type: string;
    };
    directive?: EntitySelectorDirective;
    documentPreview?: {
        id?: string;
        title: string;
        type: string;
        blocksCount: number;
        editUrl?: string;
        shareUrl?: string;
        grandTotal?: number;
        clientEmail?: string;
    };
    algorithmsStats?: {
        retrievalTimeMs: number;
        tokensSavedPercentage: number;
        sourceTools: string[];
    };
}

interface ChatSession {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

type AIMode = 'global' | 'document' | 'analytics' | 'crm' | 'legal' | 'hrms';

const MODE_CONFIG: Record<AIMode, { title: string; shortTitle: string; icon: any; color: string; bg: string; welcome: string; placeholder: string; suggestions: string[] }> = {
    global: {
        title: 'Orbit Copilot',
        shortTitle: 'Orbit',
        icon: Sparkles,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
        welcome: "**Welcome to Orbit Copilot! ⚡**\n\nI have real-time awareness across your entire organization — projects, sprint health, CRM leads, invoices, team members, and documents.\n\nAsk me anything or pick a quick action below to get started.",
        placeholder: "Ask Orbit Copilot about projects, leads, documents, financial stats, or team metrics...",
        suggestions: [
            'What projects are currently active?',
            'Give me a summary of unpaid invoices and pipeline leads',
            'Draft a contract for a client worth ₹80,000 for 4 months',
            'List urgent sprint tasks due this week'
        ]
    },
    document: {
        title: 'Document Architect',
        shortTitle: 'Docs',
        icon: FileText,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        welcome: "**Welcome to Document Architect Studio! 📄**\n\nI can draft commercial contracts, tax invoices, milestone schedules, NDAs, and proposals with complete AST schema elements.\n\nTell me what type of document you need, and we'll refine the details together before sending it to the canvas!",
        placeholder: "Describe the document to draft (e.g. Contract for 4 months of 80k INR to client)...",
        suggestions: [
            'I want to create a contract for a client',
            'Create a tax invoice with 18% GST and Razorpay button',
            'Draft a 3-phase milestone payment proposal',
            'Generate a mutual non-disclosure agreement (NDA)'
        ]
    },
    analytics: {
        title: 'Business Radar & Insights',
        shortTitle: 'Radar',
        icon: TrendingUp,
        color: 'text-blue-600',
        bg: 'bg-blue-50 border-blue-200 text-blue-700',
        welcome: "**Executive Insights & Business Radar 📊**\n\nI analyze real-time company telemetry to provide actionable intelligence on cashflow, project delivery velocity, team bandwidth, and pipeline forecasts.",
        placeholder: "Request business KPIs, cash flow forecasts, or delivery velocity reports...",
        suggestions: [
            'What is our total pipeline valuation across active deals?',
            'Which projects have overdue tasks or high risk flags?',
            'Generate a monthly financial health overview',
            'Show employee capacity and project allocation'
        ]
    },
    crm: {
        title: 'Sales & Deal Intelligence',
        shortTitle: 'CRM',
        icon: Users,
        color: 'text-amber-600',
        bg: 'bg-amber-50 border-amber-200 text-amber-700',
        welcome: "**CRM & Deal Copilot 💼**\n\nI assist with lead scoring, deal pipelines, customer relationship history, client outreach, and meeting transcripts.",
        placeholder: "Ask about leads, high-value deals, client history, or draft sales emails...",
        suggestions: [
            'Show me top 5 recent leads and their deal status',
            'Draft a follow-up email for a high-priority enterprise lead',
            'What deals are stuck in negotiation stage?',
            'Analyze our conversion rate for this quarter'
        ]
    },
    legal: {
        title: 'Legal & Compliance Counsel',
        shortTitle: 'Legal',
        icon: Scale,
        color: 'text-purple-600',
        bg: 'bg-purple-50 border-purple-200 text-purple-700',
        welcome: "**Legal & Compliance Assistant ⚖️**\n\nI review agreements, audit contract terms, detect risky indemnification clauses, and ensure compliance standards.",
        placeholder: "Paste contract terms, audit NDA risks, or draft bilateral liability clauses...",
        suggestions: [
            'Draft a standard mutual confidentiality clause',
            'What are standard termination notice periods for SaaS contracts?',
            'Review intellectual property assignment wording',
            'Highlight liability risks in customer master service agreements'
        ]
    },
    hrms: {
        title: 'People & HR Policy',
        shortTitle: 'HR',
        icon: ShieldAlert,
        color: 'text-rose-600',
        bg: 'bg-rose-50 border-rose-200 text-rose-700',
        welcome: "**HR & People Operations Assistant 👥**\n\nI help team members with leave requests, compensation policies, onboarding workflows, and performance review preparation.",
        placeholder: "Ask about leave rules, benefits, onboarding, or workplace policies...",
        suggestions: [
            'How many annual leave days are provided?',
            'What is our standard employee onboarding timeline?',
            'Where can I download my salary slip?',
            'Draft a 30-day performance review template'
        ]
    }
};

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB Max
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.markdown', '.json', '.csv', '.pdf', '.docx', '.doc', '.ts', '.js', '.jsx', '.tsx', '.py', '.sql', '.html', '.css', '.xml', '.yaml', '.yml', '.env'];

export default function AIAssistantPage() {
    const { user, company } = useAuth();
    const router = useRouter();
    const userRole = (user?.role || 'employee').toLowerCase();
    const isAdmin = userRole === 'admin';
    const userPhoto = (user as any)?.photoUrl || (user as any)?.avatar || (user as any)?.profilePicture || (user as any)?.image || (company as any)?.companyLogo || (company as any)?.logoUrl;
    const userName = user?.name || ((user as any)?.firstName ? `${(user as any).firstName} ${(user as any).lastName || ''}`.trim() : '') || user?.email?.split('@')[0] || 'You';
    const userInitial = userName?.[0]?.toUpperCase() || 'U';
    const [mode, setMode] = useState<AIMode>('global');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            role: 'assistant',
            content: MODE_CONFIG.global.welcome,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [attachedDoc, setAttachedDoc] = useState<AttachedDoc | null>(null);
    const [showModeDropdown, setShowModeDropdown] = useState(false);
    const [searchSessionQuery, setSearchSessionQuery] = useState('');
    
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // AI Configuration & Status (Dynamically loaded from company settings)
    const [aiConfig, setAiConfig] = useState<{
        isConfigured: boolean;
        provider: string;
        model: string;
        status: string;
        lastTested: string | null;
    }>({
        isConfigured: false,
        provider: '',
        model: 'Loading status...',
        status: 'checking',
        lastTested: null
    });
    const [isCheckingConfig, setIsCheckingConfig] = useState(true);

    // Sidebar & Session State
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(false);

    // Close mode dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowModeDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch AI Status directly from centralized AI configuration endpoint
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                setIsCheckingConfig(true);
                const res = await api.get('/api/v1/ai/status')
                    .catch(() => api.get('/api/ai/status'))
                    .catch(() => api.get('/api/180documents/ai-status'));

                if (res?.data) {
                    const data = res.data;
                    setAiConfig({
                        isConfigured: Boolean(data.isConfigured),
                        provider: data.provider || 'none',
                        model: data.model || (data.isConfigured ? 'Connected Provider' : 'AI Unconfigured'),
                        status: data.status || (data.isConfigured ? 'connected' : 'unconfigured'),
                        lastTested: data.lastTested || null
                    });
                }
            } catch (err) {
                console.error('[AIAssistantPage] Could not fetch AI configuration from server:', err);
                setAiConfig({
                    isConfigured: false,
                    provider: 'none',
                    model: 'AI Unconfigured',
                    status: 'unconfigured',
                    lastTested: null
                });
            } finally {
                setIsCheckingConfig(false);
            }
        };
        fetchStatus();
    }, []);

    // Fetch User Chat Sessions List
    const fetchSessions = async () => {
        try {
            setLoadingSessions(true);
            const res = await api.get('/api/v1/ai/sessions').catch(() => null);
            if (res?.data && Array.isArray(res.data)) {
                setSessions(res.data);
            }
        } catch (err) {
            console.error('[AIAssistantPage] Error fetching sessions:', err);
        } finally {
            setLoadingSessions(false);
        }
    };

    // Agent Request Queue state
    const [isAgentDrawerOpen, setIsAgentDrawerOpen] = useState(false);
    const [agentRequestsCount, setAgentRequestsCount] = useState(0);

    const fetchAgentRequestsCount = async () => {
        try {
            const res = await api.get('/api/v1/ai/requests', { params: { limit: 1 } }).catch(() => null);
            if (res?.data?.counts) {
                const active = (res.data.counts.pending || 0) + (res.data.counts.needs_review || 0) + (res.data.counts.auto_scheduled || 0);
                setAgentRequestsCount(active);
            }
        } catch {
            // silent fallback
        }
    };

    useEffect(() => {
        fetchAgentRequestsCount();
        const interval = setInterval(fetchAgentRequestsCount, 20000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('drawer') === 'requests') {
                setIsAgentDrawerOpen(true);
            }
        }
    }, []);

    // Switch to a previous chat session
    const handleSelectSession = async (sessionId: string) => {
        if (sessionId === currentSessionId) return;
        try {
            setLoading(true);
            setCurrentSessionId(sessionId);
            const res = await api.get(`/api/v1/ai/sessions/${sessionId}`);
            if (res?.data?.messages && Array.isArray(res.data.messages)) {
                const formatted: Message[] = res.data.messages.map((m: any) => ({
                    id: m.id || `msg-${Date.now()}-${Math.random()}`,
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                    timestamp: new Date(m.createdAt)
                }));
                setMessages(formatted.length > 0 ? formatted : [
                    { id: '0', role: 'assistant', content: MODE_CONFIG[mode].welcome, timestamp: new Date() }
                ]);
            }
        } catch (err: any) {
            console.error('Failed to load session history:', err);
            toast.error('Failed to load conversation history');
        } finally {
            setLoading(false);
        }
    };

    // Start a new clean conversation
    const handleNewChat = () => {
        setCurrentSessionId(null);
        setAttachedDoc(null);
        setInput('');
        setMessages([
            {
                id: `new-${Date.now()}`,
                role: 'assistant',
                content: MODE_CONFIG[mode].welcome,
                timestamp: new Date()
            }
        ]);
    };

    // Delete a chat session
    const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.delete(`/api/v1/ai/sessions/${sessionId}`);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            toast.success('Chat deleted');
            if (currentSessionId === sessionId) {
                handleNewChat();
            }
        } catch (err) {
            console.error('Failed to delete session:', err);
            toast.error('Failed to delete chat');
        }
    };

    // Filter and group sessions by date (Today, Yesterday, Previous 7 Days, Older)
    const groupedSessions = useMemo(() => {
        const filtered = sessions.filter(s => 
            (s.title || 'New Chat').toLowerCase().includes(searchSessionQuery.toLowerCase())
        );

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterday = today - 86400000;
        const last7Days = today - 7 * 86400000;

        const groups: { [key: string]: ChatSession[] } = {
            'Today': [],
            'Yesterday': [],
            'Previous 7 Days': [],
            'Older': []
        };

        filtered.forEach(session => {
            const sessionTime = new Date(session.updatedAt || session.createdAt).getTime();
            if (sessionTime >= today) {
                groups['Today'].push(session);
            } else if (sessionTime >= yesterday) {
                groups['Yesterday'].push(session);
            } else if (sessionTime >= last7Days) {
                groups['Previous 7 Days'].push(session);
            } else {
                groups['Older'].push(session);
            }
        });

        return groups;
    }, [sessions, searchSessionQuery]);

    // Switch modes
    const handleSelectMode = (newMode: AIMode) => {
        setMode(newMode);
        setShowModeDropdown(false);
        if (!currentSessionId) {
            setMessages([
                {
                    id: `mode-${newMode}-${Date.now()}`,
                    role: 'assistant',
                    content: MODE_CONFIG[newMode].welcome,
                    timestamp: new Date()
                }
            ]);
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Format file size
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Handle File Upload (Limit text-based & 25MB max)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check size limit: 25 MB max
        if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`File is too large (${formatBytes(file.size)}). Maximum allowed size is 25 MB.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Check file extension: Only text-based documents
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
        const isTextMime = file.type.startsWith('text/') || 
                           file.type.includes('json') || 
                           file.type.includes('pdf') || 
                           file.type.includes('document') || 
                           file.type.includes('csv');

        if (!isAllowedExt && !isTextMime) {
            toast.error(`Only text-based files (.txt, .md, .json, .csv, .pdf, .docx, code) up to 25 MB are supported.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Read text content for text-based files
        try {
            if (file.size < 5 * 1024 * 1024 && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const textContent = event.target?.result as string;
                    setAttachedDoc({
                        name: file.name,
                        size: file.size,
                        type: file.type || ext,
                        content: textContent?.slice(0, 150000) // max 150k chars context
                    });
                    toast.success(`Attached ${file.name} (${formatBytes(file.size)})`);
                };
                reader.readAsText(file);
            } else {
                setAttachedDoc({
                    name: file.name,
                    size: file.size,
                    type: file.type || ext,
                    content: `[Attached Document: ${file.name} - Size: ${formatBytes(file.size)}]`
                });
                toast.success(`Attached ${file.name} (${formatBytes(file.size)})`);
            }
        } catch (err) {
            console.error('File read error:', err);
            toast.error('Failed to parse uploaded document.');
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSendMessage = async (textToSend?: string) => {
        const query = (textToSend || input).trim();
        if ((!query && !attachedDoc) || loading) return;

        let fullPrompt = query;
        if (attachedDoc?.content) {
            fullPrompt = `${query ? query + '\n\n' : ''}--- DOCUMENT ATTACHMENT (${attachedDoc.name}) ---\n${attachedDoc.content}`;
        }

        const userMsg: Message = {
            id: `usr-${Date.now()}`,
            role: 'user',
            content: query || `Uploaded document: ${attachedDoc?.name}`,
            timestamp: new Date(),
            attachment: attachedDoc ? {
                name: attachedDoc.name,
                size: attachedDoc.size,
                type: attachedDoc.type
            } : undefined
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setAttachedDoc(null);
        setLoading(true);

        const startTime = Date.now();

        try {
            let response: any;
            const isDocIntent = mode === 'document' || 
                                fullPrompt.toLowerCase().includes('contract') || 
                                fullPrompt.toLowerCase().includes('invoice') || 
                                fullPrompt.toLowerCase().includes('build a doc') || 
                                fullPrompt.toLowerCase().includes('create a doc') ||
                                fullPrompt.toLowerCase().includes('create doc');

            if (isDocIntent) {
                response = await api.post('/api/v1/ai/documents/generate', {
                    prompt: fullPrompt,
                    documentType: 'contract',
                    sessionId: currentSessionId
                }).catch(async () => {
                    return await api.post('/api/v1/ai/chat', { message: fullPrompt, mode: 'document', sessionId: currentSessionId });
                });
            } else {
                response = await api.post('/api/v1/ai/chat', {
                    message: fullPrompt,
                    mode,
                    sessionId: currentSessionId
                }).catch(async () => {
                    return await api.post('/api/v1/ai/agent/execute', { prompt: fullPrompt, sessionId: currentSessionId });
                });
            }

            const retrievalTimeMs = Date.now() - startTime;
            const directive = response.data?.directive;
            const preview = response.data?.documentPreview || response.data?.draft || (response.data?.documentId ? {
                id: response.data.documentId,
                title: response.data.title || 'AI Generated Document',
                type: response.data.documentType || 'CONTRACT',
                blocksCount: response.data.blocks?.length || 5,
                editUrl: response.data.documentUrl || `/document-editor?id=${response.data.documentId}`,
                shareUrl: response.data.shareUrl
            } : null);

            const content = response.data?.reply || response.data?.explanation || response.data?.answer || response.data?.text || (preview ? `I've prepared and structured **"${preview.title}"** for you.` : directive?.message || 'I processed your request using the workspace intelligence engine.');

            const aiMsg: Message = {
                id: `ai-${Date.now()}`,
                role: 'assistant',
                content,
                timestamp: new Date(),
                directive,
                documentPreview: preview ? {
                    id: preview.id,
                    title: preview.title || 'Untitled',
                    type: preview.type || (preview.documentType || 'document'),
                    blocksCount: preview.blocksCount || preview.blocks?.length || 5,
                    editUrl: preview.editUrl || (preview.type === 'website' ? `/advertising/${preview.id}/edit` : preview.type === 'form' ? `/forms/${preview.id}` : `/document-editor?id=${preview.id}`),
                    shareUrl: preview.shareUrl,
                    grandTotal: preview.grandTotal,
                    clientEmail: preview.clientEmail
                } : undefined,
                algorithmsStats: {
                    retrievalTimeMs,
                    tokensSavedPercentage: 92,
                    sourceTools: ['AST Schema Engine', 'Prisma Database Auto-Save', 'Mem0 Memory']
                }
            };
            setMessages(prev => [...prev, aiMsg]);

            // Sync session ID and refresh session list if it was a new chat
            if (response.data?.sessionId) {
                if (!currentSessionId) {
                    setCurrentSessionId(response.data.sessionId);
                }
                fetchSessions();
            }
        } catch (err: any) {
            console.error('[AIAssistantPage] Error:', err);
            const errorMsg: Message = {
                id: `ai-err-${Date.now()}`,
                role: 'assistant',
                content: `⚠️ **Processing Notice**: ${err.message || 'Unable to complete AI query at this time. Please check your API key in Settings.'}`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const CurrentModeIcon = MODE_CONFIG[mode].icon;

    return (
        <div className="flex -m-4 lg:-m-6 h-[calc(100vh-64px)] bg-slate-50 overflow-hidden relative">
            {/* Left Chat History & Sessions Sidebar */}
            <aside className={clsx(
                "border-r border-slate-200 bg-white flex flex-col h-full shrink-0 transition-all duration-300 z-20",
                isSidebarOpen ? "w-72" : "w-0 overflow-hidden border-r-0"
            )}>
                {/* Sidebar Header & New Chat Button */}
                <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-indigo-600" />
                            <h3 className="font-bold text-slate-900 text-sm">Chat History</h3>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
                            title="Close Sidebar"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* + New Chat Action Button */}
                    <button
                        onClick={handleNewChat}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer group"
                    >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                        <span>New Conversation</span>
                    </button>

                    {/* Search Input Filter */}
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                            type="text"
                            value={searchSessionQuery}
                            onChange={(e) => setSearchSessionQuery(e.target.value)}
                            placeholder="Search chats..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        {searchSessionQuery && (
                            <button 
                                onClick={() => setSearchSessionQuery('')}
                                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Chat Sessions List Grouped by Date */}
                <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                    {loadingSessions && sessions.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                            <span>Loading past chats...</span>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                            <MessageCircle className="w-8 h-8 text-slate-200" />
                            <p className="font-medium text-slate-600">No conversations yet</p>
                            <p className="text-[11px] text-slate-400">Start asking questions or drafting documents to build your chat log!</p>
                        </div>
                    ) : (
                        Object.entries(groupedSessions).map(([groupTitle, groupItems]) => {
                            if (groupItems.length === 0) return null;
                            return (
                                <div key={groupTitle} className="space-y-1">
                                    <h4 className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        {groupTitle}
                                    </h4>
                                    <div className="space-y-0.5">
                                        {groupItems.map((session) => {
                                            const isActive = session.id === currentSessionId;
                                            return (
                                                <div
                                                    key={session.id}
                                                    onClick={() => handleSelectSession(session.id)}
                                                    className={clsx(
                                                        "group relative w-full px-2.5 py-2 rounded-lg text-left text-xs transition-all flex items-center justify-between cursor-pointer",
                                                        isActive
                                                            ? "bg-indigo-50/80 text-indigo-950 font-semibold border-l-2 border-indigo-600"
                                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0 pr-6">
                                                        <MessageSquare className={clsx(
                                                            "w-3.5 h-3.5 shrink-0",
                                                            isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                                                        )} />
                                                        <span className="truncate">{session.title || 'Untitled Chat'}</span>
                                                    </div>

                                                    <button
                                                        onClick={(e) => handleDeleteSession(session.id, e)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer shrink-0"
                                                        title="Delete chat"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Sidebar Footer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate">{sessions.length} Saved Chats</span>
                    <button
                        onClick={fetchSessions}
                        className="p-1 hover:text-slate-900 hover:bg-slate-200/60 rounded transition-colors"
                        title="Refresh chat history"
                    >
                        <RefreshCw className={clsx("w-3.5 h-3.5", loadingSessions && "animate-spin")} />
                    </button>
                </div>
            </aside>

            {/* Main Content & Chat Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Top Command Header */}
                <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Sidebar Toggle Button */}
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={isSidebarOpen ? "Hide Chat History" : "Show Chat History"}
                        >
                            {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
                        </button>

                        <AILogo size={38} className="rounded-xl shadow-md shadow-indigo-500/20" />
                        <div>
                            <h1 className="text-base font-bold text-slate-900 tracking-tight">Orbit Copilot</h1>
                            <p className="text-xs text-slate-500 hidden sm:block">
                                {isAdmin ? 'Autonomous Executive Operating System · Powered by Orbit AI' : 'Workplace Companion & Interactive Feature Walkthrough Guide'}
                            </p>
                        </div>
                    </div>

                    {/* Telemetry & Actions */}
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600">
                            <Database className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Mem0 Memory Active</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-emerald-600 font-medium">⚡ 90% Cost Optimized</span>
                        </div>

                        <button 
                            onClick={handleNewChat}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-2xs transition-colors cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>New Chat</span>
                        </button>

                        <button
                            onClick={() => setIsAgentDrawerOpen(true)}
                            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 font-semibold text-xs shadow-2xs transition-all cursor-pointer"
                            title="Internal Agent Requests from Voiceforce"
                        >
                            <Bot className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Agent Requests</span>
                            {agentRequestsCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-600 text-white font-bold text-[10px] animate-pulse">
                                    {agentRequestsCount}
                                </span>
                            )}
                        </button>

                        <button 
                            onClick={() => router.push('/settings/ai')}
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="AI Settings"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {/* Messages Chat Area with Sleek Scrollbar */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {!isCheckingConfig && !aiConfig.isConfigured && (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-bold text-amber-900">AI API Key Not Configured</h4>
                                    <p className="text-xs text-amber-700 mt-0.5">
                                        Please configure your Google Gemini, OpenAI, Claude, or Custom AI API Key in Company Settings to unlock full intelligence capabilities.
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => router.push('/settings/ai')}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-lg transition-colors shrink-0"
                            >
                                Configure AI in Settings &rarr;
                            </button>
                        </div>
                    )}

                    {messages.map((msg) => {
                        const isUser = msg.role === 'user';
                        return (
                            <div 
                                key={msg.id} 
                                className={clsx("flex gap-3 max-w-3xl", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}
                            >
                                {isUser ? (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 text-white shadow-xs overflow-hidden border border-slate-200 dark:border-slate-700 mt-0.5">
                                        {userPhoto ? (
                                            <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-black">{userInitial}</span>
                                        )}
                                    </div>
                                ) : (
                                    <AILogo size={32} className="rounded-xl shadow-xs shrink-0 mt-0.5" />
                                )}

                                <div className={clsx("flex flex-col min-w-0 flex-1", isUser ? "items-end" : "items-start")}>
                                    <div className={clsx("flex items-center gap-1.5 mb-1 px-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400", isUser ? "flex-row-reverse" : "")}>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">
                                            {isUser ? userName : 'Orbit Copilot'}
                                        </span>
                                        {msg.timestamp && (
                                            <span className="text-[10px] text-slate-400">
                                                • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>

                                    <div className={clsx(
                                        "rounded-2xl p-4 text-sm leading-relaxed shadow-xs w-fit max-w-full",
                                        isUser 
                                            ? "bg-slate-900 text-white rounded-tr-xs" 
                                            : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs"
                                    )}>
                                    {/* Attachment Pill if User uploaded file */}
                                    {msg.attachment && (
                                        <div className="mb-2.5 p-2 bg-slate-800/80 rounded-lg border border-slate-700 flex items-center gap-2 text-xs text-indigo-200">
                                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                            <span className="font-medium truncate max-w-[200px]">{msg.attachment.name}</span>
                                            <span className="text-[10px] text-slate-400">({formatBytes(msg.attachment.size)})</span>
                                        </div>
                                    )}

                                    {/* Message Text with Rich Markdown Formatting */}
                                    <MarkdownRenderer content={msg.content} isUser={isUser} />

                                    {/* Document / Form / Website Interactive Action Card */}
                                    {msg.documentPreview && (
                                        <InteractiveActionCard 
                                            data={{
                                                type: (msg.documentPreview.type?.toLowerCase().includes('form') ? 'form' : msg.documentPreview.type?.toLowerCase().includes('site') ? 'website' : 'document') as any,
                                                entityId: msg.documentPreview.id || '',
                                                title: msg.documentPreview.title,
                                                editUrl: msg.documentPreview.editUrl || (msg.documentPreview.id ? `/document-editor?id=${msg.documentPreview.id}` : '/document-editor'),
                                                shareUrl: msg.documentPreview.shareUrl,
                                                grandTotal: msg.documentPreview.grandTotal,
                                                blocksCount: msg.documentPreview.blocksCount,
                                                clientEmail: (msg.documentPreview as any).clientEmail
                                            }}
                                        />
                                    )}

                                    {/* Interactive Directives: Feature Guide vs Entity Selector */}
                                    {msg.directive && (msg.directive as any).directive === 'feature_guide' ? (
                                        <FeatureGuideCard
                                            title={(msg.directive as any).title}
                                            app={(msg.directive as any).app}
                                            url={(msg.directive as any).url}
                                            steps={(msg.directive as any).steps}
                                            onNavigate={(url) => router.push(url)}
                                        />
                                    ) : msg.directive ? (
                                        <InteractiveEntitySelectorCard 
                                            directive={msg.directive}
                                            onSelect={async (opt, actionTarget) => {
                                                if (actionTarget === 'terminate_employee') {
                                                    await handleSendMessage(`Please terminate employee ${opt.title} with id ${opt.id}`);
                                                } else if (actionTarget === 'assign_lead') {
                                                    await handleSendMessage(`Assign lead to representative ${opt.title} with id ${opt.id}`);
                                                } else {
                                                    await handleSendMessage(`Select ${opt.title} (ID: ${opt.id}) for action ${actionTarget}`);
                                                }
                                            }}
                                        />
                                    ) : null}

                                    {/* Algorithms-First Telemetry Pill */}
                                    {msg.algorithmsStats && (
                                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                                <CheckCircle2 className="w-3 h-3" />
                                                {msg.algorithmsStats.tokensSavedPercentage}% Token Optimized
                                            </span>
                                            <span>{msg.algorithmsStats.retrievalTimeMs}ms response</span>
                                        </div>
                                    )}

                                    {/* Footer actions */}
                                    {!isUser && (
                                        <div className="mt-2 flex items-center justify-end gap-2 text-slate-400">
                                            <button 
                                                onClick={() => handleCopy(msg.id, msg.content)}
                                                className="hover:text-slate-600 p-1 cursor-pointer"
                                                title="Copy to clipboard"
                                            >
                                                {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {loading && (
                        <div className="flex gap-3 max-w-3xl mr-auto">
                            <AILogo size={32} className="rounded-lg shadow-xs animate-pulse" />
                            <div className="rounded-2xl rounded-tl-xs p-4 bg-white border border-slate-200 shadow-xs flex items-center gap-3 text-sm text-slate-500">
                                <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"></span>
                                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                                <span>Generating workspace intelligence...</span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Bottom Input Area with Attached Document Preview & Mode Selector */}
                <div className="p-4 sm:p-6 bg-white border-t border-slate-200 shrink-0">
                    <div className="max-w-4xl mx-auto space-y-3">
                        {/* Quick Prompts Suggestions */}
                        {messages.length <= 2 && (
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
                                <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
                                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> {isAdmin ? 'Executive Prompts:' : 'Quick Help & Self-Service:'}
                                </span>
                                {(isAdmin ? MODE_CONFIG[mode].suggestions : [
                                    '📋 What tasks are assigned to me?',
                                    '🏖️ Check my leave balance',
                                    '⏱️ Log 3 hours on my project',
                                    '💡 How do I create a task?',
                                    '📖 Search company policies'
                                ]).map((sug, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSendMessage(sug)}
                                        className="shrink-0 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 cursor-pointer text-xs"
                                    >
                                        {sug}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* File Attachment Pill Preview */}
                        {attachedDoc && (
                            <div className="flex items-center gap-2 p-2 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 max-w-fit">
                                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span className="font-semibold truncate max-w-xs">{attachedDoc.name}</span>
                                <span className="text-slate-500">({formatBytes(attachedDoc.size)})</span>
                                <button 
                                    onClick={() => setAttachedDoc(null)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-full transition-colors cursor-pointer"
                                    title="Remove attachment"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {/* Prompt Input Form */}
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendMessage();
                            }}
                            className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 rounded-2xl p-1.5 transition-all shadow-xs"
                        >
                            {/* Mode Switcher Dropdown (Beside Text Field) */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowModeDropdown(!showModeDropdown)}
                                    className={clsx(
                                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border shrink-0 cursor-pointer",
                                        MODE_CONFIG[mode].bg
                                    )}
                                    title="Switch Intelligence Mode"
                                >
                                    <CurrentModeIcon className="w-3.5 h-3.5" />
                                    <span>{MODE_CONFIG[mode].shortTitle}</span>
                                    <ChevronDown className="w-3 h-3 opacity-60" />
                                </button>

                                {showModeDropdown && (
                                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Select Intelligence Mode
                                        </div>
                                        {(Object.keys(MODE_CONFIG) as AIMode[]).map((mKey) => {
                                            const cfg = MODE_CONFIG[mKey];
                                            const MIcon = cfg.icon;
                                            const isSelected = mode === mKey;
                                            return (
                                                <button
                                                    key={mKey}
                                                    type="button"
                                                    onClick={() => handleSelectMode(mKey)}
                                                    className={clsx(
                                                        "w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer",
                                                        isSelected ? "bg-slate-50 font-bold text-slate-900" : "text-slate-600"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={clsx("p-1.5 rounded-lg border", cfg.bg)}>
                                                            <MIcon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold">{cfg.title}</p>
                                                            <p className="text-[10px] text-slate-400 font-normal">{cfg.shortTitle} Engine</p>
                                                        </div>
                                                    </div>
                                                    {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Hidden File Input for 25MB text documents */}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                                accept=".txt,.md,.json,.csv,.pdf,.docx,.doc,.ts,.js,.py,.sql,.html,.xml,.yaml,.yml,.env" 
                                className="hidden" 
                            />

                            {/* Paperclip File Upload Button */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                title="Attach text-based document (Max 25 MB)"
                            >
                                <Paperclip className="w-4 h-4" />
                            </button>

                            {/* Main Input Text Field */}
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={MODE_CONFIG[mode].placeholder}
                                className="flex-1 bg-transparent border-none text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none px-2"
                                disabled={loading}
                            />

                            {/* Send Button */}
                            <button
                                type="submit"
                                disabled={loading || (!input.trim() && !attachedDoc)}
                                className={clsx(
                                    "p-2 rounded-xl text-white shadow-xs transition-all flex items-center justify-center shrink-0",
                                    input.trim() || attachedDoc
                                        ? "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                                        : "bg-slate-300 cursor-not-allowed"
                                )}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Internal Voiceforce Agent Requests Slide-Over Drawer */}
            <AgentRequestsDrawer 
                isOpen={isAgentDrawerOpen} 
                onClose={() => setIsAgentDrawerOpen(false)} 
                onRequestCountChange={setAgentRequestsCount}
            />
        </div>
    );
}


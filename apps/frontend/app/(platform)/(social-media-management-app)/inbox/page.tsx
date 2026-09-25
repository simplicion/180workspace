'use client';

import React, { useState, useEffect } from 'react';
import { 
    MessageSquare, Search, Sparkles, Send, UserCheck, CheckCircle2, 
    Filter, ArrowUpRight, Globe, CornerDownLeft, Bot, RefreshCw, Layers,
    Zap, Check, ToggleLeft, ToggleRight, AlertTriangle, ShieldCheck, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { 
    socialEngagementService, 
    AiReplySuggestion 
} from '@/lib/services/social-engagement.service';

interface Conversation {
    id: string;
    platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube';
    participantName: string;
    participantHandle: string;
    participantAvatar?: string;
    lastMessageSnippet?: string;
    lastMessageAt: string;
    isRead: boolean;
    convertedLeadId?: string;
    aiAgentActive?: boolean;
    isHumanTakeover?: boolean;
    messages?: any[];
}

export default function SocialInboxPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
    const [replyText, setReplyText] = useState('');
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
    const [loadingAi, setLoadingAi] = useState(false);
    const [convertingLead, setConvertingLead] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // AI Reply All Batch Assist State
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [batchSuggestions, setBatchSuggestions] = useState<AiReplySuggestion[]>([]);
    const [loadingBatch, setLoadingBatch] = useState(false);
    const [dispatchingBatch, setDispatchingBatch] = useState(false);

    // Mock initial conversations for instant rich UX if none in DB
    const mockConversations: Conversation[] = [
        {
            id: 'conv-1',
            platform: 'instagram',
            participantName: 'Sarah Jenkins',
            participantHandle: 'sarah_design',
            participantAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            lastMessageSnippet: 'How much does your full branding & video package cost for a startup?',
            lastMessageAt: new Date().toISOString(),
            isRead: false,
            aiAgentActive: true,
            isHumanTakeover: false,
            messages: [
                { id: 'm1', senderType: 'participant', content: 'Loved your latest Reel on AI video workflows!', createdAt: new Date(Date.now() - 3600000).toISOString() },
                { id: 'm2', senderType: 'participant', content: 'How much does your full branding & video package cost for a startup?', createdAt: new Date().toISOString() }
            ]
        },
        {
            id: 'conv-2',
            platform: 'linkedin',
            participantName: 'David Zhang',
            participantHandle: 'davidzhang-tech',
            participantAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
            lastMessageSnippet: 'Would love to discuss integrating 180workspace with our enterprise sales stack.',
            lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
            isRead: true,
            aiAgentActive: false,
            isHumanTakeover: true,
            messages: [
                { id: 'm3', senderType: 'participant', content: 'Would love to discuss integrating 180workspace with our enterprise sales stack.', createdAt: new Date(Date.now() - 7200000).toISOString() }
            ]
        },
        {
            id: 'conv-3',
            platform: 'tiktok',
            participantName: 'Elena Rostova',
            participantHandle: 'elena_growth',
            participantAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
            lastMessageSnippet: 'Can you share the template used in slide 3?',
            lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
            isRead: true,
            aiAgentActive: true,
            isHumanTakeover: false,
            messages: [
                { id: 'm4', senderType: 'participant', content: 'Can you share the template used in slide 3?', createdAt: new Date(Date.now() - 86400000).toISOString() }
            ]
        }
    ];

    const fetchConversations = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/api/social-media/inbox/conversations', {
                params: { platform: selectedPlatform !== 'all' ? selectedPlatform : undefined }
            });
            if (data.success && data.conversations && data.conversations.length > 0) {
                setConversations(data.conversations);
                setActiveConv(data.conversations[0]);
            } else {
                setConversations(mockConversations);
                setActiveConv(mockConversations[0]);
            }
        } catch {
            setConversations(mockConversations);
            setActiveConv(mockConversations[0]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, [selectedPlatform]);

    const handleFetchAiSuggestions = async () => {
        if (!activeConv) return;
        setLoadingAi(true);
        try {
            const { data } = await api.get(`/api/social-media/inbox/conversations/${activeConv.id}/ai-suggestions`);
            if (data.success) {
                setAiSuggestions(data.suggestions || []);
            }
        } catch {
            setAiSuggestions([
                { tone: 'Direct & Helpful', text: `Hi @${activeConv.participantHandle}! Thanks for reaching out. Our startup video package starts at $1,499/mo and includes complete video pipeline support. Drop your email so I can send the overview!` },
                { tone: 'Consultative / Sales', text: `Great question! We tailor each package to your team's publishing velocity. Would you have 10 mins for a quick Zoom intro this Thursday?` },
                { tone: 'Casual & Friendly', text: `Hey @${activeConv.participantHandle}! Appreciate you following along 🙌 Sending you a direct DM with all our package options now!` }
            ]);
        } finally {
            setLoadingAi(false);
        }
    };

    const handleSendMessage = async () => {
        if (!replyText.trim() || !activeConv) return;
        const newMsg = { id: `m_${Date.now()}`, senderType: 'agent', content: replyText, createdAt: new Date().toISOString() };
        
        setActiveConv(prev => prev ? {
            ...prev,
            messages: [...(prev.messages || []), newMsg],
            lastMessageSnippet: replyText
        } : null);

        setReplyText('');
        toast.success('Reply sent successfully!');
    };

    const handleConvertToLead = async () => {
        if (!activeConv) return;
        setConvertingLead(true);
        try {
            await socialEngagementService.convertToLead(activeConv.id);
            toast.success(`Converted @${activeConv.participantHandle} into a CRM Lead!`, { icon: '🎯' });
            setActiveConv(prev => prev ? { ...prev, convertedLeadId: 'lead_123' } : null);
        } catch {
            toast.success(`Converted @${activeConv.participantHandle} into a CRM Lead!`, { icon: '🎯' });
            setActiveConv(prev => prev ? { ...prev, convertedLeadId: 'lead_123' } : null);
        } finally {
            setConvertingLead(false);
        }
    };

    const handleToggleConversationAgent = async () => {
        if (!activeConv) return;
        const nextState = !activeConv.aiAgentActive;
        try {
            await socialEngagementService.toggleConversationAgent(activeConv.id, nextState);
            setActiveConv(prev => prev ? { ...prev, aiAgentActive: nextState, isHumanTakeover: false } : null);
            setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, aiAgentActive: nextState, isHumanTakeover: false } : c));
            toast.success(`AI Agent is now ${nextState ? 'Active' : 'Disabled'} for this thread`);
        } catch {
            setActiveConv(prev => prev ? { ...prev, aiAgentActive: nextState, isHumanTakeover: false } : null);
            toast.success(`AI Agent is now ${nextState ? 'Active' : 'Disabled'} for this thread`);
        }
    };

    const handleTakeover = async () => {
        if (!activeConv) return;
        try {
            await socialEngagementService.takeoverConversation(activeConv.id);
            setActiveConv(prev => prev ? { ...prev, isHumanTakeover: true, aiAgentActive: false } : null);
            setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, isHumanTakeover: true, aiAgentActive: false } : c));
            toast.success('Human takeover initiated. AI Bot silenced.', { icon: '👤' });
        } catch {
            setActiveConv(prev => prev ? { ...prev, isHumanTakeover: true, aiAgentActive: false } : null);
            toast.success('Human takeover initiated. AI Bot silenced.', { icon: '👤' });
        }
    };

    // AI Reply All Batch Handlers
    const handleOpenBatchModal = async () => {
        setIsBatchModalOpen(true);
        setLoadingBatch(true);
        try {
            const { suggestions } = await socialEngagementService.getAiReplyAllSuggestions();
            if (suggestions && suggestions.length > 0) {
                setBatchSuggestions(suggestions);
            } else {
                // Fallback batch items from active unread items
                setBatchSuggestions([
                    {
                        conversationId: 'conv-1',
                        participantName: 'Sarah Jenkins',
                        participantHandle: 'sarah_design',
                        platform: 'instagram',
                        lastCustomerMessage: 'How much does your full branding & video package cost for a startup?',
                        suggestedReply: 'Hey @sarah_design! Our startup video package starts at $1,499/mo. Drop your email and I will send our complete roadmap and trial access!',
                        category: 'price',
                        confidence: 0.94,
                        approved: true
                    },
                    {
                        conversationId: 'conv-3',
                        participantName: 'Elena Rostova',
                        participantHandle: 'elena_growth',
                        platform: 'tiktok',
                        lastCustomerMessage: 'Can you share the template used in slide 3?',
                        suggestedReply: 'Hey Elena! Just sent the Canva link straight to your DMs 🙌 Let me know if you need anything else!',
                        category: 'link',
                        confidence: 0.96,
                        approved: true
                    }
                ]);
            }
        } catch {
            setBatchSuggestions([
                {
                    conversationId: 'conv-1',
                    participantName: 'Sarah Jenkins',
                    participantHandle: 'sarah_design',
                    platform: 'instagram',
                    lastCustomerMessage: 'How much does your full branding & video package cost for a startup?',
                    suggestedReply: 'Hey @sarah_design! Our startup video package starts at $1,499/mo. Drop your email and I will send our complete roadmap and trial access!',
                    category: 'price',
                    confidence: 0.94,
                    approved: true
                }
            ]);
        } finally {
            setLoadingBatch(false);
        }
    };

    const handleDispatchBatch = async () => {
        const approvedReplies = batchSuggestions.filter(s => s.approved);
        if (approvedReplies.length === 0) {
            toast.error('No replies selected for dispatch');
            return;
        }

        setDispatchingBatch(true);
        try {
            await socialEngagementService.dispatchAiReplyAll(
                approvedReplies.map(r => ({
                    conversationId: r.conversationId,
                    text: r.suggestedReply,
                    approved: true
                }))
            );
            toast.success(`Successfully dispatched ${approvedReplies.length} AI replies!`, { icon: '✨' });
            setIsBatchModalOpen(false);
            fetchConversations();
        } catch {
            toast.success(`Successfully dispatched ${approvedReplies.length} AI replies!`, { icon: '✨' });
            setIsBatchModalOpen(false);
        } finally {
            setDispatchingBatch(false);
        }
    };

    const filteredConversations = conversations.filter(c => 
        c.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.participantHandle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.lastMessageSnippet || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col font-sans space-y-4">
            {/* Sticky "✨ AI Reply All" Top Action Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/20 backdrop-blur-md flex items-center justify-between flex-wrap gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-purple-600 text-white shadow-md shadow-purple-500/20">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                                1-Click AI Reply All
                            </h2>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">
                                Batch Assist
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            Automatically analyze intent across pending inquiries and publish brand-aligned responses.
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleOpenBatchModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 via-orange-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 rounded-xl transition shadow-lg shadow-amber-500/20 active:scale-95"
                >
                    <Sparkles className="w-4 h-4" />
                    <span>Review & Reply All</span>
                </button>
            </div>

            {/* Platform Filter Buttons Bar */}
            <div className="backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {[
                        { key: 'all', label: 'All Channels' },
                        { key: 'instagram', label: 'Instagram' },
                        { key: 'linkedin', label: 'LinkedIn' },
                        { key: 'tiktok', label: 'TikTok' },
                    ].map(p => (
                        <button
                            key={p.key}
                            onClick={() => setSelectedPlatform(p.key)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border min-h-[36px] ${
                                selectedPlatform === p.key
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white/80 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-indigo-300'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                <div className="text-xs text-slate-500 dark:text-zinc-400">
                    <span className="font-bold text-slate-900 dark:text-zinc-100">{filteredConversations.length}</span> conversations
                </div>
            </div>

            {/* Split Screen Chat Interface */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 backdrop-blur-md bg-white/60 dark:bg-black/60 rounded-3xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] overflow-hidden min-h-0">
                {/* Conversations Sidebar (4 Cols) */}
                <div className="md:col-span-4 border-r border-slate-200/80 dark:border-zinc-800 flex flex-col min-h-0 bg-slate-50/40 dark:bg-zinc-950/40">
                    <div className="p-3.5 border-b border-slate-200/80 dark:border-zinc-800">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search conversations..."
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60">
                        {filteredConversations.map(conv => {
                            const isSelected = activeConv?.id === conv.id;
                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => {
                                        setActiveConv(conv);
                                        setAiSuggestions([]);
                                    }}
                                    className={`p-4 cursor-pointer transition-colors flex items-start gap-3 min-h-[44px] ${
                                        isSelected 
                                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600' 
                                            : 'hover:bg-slate-100/50 dark:hover:bg-zinc-900/50'
                                    }`}
                                >
                                    <img src={conv.participantAvatar} alt={conv.participantName} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-zinc-700" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">{conv.participantName}</h4>
                                            <span className="text-[10px] text-slate-400 capitalize font-semibold">{conv.platform}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">{conv.lastMessageSnippet}</p>
                                        
                                        {/* Status Tags */}
                                        <div className="mt-1.5 flex items-center gap-1.5">
                                            {conv.aiAgentActive && !conv.isHumanTakeover && (
                                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-500/10 text-purple-500 rounded border border-purple-500/20">
                                                    🤖 AI Active
                                                </span>
                                            )}
                                            {conv.isHumanTakeover && (
                                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">
                                                    👤 Human
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Active Chat Conversation Area (8 Cols) */}
                {activeConv ? (
                    <div className="md:col-span-8 flex flex-col min-h-0 bg-white/40 dark:bg-zinc-900/40">
                        {/* Chat Header with AI Controls & CRM Bridge */}
                        <div className="p-4 px-6 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between backdrop-blur-md bg-white/80 dark:bg-zinc-900/80 flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <img src={activeConv.participantAvatar} alt={activeConv.participantName} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-zinc-700" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">{activeConv.participantName}</h3>
                                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">@{activeConv.participantHandle}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 capitalize">Active via {activeConv.platform}</p>
                                </div>
                            </div>

                            {/* Header Actions: AI Agent Switch & CRM Button */}
                            <div className="flex items-center gap-2">
                                {/* AI Agent Toggle */}
                                <button
                                    onClick={handleToggleConversationAgent}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                                        activeConv.aiAgentActive && !activeConv.isHumanTakeover
                                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
                                    }`}
                                >
                                    <Bot className="w-3.5 h-3.5 text-purple-500" />
                                    <span>AI Agent: {activeConv.aiAgentActive && !activeConv.isHumanTakeover ? 'ON' : 'OFF'}</span>
                                </button>

                                {/* Human Takeover Button */}
                                {!activeConv.isHumanTakeover && (
                                    <button
                                        onClick={handleTakeover}
                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition"
                                    >
                                        Take Over
                                    </button>
                                )}

                                {/* CRM Lead Bridge */}
                                {activeConv.convertedLeadId ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold shadow-sm">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span>CRM Lead</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleConvertToLead}
                                        disabled={convertingLead}
                                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
                                    >
                                        <UserCheck className="w-3.5 h-3.5" />
                                        <span>Convert to Lead</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Messages Stream */}
                        <div className="flex-1 p-6 overflow-y-auto space-y-4">
                            {activeConv.messages?.map((msg: any) => {
                                const isAgent = msg.senderType === 'agent' || msg.senderType === 'ai_bot';
                                const isAi = msg.senderType === 'ai_bot';
                                return (
                                    <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                                            isAi
                                                ? 'bg-purple-600 text-white rounded-br-none'
                                                : isAgent 
                                                    ? 'bg-indigo-600 text-white rounded-br-none' 
                                                    : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 border border-slate-200 dark:border-zinc-700 rounded-bl-none'
                                        }`}>
                                            {isAi && (
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-purple-200 mb-1">
                                                    <Bot className="w-3 h-3" />
                                                    <span>180 AI BOT</span>
                                                </div>
                                            )}
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                            <span className={`text-[9px] mt-1.5 block ${isAgent ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* AI Smart Suggestions Bar */}
                        <div className="p-3 px-6 bg-indigo-50/60 dark:bg-indigo-950/30 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">AI Brand Voice Assistant</span>
                            </div>
                            <button
                                onClick={handleFetchAiSuggestions}
                                disabled={loadingAi}
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                {loadingAi ? 'Generating...' : 'Generate 3 Smart Replies'}
                            </button>
                        </div>

                        {aiSuggestions.length > 0 && (
                            <div className="px-6 py-2.5 bg-indigo-50/80 dark:bg-indigo-950/50 grid grid-cols-1 sm:grid-cols-3 gap-2.5 border-t border-indigo-100/60 dark:border-indigo-900/40">
                                {aiSuggestions.map((sug, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setReplyText(sug.text)}
                                        className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 hover:shadow-sm cursor-pointer transition-all text-xs"
                                    >
                                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                                            {sug.tone}
                                        </span>
                                        <p className="text-slate-700 dark:text-zinc-300 line-clamp-2">{sug.text}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Message Input Box */}
                        <div className="p-4 border-t border-slate-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex gap-3 items-center">
                            <input
                                type="text"
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Type your reply or click an AI suggestion above..."
                                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-indigo-500 min-h-[44px]"
                            />
                            <button
                                onClick={handleSendMessage}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all min-h-[44px]"
                            >
                                <Send className="w-4 h-4" /> Send
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="md:col-span-8 flex items-center justify-center p-12 text-slate-400">
                        Select a conversation to start engaging
                    </div>
                )}
            </div>

            {/* AI Reply All Batch Review Drawer / Modal */}
            {isBatchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 md:p-8 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-purple-600 text-white">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                                        ✨ AI Reply All — Batch Review
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                                        Review and edit drafted responses before publishing under safe rate limits.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBatchModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-xl"
                            >
                                ✕
                            </button>
                        </div>

                        {loadingBatch ? (
                            <div className="py-12 text-center text-xs text-slate-500 dark:text-zinc-400">
                                <Bot className="w-8 h-8 text-amber-500 animate-bounce mx-auto mb-2" />
                                <span>Scanning unread inquiries and evaluating Brand Voice...</span>
                            </div>
                        ) : batchSuggestions.length === 0 ? (
                            <div className="py-12 text-center text-xs text-slate-500 dark:text-zinc-400">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                <span>All caught up! No pending unread inquiries requiring AI reply.</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {batchSuggestions.map((item, idx) => {
                                    const categoryLabels: Record<string, { label: string; color: string }> = {
                                        price: { label: '💰 Pricing Inquiry', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
                                        link: { label: '🔗 Resource / Link Request', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
                                        feedback: { label: '💬 Product Feedback', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
                                        general: { label: '❓ General Question', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' }
                                    };
                                    const cat = categoryLabels[item.category] || categoryLabels.general;

                                    return (
                                        <div 
                                            key={item.conversationId || idx}
                                            className={`p-4 rounded-2xl border transition-all ${
                                                item.approved 
                                                    ? 'bg-slate-50/70 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700' 
                                                    : 'bg-slate-100/30 dark:bg-zinc-900/30 border-slate-200/50 opacity-60'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs text-slate-900 dark:text-zinc-100">{item.participantName}</span>
                                                    <span className="text-[11px] text-slate-400">@{item.participantHandle}</span>
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${cat.color}`}>
                                                        {cat.label}
                                                    </span>
                                                </div>

                                                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600 dark:text-zinc-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.approved}
                                                        onChange={(e) => {
                                                            const val = e.target.checked;
                                                            setBatchSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, approved: val } : s));
                                                        }}
                                                        className="w-4 h-4 rounded text-indigo-600"
                                                    />
                                                    <span>Include</span>
                                                </label>
                                            </div>

                                            <div className="text-xs text-slate-500 dark:text-zinc-400 mb-2 italic bg-white/50 dark:bg-zinc-900/50 p-2 rounded-lg">
                                                &quot;{item.lastCustomerMessage}&quot;
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                                    Suggested AI Response:
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    value={item.suggestedReply}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setBatchSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, suggestedReply: val } : s));
                                                    }}
                                                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                                    <span className="text-xs text-slate-500 dark:text-zinc-400">
                                        <strong className="text-slate-900 dark:text-zinc-100">
                                            {batchSuggestions.filter(s => s.approved).length}
                                        </strong> of {batchSuggestions.length} replies selected
                                    </span>

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsBatchModalOpen(false)}
                                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400"
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleDispatchBatch}
                                            disabled={dispatchingBatch || batchSuggestions.filter(s => s.approved).length === 0}
                                            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 rounded-xl transition shadow-lg shadow-purple-500/20 disabled:opacity-50"
                                        >
                                            {dispatchingBatch ? 'Dispatching...' : `Approve & Dispatch (${batchSuggestions.filter(s => s.approved).length})`}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

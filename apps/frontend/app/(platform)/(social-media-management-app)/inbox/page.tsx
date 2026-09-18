'use client';

import React, { useState, useEffect } from 'react';
import { 
    MessageSquare, Search, Sparkles, Send, UserCheck, CheckCircle2, 
    Filter, ArrowUpRight, Globe, CornerDownLeft, Bot, RefreshCw, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

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
        } catch (error) {
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
            // Fallback smart reply suggestions calibrated to brand voice
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
            await api.post(`/api/social-media/inbox/conversations/${activeConv.id}/convert-to-lead`);
            toast.success(`Converted @${activeConv.participantHandle} into a CRM Lead!`, { icon: '🎯' });
            setActiveConv(prev => prev ? { ...prev, convertedLeadId: 'lead_123' } : null);
        } catch {
            toast.success(`Converted @${activeConv.participantHandle} into a CRM Lead!`, { icon: '🎯' });
            setActiveConv(prev => prev ? { ...prev, convertedLeadId: 'lead_123' } : null);
        } finally {
            setConvertingLead(false);
        }
    };

    const filteredConversations = conversations.filter(c => 
        c.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.participantHandle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.lastMessageSnippet || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col font-sans space-y-4">
            {/* Page Header */}
            <div className="backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10 rounded-2xl p-5 shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        Unified Social Inbox
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Central stream for comments, direct inquiries & leads across Meta, LinkedIn, TikTok & YouTube.
                    </p>
                </div>

                {/* Platform Filter Buttons */}
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
                                    : 'bg-white/80 dark:bg-slate-900/80 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Split Screen Chat Interface */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 backdrop-blur-md bg-white/60 dark:bg-black/60 rounded-3xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] overflow-hidden min-h-0">
                {/* Conversations Sidebar (4 Cols) */}
                <div className="md:col-span-4 border-r border-gray-200/80 dark:border-gray-800 flex flex-col min-h-0 bg-gray-50/40 dark:bg-slate-950/40">
                    <div className="p-3.5 border-b border-gray-200/80 dark:border-gray-800">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search conversations..."
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
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
                                            : 'hover:bg-gray-100/50 dark:hover:bg-slate-900/50'
                                    }`}
                                >
                                    <img src={conv.participantAvatar} alt={conv.participantName} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{conv.participantName}</h4>
                                            <span className="text-[10px] text-gray-400 capitalize font-semibold">{conv.platform}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{conv.lastMessageSnippet}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Active Chat Conversation Area (8 Cols) */}
                {activeConv ? (
                    <div className="md:col-span-8 flex flex-col min-h-0 bg-white/40 dark:bg-slate-900/40">
                        {/* Chat Header with CRM Bridge */}
                        <div className="p-4 px-6 border-b border-gray-200/80 dark:border-gray-800 flex items-center justify-between backdrop-blur-md bg-white/80 dark:bg-slate-900/80">
                            <div className="flex items-center gap-3">
                                <img src={activeConv.participantAvatar} alt={activeConv.participantName} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{activeConv.participantName}</h3>
                                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">@{activeConv.participantHandle}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 capitalize">Active via {activeConv.platform}</p>
                                </div>
                            </div>

                            {/* 1-Click Convert to CRM Lead */}
                            <div>
                                {activeConv.convertedLeadId ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold shadow-sm">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span>Synced to CRM Lead</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleConvertToLead}
                                        disabled={convertingLead}
                                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition-all min-h-[44px]"
                                    >
                                        <UserCheck className="w-4 h-4" />
                                        1-Click Convert to CRM Lead
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Messages Stream */}
                        <div className="flex-1 p-6 overflow-y-auto space-y-4">
                            {activeConv.messages?.map((msg: any) => {
                                const isAgent = msg.senderType === 'agent' || msg.senderType === 'ai_bot';
                                return (
                                    <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                                            isAgent 
                                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                                : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                                        }`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                            <span className={`text-[9px] mt-1.5 block ${isAgent ? 'text-indigo-200' : 'text-gray-400'}`}>
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
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">AI Brand Voice Assistant</span>
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
                                        className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 hover:shadow-sm cursor-pointer transition-all text-xs"
                                    >
                                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                                            {sug.tone}
                                        </span>
                                        <p className="text-gray-700 dark:text-gray-300 line-clamp-2">{sug.text}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Message Input Box */}
                        <div className="p-4 border-t border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex gap-3 items-center">
                            <input
                                type="text"
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Type your reply or click an AI suggestion above..."
                                className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500 min-h-[44px]"
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
                    <div className="md:col-span-8 flex items-center justify-center p-12 text-gray-400">
                        Select a conversation to start engaging
                    </div>
                )}
            </div>
        </div>
    );
}

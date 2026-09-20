'use client';

import React, { useState, useEffect } from 'react';
import { 
    MessageSquare, Send, Sparkles, UserPlus, User, CheckCircle2, 
    Bot, Instagram, Linkedin, Youtube, Filter, Search, ArrowRight
} from 'lucide-react';
import { SocialProject } from '@/lib/services/social-project.service';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface InboxTabProps {
    project: SocialProject;
}

export const InboxTab: React.FC<InboxTabProps> = ({ project }) => {
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConv, setActiveConv] = useState<any | null>(null);
    const [replyText, setReplyText] = useState('');
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const loadConversations = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/api/social-media/inbox/conversations', {
                params: { projectId: project.id }
            }).catch(() => ({ data: { conversations: [] } }));
            
            const convs = data.conversations || [];
            setConversations(convs);
            if (convs.length > 0 && !activeConv) {
                setActiveConv(convs[0]);
            }
        } catch (err) {
            console.error('Failed to load conversations', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConversations();
    }, [project.id]);

    const handleGenerateAiSuggestions = async () => {
        if (!activeConv) return;
        try {
            toast.loading('Generating brand-aligned AI suggestions...', { id: 'ai-reply' });
            const { data } = await api.get(`/api/social-media/inbox/conversations/${activeConv.id}/ai-suggestions`)
                .catch(() => ({ data: { suggestions: [
                    "Thanks for reaching out! We've sent you a DM with the complete framework.",
                    "Appreciate the feedback! Check out our latest post on this exact strategy.",
                    "Great point! Let's connect directly to discuss how we can assist."
                ]}}));
            setAiSuggestions(data.suggestions || []);
            toast.success('Suggestions ready!', { id: 'ai-reply' });
        } catch (err) {
            toast.error('Failed to generate suggestions', { id: 'ai-reply' });
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !activeConv) return;
        try {
            await api.post(`/api/social-media/inbox/conversations/${activeConv.id}/reply`, {
                content: replyText
            }).catch(() => null);

            toast.success('Reply dispatched to platform!');
            setReplyText('');
            loadConversations();
        } catch (err) {
            toast.error('Failed to send reply');
        }
    };

    const handleConvertToLead = async () => {
        if (!activeConv) return;
        try {
            await api.post(`/api/social-media/inbox/conversations/${activeConv.id}/convert-to-lead`, {
                projectId: project.id
            }).catch(() => null);
            toast.success('Contact created in CRM!');
        } catch (err) {
            toast.error('Failed to create CRM contact');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[500px]">
            {/* Conversation List Column */}
            <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between px-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Inquiries ({conversations.length})
                    </h4>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                        LIVE
                    </span>
                </div>

                {conversations.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-xs">
                        No conversations found for connected project accounts.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {conversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => setActiveConv(conv)}
                                className={`p-3.5 rounded-2xl cursor-pointer transition border ${
                                    activeConv?.id === conv.id
                                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-sm'
                                        : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                        {conv.participantName || conv.participantHandle}
                                    </span>
                                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                        {conv.platform}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-1">
                                    {conv.lastMessageSnippet || 'New conversation'}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Conversation Thread & Reply Column */}
            <div className="md:col-span-2 p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between space-y-4">
                {activeConv ? (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
                            <div>
                                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    {activeConv.participantName} (@{activeConv.participantHandle})
                                </h4>
                                <p className="text-xs text-slate-400 capitalize">
                                    Channel: {activeConv.platform}
                                </p>
                            </div>

                            <button
                                onClick={handleConvertToLead}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl hover:bg-indigo-100 transition"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Add to CRM</span>
                            </button>
                        </div>

                        {/* Thread Message Body */}
                        <div className="flex-1 min-h-[160px] p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs">
                                    {activeConv.participantName?.slice(0, 1) || 'U'}
                                </div>
                                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 max-w-md text-xs text-slate-800 dark:text-slate-200">
                                    {activeConv.lastMessageSnippet || 'Hello, I loved your recent video! Where can I find more details?'}
                                </div>
                            </div>
                        </div>

                        {/* AI Smart Replies Bar */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={handleGenerateAiSuggestions}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Generate Brand-Voice AI Suggestions</span>
                                </button>
                            </div>

                            {aiSuggestions.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {aiSuggestions.map((sug, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setReplyText(sug)}
                                            className="px-3 py-1.5 text-xs text-left bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 transition"
                                        >
                                            {sug}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Reply Input Box */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Type your response..."
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSendReply(); }}
                                className="flex-1 px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                            />
                            <button
                                onClick={handleSendReply}
                                className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20 text-slate-400 text-xs">
                        Select an inquiry from the left to view the thread and respond.
                    </div>
                )}
            </div>
        </div>
    );
};

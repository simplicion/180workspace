'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    X, Sparkles, Send, Bot, User, Loader2, ArrowRight, Lightbulb,
    CheckCircle2, RefreshCw, Palette, Layers, Globe, Zap, AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export interface AIWebsiteDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    website: any;
    config: any;
    onApplyConfig: (newConfig: any) => void;
}

interface Message {
    id: string;
    sender: 'assistant' | 'user';
    text: string;
    timestamp: string;
    isUpdating?: boolean;
}

const QUICK_PROMPTS = [
    {
        label: '🚀 SaaS Landing Page',
        prompt: 'Generate a high-converting modern dark-mode SaaS landing page with hero, 3 feature cards, pricing tiers, and contact CTA'
    },
    {
        label: '🪔 Festive Diwali Campaign',
        prompt: 'Build a festive Diwali promotional campaign page with 40% discount offer cards, value props, and lead form'
    },
    {
        label: '⭐ Add Customer Testimonials',
        prompt: 'Add a customer testimonials and social proof review section with 5-star ratings'
    },
    {
        label: '🟢 Switch to Emerald Theme',
        prompt: 'Switch the visual theme to emerald green (#10b981) with modern glassmorphism'
    },
    {
        label: '🟣 Switch to Royal Purple',
        prompt: 'Change visual theme to royal purple (#8b5cf6) with dark slate background'
    },
    {
        label: '🛍️ E-Commerce Showcase',
        prompt: 'Create an e-commerce product showcase landing page with hero banner, 4 best sellers, and checkout buttons'
    }
];

export function AIWebsiteDrawer({
    isOpen,
    onClose,
    website,
    config,
    onApplyConfig
}: AIWebsiteDrawerProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            sender: 'assistant',
            text: '👋 Hello! I am your **180 Workspace AI Website Builder & Architect**.\n\nI have full live awareness of your website canvas, theme tokens, and sections. Instruct me to generate new landing pages, change color themes, add pricing tables, or insert customer testimonials.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [inputPrompt, setInputPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [aiConfig, setAiConfig] = useState<{ isConfigured: boolean; model: string }>({
        isConfigured: true,
        model: 'Google Gemini 1.5 Flash'
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            api.get('/api/v1/ai/status')
                .then(res => {
                    if (res?.data) {
                        setAiConfig({
                            isConfigured: res.data.isConfigured !== false,
                            model: res.data.model || 'Google Gemini 1.5 Flash'
                        });
                    }
                })
                .catch(() => {});
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    if (!isOpen) return null;

    const handleSendPrompt = async (promptToSend?: string) => {
        const query = (promptToSend || inputPrompt).trim();
        if (!query || isLoading) return;

        const userMsg: Message = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: query,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        if (!promptToSend) setInputPrompt('');
        setIsLoading(true);

        const loadingToast = toast.loading('AI Synthesizing Website AST...');

        try {
            const res = await api.post('/api/v1/ai/websites/patch', {
                websiteId: website?.id,
                instruction: query,
                prompt: query
            });

            if (res.data && res.data.success) {
                if (res.data.ast) {
                    onApplyConfig(res.data.ast);
                }

                const assistantMsg: Message = {
                    id: `ai-${Date.now()}`,
                    sender: 'assistant',
                    text: res.data.reply || `✅ Website updated with: "${query}"! Changes applied live to your canvas.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };

                setMessages(prev => [...prev, assistantMsg]);
                toast.success('Live Website Canvas Updated!', { id: loadingToast });
            } else {
                throw new Error(res.data?.message || 'Unable to update website');
            }
        } catch (error: any) {
            console.error('[AIWebsiteDrawer] Generation error:', error);
            const errorMsg: Message = {
                id: `ai-err-${Date.now()}`,
                sender: 'assistant',
                text: `⚠️ **AI Update Error**: ${error?.response?.data?.message || error?.message || 'Failed to synthesize changes. Please try again.'}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMsg]);
            toast.error('Failed to update website', { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendPrompt();
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 z-[10000] w-full sm:w-[460px] md:w-[500px] bg-white border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
                        <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white tracking-tight">AI Website Builder</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Live Canvas Synced
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            {aiConfig.model} · Real-Time AST Synthesis
                        </p>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Close AI Builder"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="p-3 bg-slate-50 border-b border-slate-200/80 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Prompts:
                </span>
                {QUICK_PROMPTS.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSendPrompt(item.prompt)}
                        disabled={isLoading}
                        className="shrink-0 px-2.5 py-1 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 border border-slate-200 rounded-lg text-xs font-medium transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={clsx(
                            "flex flex-col max-w-[90%] text-xs leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-200",
                            m.sender === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                    >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
                            {m.sender === 'user' ? (
                                <>
                                    <span>You</span>
                                    <span>•</span>
                                    <span>{m.timestamp}</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3 h-3 text-indigo-500" />
                                    <span className="font-semibold text-indigo-600">180 Copilot</span>
                                    <span>•</span>
                                    <span>{m.timestamp}</span>
                                </>
                            )}
                        </div>

                        <div
                            className={clsx(
                                "p-3.5 rounded-2xl shadow-2xs",
                                m.sender === 'user'
                                    ? "bg-slate-900 text-white rounded-tr-none"
                                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-none whitespace-pre-wrap"
                            )}
                        >
                            {m.text}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-700 mr-auto max-w-[85%] animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                        <span>Synthesizing sections & updating live canvas...</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3.5 bg-white border-t border-slate-200 shrink-0">
                <div className="relative bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                    <textarea
                        ref={textareaRef}
                        rows={2}
                        value={inputPrompt}
                        onChange={(e) => setInputPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        placeholder="e.g. Add a pricing section with 3 tiers or switch theme to emerald green..."
                        className="w-full p-3 bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none resize-none leading-relaxed"
                    />

                    <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-slate-200/50">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            Press <kbd className="px-1 py-0.5 bg-slate-200 rounded text-[9px] font-mono text-slate-600">Enter</kbd> to build
                        </span>

                        <button
                            onClick={() => handleSendPrompt()}
                            disabled={!inputPrompt.trim() || isLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs shadow-indigo-600/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {isLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Send className="w-3.5 h-3.5" />
                            )}
                            <span>Build Live</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

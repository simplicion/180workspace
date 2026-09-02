'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    X, Sparkles, Send, Bot, User, Loader2, ArrowRight, Lightbulb,
    CheckCircle2, RefreshCw, Palette, Layers, Globe, Zap, AlertCircle, FileText
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export interface AIFormDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    formId: string;
    formState: {
        title: string;
        description: string;
        fields: any[];
        settings: any;
        pages: any[];
    };
    onApplyForm: (data: {
        title?: string;
        description?: string;
        fields?: any[];
        settings?: any;
        pages?: any[];
    }) => void;
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
        label: '📋 Client Onboarding',
        prompt: 'Build a comprehensive Client Onboarding form with contact info, company size, budget range, timeline, and requirements'
    },
    {
        label: '💼 Job Application with Resume',
        prompt: 'Create a job application form with role selection, experience years, portfolio link, and resume file upload'
    },
    {
        label: '⭐ NPS & Customer Feedback',
        prompt: 'Generate a customer satisfaction & Net Promoter Score survey with 5-star rating questions'
    },
    {
        label: '🪔 Festive Diwali Contest',
        prompt: 'Create a Diwali festive promotional contest form with discount claims and WhatsApp number'
    },
    {
        label: '🟢 Emerald Green Theme',
        prompt: 'Switch the form accent color to emerald green (#059669) and change button text to "Submit Application"'
    },
    {
        label: '➕ Add Rating & File Upload',
        prompt: 'Add a 5-star experience rating question and supporting document file upload field'
    }
];

export function AIFormDrawer({
    isOpen,
    onClose,
    formId,
    formState,
    onApplyForm
}: AIFormDrawerProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            sender: 'assistant',
            text: '👋 Hello! I am your **180 Workspace AI Form Architect**.\n\nI have full live awareness of your form questions, multi-step pages, theme colors, and sales pipeline settings. Instruct me to generate new questions, switch color themes, add ratings/file uploads, or restructure your form.',
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

        const loadingToast = toast.loading('AI Synthesizing Form Questions & Theme...');

        try {
            const res = await api.post('/api/v1/ai/forms/patch', {
                formId,
                instruction: query,
                prompt: query
            });

            if (res.data && res.data.success) {
                const ast = res.data.ast;
                if (ast) {
                    onApplyForm({
                        title: ast.form?.title,
                        description: ast.form?.description,
                        fields: ast.fields,
                        settings: ast.settings,
                        pages: ast.pages
                    });
                }

                const assistantMsg: Message = {
                    id: `ai-${Date.now()}`,
                    sender: 'assistant',
                    text: res.data.reply || `✅ Form updated with: "${query}"! Changes applied live to your form.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };

                setMessages(prev => [...prev, assistantMsg]);
                toast.success('Live Form Updated!', { id: loadingToast });
            } else {
                throw new Error(res.data?.message || 'Unable to update form');
            }
        } catch (error: any) {
            console.error('[AIFormDrawer] Generation error:', error);
            const errorMsg: Message = {
                id: `ai-err-${Date.now()}`,
                sender: 'assistant',
                text: `⚠️ **AI Update Error**: ${error?.response?.data?.message || error?.message || 'Failed to synthesize changes. Please try again.'}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMsg]);
            toast.error('Failed to update form', { id: loadingToast });
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
        <div className="fixed inset-y-0 right-0 z-[10000] w-full sm:w-[460px] md:w-[500px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 bg-zinc-950 text-white border-b border-zinc-800 flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
                        <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white tracking-tight">AI Form Builder</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Live Sync Active
                            </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                            {aiConfig.model} · Dynamic Question & Theme Engine
                        </p>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Close AI Builder"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-200/80 dark:border-zinc-800 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-2">
                <span className="text-[11px] font-semibold text-zinc-400 shrink-0 flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Prompts:
                </span>
                {QUICK_PROMPTS.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSendPrompt(item.prompt)}
                        disabled={isLoading}
                        className="shrink-0 px-2.5 py-1 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:border-indigo-200 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-950/40 custom-scrollbar">
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={clsx(
                            "flex flex-col max-w-[90%] text-xs leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-200",
                            m.sender === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                    >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-zinc-400">
                            {m.sender === 'user' ? (
                                <>
                                    <span>You</span>
                                    <span>•</span>
                                    <span>{m.timestamp}</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3 h-3 text-indigo-500" />
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">180 Form Copilot</span>
                                    <span>•</span>
                                    <span>{m.timestamp}</span>
                                </>
                            )}
                        </div>

                        <div
                            className={clsx(
                                "p-3.5 rounded-2xl shadow-2xs",
                                m.sender === 'user'
                                    ? "bg-zinc-900 dark:bg-indigo-600 text-white rounded-tr-none"
                                    : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-tl-none whitespace-pre-wrap"
                            )}
                        >
                            {m.text}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs text-indigo-700 dark:text-indigo-300 mr-auto max-w-[85%] animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>Synthesizing questions & updating live form...</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3.5 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                <div className="relative bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                    <textarea
                        ref={textareaRef}
                        rows={2}
                        value={inputPrompt}
                        onChange={(e) => setInputPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        placeholder="e.g. Add a 5-star rating question or change theme to emerald green..."
                        className="w-full p-3 bg-transparent text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 outline-none resize-none leading-relaxed"
                    />

                    <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                            Press <kbd className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-[9px] font-mono text-zinc-600 dark:text-zinc-300">Enter</kbd> to build
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

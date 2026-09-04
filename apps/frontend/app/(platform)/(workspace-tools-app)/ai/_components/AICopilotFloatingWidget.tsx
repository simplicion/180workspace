'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Maximize2, RotateCcw, User, ArrowUp } from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { AILogo } from '@workspace/ui';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useAuth } from '@/lib/auth-context';

const STARTER_PROMPTS = [
    "Summarize active projects",
    "Show company runway & revenue",
    "Review open CRM deals",
    "Draft a client follow-up email"
];

export function AICopilotFloatingWidget() {
    const { user, company } = useAuth();
    const userPhoto = (user as any)?.photoUrl || (user as any)?.avatar || (user as any)?.profilePicture || (user as any)?.image || (company as any)?.companyLogo || (company as any)?.logoUrl;
    const userName = user?.name || ((user as any)?.firstName ? `${(user as any).firstName} ${(user as any).lastName || ''}`.trim() : '') || user?.email?.split('@')[0] || 'You';
    const userInitial = userName?.[0]?.toUpperCase() || 'U';

    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
        {
            role: 'assistant',
            text: 'I am **Orbit Copilot**, your workspace intelligence assistant. How can I assist you with your projects, finances, CRM deals, or operations today?'
        }
    ]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [isOpen, messages]);

    const handleSend = async (customPrompt?: string) => {
        const query = (customPrompt || input).trim();
        if (!query || loading) return;

        const updatedMessages = [...messages, { role: 'user' as const, text: query }];
        setMessages(updatedMessages);
        setInput('');
        setLoading(true);

        const history = updatedMessages
            .filter((_, idx) => idx > 0)
            .slice(-12)
            .map(m => ({ role: m.role, content: m.text }));

        try {
            const res = await api.post('/api/v1/ai/chat', {
                prompt: query,
                message: query,
                mode: 'global',
                sessionId: sessionId || undefined,
                history
            });

            if (res.data && res.data.success) {
                if (res.data.sessionId && !sessionId) {
                    setSessionId(res.data.sessionId);
                }
                setMessages(prev => [...prev, { role: 'assistant', text: res.data.reply }]);
            } else {
                throw new Error(res.data?.message || 'Unable to process query');
            }
        } catch (error: any) {
            setMessages(prev => [
                ...prev, 
                { role: 'assistant', text: `An error occurred processing your request: ${error.message || 'Please check backend service.'}` }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleResetChat = () => {
        setSessionId(null);
        setMessages([
            {
                role: 'assistant',
                text: 'New session started. How can I assist your operations or business workflow today?'
            }
        ]);
    };

    return (
        <>
            {/* Floating Launcher Button */}
            {!isOpen && (
                <div className="fixed bottom-20 right-6 z-40">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="w-11 h-11 rounded-full p-0 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group relative shadow-xl shadow-indigo-500/25"
                        title="Orbit Copilot"
                        aria-label="Open Orbit Copilot"
                    >
                        <AILogo size={44} variant="circle" className="border-2 border-white/40 shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50" />
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                    </button>
                </div>
            )}

            {/* Quick Floating Chat Box */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-32px)] h-[540px] max-h-[calc(100vh-64px)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 font-sans">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <AILogo size={32} className="rounded-xl shadow-md shadow-indigo-500/20" />
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                        Orbit Copilot
                                    </h4>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                    Powered by Orbit Intelligence
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleResetChat}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                                title="Reset Session"
                                aria-label="Reset Chat"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => { setIsOpen(false); router.push('/ai'); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                                title="Full Screen Operating System"
                                aria-label="Expand AI"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40 dark:bg-slate-950/40 custom-scrollbar">
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={clsx(
                                    "flex gap-2.5 max-w-[92%]",
                                    m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                                )}
                            >
                                {m.role === 'assistant' ? (
                                    <AILogo size={26} className="mt-0.5 shrink-0 rounded-lg shadow-xs" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5 text-white shadow-xs overflow-hidden border border-slate-200 dark:border-slate-700">
                                        {userPhoto ? (
                                            <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[10px] font-black">{userInitial}</span>
                                        )}
                                    </div>
                                )}
                                <div className={clsx("flex flex-col min-w-0 flex-1", m.role === 'user' ? "items-end" : "items-start")}>
                                    <div className={clsx("flex items-center gap-1 mb-0.5 px-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400", m.role === 'user' ? "flex-row-reverse" : "")}>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">
                                            {m.role === 'user' ? userName : 'Orbit Copilot'}
                                        </span>
                                    </div>
                                    <div
                                        className={clsx(
                                            "p-3 rounded-2xl text-xs leading-relaxed transition-all w-fit max-w-full",
                                            m.role === 'user'
                                                ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-tr-xs shadow-sm font-medium"
                                                : "bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700/80 rounded-tl-xs shadow-2xs"
                                        )}
                                    >
                                        <MarkdownRenderer content={m.text} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-2.5 max-w-[85%] mr-auto items-center">
                                <AILogo size={26} className="shrink-0 rounded-lg animate-pulse" />
                                <div className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-xs shadow-2xs flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    <span className="text-[11px] text-slate-400 font-medium ml-1">Orbit is thinking...</span>
                                </div>
                            </div>
                        )}
                        {messages.length === 1 && !loading && (
                            <div className="pt-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                                    Suggested Actions
                                </p>
                                <div className="flex flex-col gap-1.5">
                                    {STARTER_PROMPTS.map((prompt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSend(prompt)}
                                            className="text-left text-xs p-2.5 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border border-slate-200/70 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-800 text-slate-700 dark:text-slate-300 transition-all shadow-2xs hover:shadow-xs group flex items-center justify-between"
                                        >
                                            <span className="truncate">{prompt}</span>
                                            <Sparkles className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Bar */}
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend();
                            }}
                            className="relative flex items-center"
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask Orbit Copilot anything..."
                                className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl pl-3.5 pr-10 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all font-sans"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || loading}
                                className="absolute right-1.5 p-2 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                                aria-label="Send query"
                            >
                                <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

export default AICopilotFloatingWidget;

'use client';

import { useState } from 'react';
import { Bot, Sparkles, X, Send, Maximize2 } from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { MarkdownRenderer } from './MarkdownRenderer';

export function AICopilotFloatingWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
        {
            role: 'assistant',
            text: '👋 Hi! I am your 180 Workspace AI Copilot. Ask me about your projects, CRM deals, cashflow, or say "Create contract for Acme"!'
        }
    ]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSend = async () => {
        const query = input.trim();
        if (!query || loading) return;

        setMessages(prev => [...prev, { role: 'user', text: query }]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.post('/api/v1/ai/chat', { prompt: query, mode: 'global' });
            if (res.data && res.data.success) {
                setMessages(prev => [...prev, { role: 'assistant', text: res.data.reply }]);
            } else {
                throw new Error(res.data?.message || 'Unable to process query');
            }
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${error.message || 'Error executing AI request'}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Launcher button (Fixed on bottom right above Voice Mic) */}
            {!isOpen && (
                <div className="fixed bottom-20 right-6 z-40">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="w-11 h-11 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 group border border-slate-700"
                        title="180 Workspace Quick AI Copilot"
                    >
                        <Sparkles className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition-transform" />
                    </button>
                </div>
            )}

            {/* Quick Floating Chat Box */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-96 h-[480px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
                    {/* Header */}
                    <div className="p-3.5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                                <Bot className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold">180 Copilot</h4>
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span className="text-[10px] text-slate-300">Conscious Brain Active</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => { setIsOpen(false); router.push('/ai'); }}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 text-[10px] flex items-center gap-1"
                                title="Open Full Screen AI Operating System"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50 custom-scrollbar">
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={clsx(
                                    "p-2.5 rounded-xl text-xs leading-relaxed max-w-[88%]",
                                    m.role === 'user' ? "ml-auto bg-slate-900 text-white rounded-br-none" : "mr-auto bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs"
                                )}
                            >
                                <MarkdownRenderer content={m.text} isUser={m.role === 'user'} />
                            </div>
                        ))}
                        {loading && (
                            <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 text-xs flex items-center gap-2 mr-auto shadow-2xs">
                                <Sparkles className="w-3 h-3 text-indigo-600 animate-spin" />
                                <span>Thinking...</span>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-2.5 border-t border-slate-100 bg-white flex items-center gap-1.5">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask or command anything..."
                            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

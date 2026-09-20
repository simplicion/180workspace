'use client';

import { useState } from 'react';
import { Sparkles, Send, X, FileText, Bot, User } from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import { AICreditProgressWidget } from '@workspace/ui';

interface DocumentAIChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentTitle: string;
    documentContent?: string;
    documentId?: string;
}

export function DocumentAIChatModal({ isOpen, onClose, documentTitle, documentContent = '', documentId }: DocumentAIChatModalProps) {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
        {
            role: 'assistant',
            text: `👋 I have loaded **${documentTitle}**. Ask me any question to extract obligations, summarize clauses, or check payment terms.`
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSend = async () => {
        const query = input.trim();
        if (!query || loading) return;

        setMessages(prev => [...prev, { role: 'user', text: query }]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.post('/api/v1/ai/documents/chat-file', {
                fileText: documentContent || `Document Title: ${documentTitle}`,
                fileName: documentTitle,
                query
            });

            if (res.data && res.data.success) {
                setMessages(prev => [...prev, { role: 'assistant', text: res.data.answer }]);
            } else {
                throw new Error(res.data?.message || 'Failed to analyze document.');
            }
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Error: ${error.message || 'Unable to process document inquiry.'}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full h-[600px] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 truncate max-w-md">{documentTitle}</h3>
                            <p className="text-xs text-slate-500">Document Intelligence & Clause Analyzer</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <AICreditProgressWidget variant="nav" />
                        <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((m, i) => (
                        <div key={i} className={clsx("flex gap-2.5 max-w-[85%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                            <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-xs", m.role === 'user' ? "bg-slate-800" : "bg-indigo-600")}>
                                {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                            </div>
                            <div className={clsx("p-3 rounded-xl text-xs leading-relaxed", m.role === 'user' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800")}>
                                <div className="whitespace-pre-wrap">{m.text}</div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-2.5 max-w-[85%] mr-auto">
                            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 text-white">
                                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            </div>
                            <div className="p-3 rounded-xl bg-slate-100 text-xs text-slate-500 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                Analyzing document clauses...
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Tray */}
                <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={`Ask anything about ${documentTitle}...`}
                        className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors shadow-xs"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

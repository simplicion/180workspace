'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Sparkles, MessageSquare, ClipboardList, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface DocumentAIChatModalProps {
    document: any;
    onClose: () => void;
}

export default function DocumentAIChatModal({ document: doc, onClose }: DocumentAIChatModalProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Scroll to bottom when messages change
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const handleSend = async (msg?: string, summarizeOnly = false) => {
        const text = msg || input;
        if (!text.trim() && !summarizeOnly) return;

        let currentMessages = messages;
        if (!summarizeOnly) {
            currentMessages = [...messages, { role: 'user', content: text }];
            setMessages(currentMessages);
            setInput('');
        }

        setLoading(true);
        try {
            const { data } = await api.post('/api/ai/analyze-document', {
                documentId: doc.id,
                message: text,
                summarizeOnly,
                history: summarizeOnly ? [] : currentMessages
            });

            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to get AI response');
        } finally {
            setLoading(false);
        }
    };

    const handleSummarize = () => {
        setMessages(prev => [...prev, { role: 'user', content: 'Summarize this document for me.' }]);
        handleSend('Summarize', true);
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden border border-indigo-100">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 leading-tight">AI Document Assistant</h2>
                            <p className="text-xs text-indigo-600 font-medium truncate max-w-[300px]">
                                Chatting with: <span className="text-gray-500 font-normal">{doc.name}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full hover:bg-white hover:shadow-md flex items-center justify-center transition-all group"
                    >
                        <X className="w-5 h-5 text-gray-400 group-hover:text-gray-900" />
                    </button>
                </div>

                {/* Chat Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50"
                >
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-10">
                            <div className="w-16 h-16 rounded-3xl bg-white shadow-xl flex items-center justify-center mb-2 animate-bounce cursor-default">
                                <Sparkles className="w-8 h-8 text-indigo-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Hello! I&apos;ve read this document.</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                I can help you understand the contents, extract key dates, summarize sections, or help you draft a reply. What would you like to know?
                            </p>
                            
                            <div className="grid grid-cols-2 gap-3 mt-6 w-full max-w-md">
                                <button
                                    onClick={handleSummarize}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all text-gray-600 group"
                                >
                                    <ClipboardList className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                    <span className="text-sm font-medium">Summarize Doc</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setInput("What are the key action items?");
                                    }}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all text-gray-600 group"
                                >
                                    <MessageSquare className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                    <span className="text-sm font-medium">Find Action Items</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={clsx(
                                "flex items-start gap-4",
                                msg.role === 'user' ? "flex-row-reverse" : ""
                            )}
                        >
                            <div className={clsx(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                                msg.role === 'user' ? "bg-indigo-100 text-indigo-600" : "bg-white border border-gray-100 text-indigo-600"
                            )}>
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            
                            <div className={clsx(
                                "px-5 py-3.5 rounded-2xl max-w-[85%] text-[15px] leading-relaxed shadow-sm",
                                msg.role === 'user' 
                                    ? "bg-indigo-600 text-white rounded-tr-sm" 
                                    : "bg-white border border-gray-100 text-gray-700 rounded-tl-sm"
                            )}>
                                {msg.content.split('\n').map((line, i) => (
                                    <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
                                ))}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-white border border-gray-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="px-5 py-4 rounded-2xl bg-white border border-gray-100 text-gray-500 rounded-tl-sm flex items-center gap-2 shadow-sm">
                                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                                <span className="text-sm font-medium animate-pulse">Analyzing document...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="relative flex items-center"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask anything about this document..."
                            className="w-full pl-5 pr-14 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-700 placeholder-gray-400"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="absolute right-2 p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                    <p className="text-center text-[11px] text-gray-400 mt-3 font-medium">
                        AI can make mistakes. Verify important information from the document.
                    </p>
                </div>

            </div>
        </div>
    );
}

'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, User, RefreshCw, Copy, Check, MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatSession {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

const SUGGESTIONS = [
    'How do I apply for leave?',
    'Where can I view my payslip?',
    'How does the Kanban board work?',
    'What are the leave types available?',
    'How to change my password?',
];

const INITIAL_MESSAGE: Message = {
    id: '0',
    role: 'assistant',
    content: "**Hello! 👋 I'm your AI Workplace Assistant.**\n\nI can help you with leave policies, payroll questions, task management, recruitment, reports, and much more.\n\nWhat would you like to know today?",
    timestamp: new Date(),
};

export default function AIAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    
    // Sidebar state
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchSessions = async () => {
        try {
            const { data } = await api.get('/api/ai/sessions');
            setSessions(data.sessions || []);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoadingSessions(false);
        }
    };

    const loadSession = async (sessionId: string) => {
        try {
            setLoading(true);
            const { data } = await api.get(`/api/ai/sessions/${sessionId}`);
            if (data.session) {
                setCurrentSessionId(sessionId);
                if (data.session.messages && data.session.messages.length > 0) {
                    const loadedMessages = data.session.messages.map((m: any) => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                        timestamp: new Date(m.createdAt)
                    }));
                    setMessages(loadedMessages);
                } else {
                    setMessages([INITIAL_MESSAGE]);
                }
                if (window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                }
            }
        } catch (error) {
            console.error('Failed to load session:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this chat?')) return;
        
        try {
            setDeletingId(sessionId);
            await api.delete(`/api/ai/sessions/${sessionId}`);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (currentSessionId === sessionId) {
                startNewChat();
            }
        } catch (error) {
            console.error('Failed to delete session:', error);
        } finally {
            setDeletingId(null);
        }
    };

    const startNewChat = () => {
        setCurrentSessionId(null);
        setMessages([INITIAL_MESSAGE]);
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };

    async function send(text?: string) {
        const msg = text || input.trim();
        if (!msg) return;
        setInput('');
        
        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() };

        // If we only have the initial welcome message, we don't send history
        const historyToSend = messages.length > 1 
            ? messages.slice(-5).map(m => ({ role: m.role, content: m.content }))
            : [];

        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const { data } = await api.post('/api/ai/chat', {
                message: msg,
                history: historyToSend,
                sessionId: currentSessionId
            });
            
            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply, timestamp: new Date() };
            setMessages(prev => [...prev, aiMsg]);
            
            if (data.sessionId && data.sessionId !== currentSessionId) {
                setCurrentSessionId(data.sessionId);
                fetchSessions(); // Refresh list to show new chat
            }
        } catch (err: any) {
            const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: "Sorry, I had trouble connecting to the network or the AI provider wasn't configured properly.", timestamp: new Date() };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    }

    function copyMessage(id: string, content: string) {
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }

    function formatMessage(content: string) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    return (
        <div className="flex h-[calc(100vh-112px)] overflow-hidden bg-gray-50/50 rounded-2xl border border-gray-100 relative">
            {/* Sidebar toggle button (mobile) */}
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden absolute top-4 left-4 z-20 p-2 bg-white rounded-lg shadow-sm border border-gray-200"
            >
                <MessageSquare className="w-5 h-5 text-gray-600" />
            </button>

            {/* Sidebar */}
            <div className={clsx(
                "absolute md:relative z-10 h-full bg-white border-r border-gray-100 flex flex-col transition-all duration-300 ease-in-out w-72 flex-shrink-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:border-none"
            )}>
                <div className={clsx("flex flex-col h-full", !isSidebarOpen && "md:hidden")}>
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-indigo-500" />
                            Chat History
                        </h2>
                    </div>
                    
                    <div className="p-3">
                        <button 
                            onClick={startNewChat}
                            className="w-full flex items-center gap-2 justify-center py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-medium transition-colors border border-indigo-100/50"
                        >
                            <Plus className="w-4 h-4" />
                            New Chat
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
                        {loadingSessions ? (
                            <div className="flex justify-center p-4">
                                <LogoLoader className="w-5 h-5 animate-spin text-gray-400" />
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="text-center p-4 text-sm text-gray-500">
                                No previous chats
                            </div>
                        ) : (
                            sessions.map((session) => (
                                <div 
                                    key={session.id}
                                    onClick={() => loadSession(session.id)}
                                    className={clsx(
                                        "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors text-sm",
                                        currentSessionId === session.id 
                                            ? "bg-indigo-50/80 text-indigo-700 font-medium" 
                                            : "hover:bg-gray-50 text-gray-700"
                                    )}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <MessageSquare className={clsx("w-4 h-4 flex-shrink-0", currentSessionId === session.id ? "text-indigo-500" : "text-gray-400")} />
                                        <span className="truncate">{session.title}</span>
                                    </div>
                                    <button 
                                        onClick={(e) => deleteSession(e, session.id)}
                                        disabled={deletingId === session.id}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                                    >
                                        {deletingId === session.id ? (
                                            <LogoLoader className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full bg-white relative">
                {/* Desktop sidebar toggle */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="hidden md:flex absolute top-1/2 -left-3 -translate-y-1/2 z-20 w-6 h-12 bg-white border border-gray-200 rounded-r-xl items-center justify-center shadow-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                    {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                <div className="page-header flex items-center justify-between flex-shrink-0 border-b border-gray-100 bg-white md:pl-8 pl-16 py-4 px-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="page-title !mb-0 text-xl font-bold">AI Assistant</h1>
                            <p className="page-subtitle !mt-0.5 text-sm text-gray-500">Ask anything about your workplace</p>
                        </div>
                    </div>
                    <button
                        onClick={startNewChat}
                        className="btn-secondary text-xs hidden md:flex border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg items-center gap-1 font-medium transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> New Chat
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-6 p-4 md:p-6 pb-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={clsx('flex gap-3 md:gap-4 w-full max-w-4xl mx-auto', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                            <div className={clsx(
                                'w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
                                msg.role === 'assistant' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
                            )}>
                                {msg.role === 'assistant' ? <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" /> : <User className="w-4 h-4 md:w-5 md:h-5 text-white" />}
                            </div>
                            <div className={clsx('max-w-[85%] md:max-w-[75%] group flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
                                <div className={clsx(
                                    'rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm',
                                    msg.role === 'assistant'
                                        ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                                        : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-sm'
                                )}>
                                    <div
                                        dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                                        className="prose prose-sm md:prose-base prose-indigo max-w-none"
                                    />
                                </div>
                                <div className={clsx('flex items-center gap-2 mt-1.5 px-1', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                    <span className="text-[11px] font-medium text-gray-400">
                                        {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {msg.role === 'assistant' && (
                                        <button
                                            onClick={() => copyMessage(msg.id, msg.content)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-md"
                                            title="Copy message"
                                        >
                                            {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-4 w-full max-w-4xl mx-auto">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1.5 h-12">
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Bottom Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <div className="max-w-4xl mx-auto">
                        {/* Suggestions */}
                        {messages.length <= 2 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {SUGGESTIONS.map(s => (
                                    <button key={s} onClick={() => send(s)} className="text-[13px] bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 rounded-full px-3.5 py-1.5 transition-all shadow-sm">
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Form */}
                        <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        send();
                                    }
                                }}
                                placeholder="Ask about leave, payroll, tasks, projects..."
                                className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 px-3 max-h-32 min-h-[44px] outline-none"
                                rows={1}
                                disabled={loading}
                            />
                            <button
                                onClick={() => send()}
                                disabled={loading || !input.trim()}
                                className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 h-11 w-11 flex items-center justify-center"
                            >
                                {loading ? <LogoLoader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                            </button>
                        </div>
                        <div className="text-center mt-2 text-[11px] text-gray-400">
                            AI responses may not always be 100% accurate. Please verify important information.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

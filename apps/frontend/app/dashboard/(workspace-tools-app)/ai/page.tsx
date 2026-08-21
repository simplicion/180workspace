'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, User, RefreshCw, Copy, Check, MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight, Menu, X, Paperclip, Scale, XCircle } from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';

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

const LEGAL_WELCOME_MESSAGE: Message = {
    id: '0-legal',
    role: 'assistant',
    content: "**Greetings! ⚖️ I am your AI Legal Counsel.**\n\nEquipped with 15 years of corporate legal expertise. Please upload a contract document or describe the agreement you need drafted, and I will analyze obligations, flag hidden constraints, or formulate templates.",
    timestamp: new Date(),
};

export default function AIAssistantPage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    
    // Sidebar state
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Advanced UI States
    const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
    const [isLegalMode, setIsLegalMode] = useState(false);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Suggestion popup state for mentions
    const [mentionState, setMentionState] = useState<{ active: boolean, type: 'C' | 'E' | 'P' | null, query: string }>({ active: false, type: null, query: '' });
    const [searchResults, setSearchResults] = useState<{ id: string, name: string, subtitle: string }[]>([]);

    useEffect(() => {
        if (mentionState.active && mentionState.type && mentionState.query.length > 0) {
            const timeoutId = setTimeout(async () => {
                try {
                    const { data } = await api.get(`/api/ai/search-entities?type=${mentionState.type}&query=${mentionState.query}`);
                    setSearchResults(data.results || []);
                } catch (e) {
                    setSearchResults([]);
                }
            }, 300);
            return () => clearTimeout(timeoutId);
        } else {
            setSearchResults([]);
        }
    }, [mentionState.active, mentionState.type, mentionState.query]);

    useEffect(() => {
        fetchSessions();
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!currentSessionId) {
            setMessages([isLegalMode ? LEGAL_WELCOME_MESSAGE : INITIAL_MESSAGE]);
        }
    }, [isLegalMode, currentSessionId]);

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
                    setMessages([isLegalMode ? LEGAL_WELCOME_MESSAGE : INITIAL_MESSAGE]);
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
        setMessages([isLegalMode ? LEGAL_WELCOME_MESSAGE : INITIAL_MESSAGE]);
        setAttachedFile(null);
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };

    const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // 25MB check
        if (file.size > 25 * 1024 * 1024) {
            alert('File exceeds the 25MB maximum size limit.');
            return;
        }

        setAttachedFile(file);
        setIsPlusMenuOpen(false);
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);

        // Very basic mention trigger logic
        const match = val.match(/@(C|E|P)\/([a-zA-Z0-9\s]*)$/);
        if (match) {
            setMentionState({ active: true, type: match[1] as 'C'|'E'|'P', query: match[2] });
        } else {
            setMentionState({ active: false, type: null, query: '' });
        }
    };

    async function send(text?: string) {
        const msg = text || input.trim();
        if (!msg && !attachedFile) return;
        
        // Optimistic UI update
        const displayMsg = attachedFile ? `[Attached File: ${attachedFile.name}]\n${msg}` : msg;
        setInput('');
        setMentionState({ active: false, type: null, query: '' });
        setIsPlusMenuOpen(false);
        
        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: displayMsg, timestamp: new Date() };

        const historyToSend = messages.length > 1 
            ? messages.slice(-5).map(m => ({ role: m.role, content: m.content }))
            : [];

        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            let uploadedFileText = '';
            if (attachedFile) {
                const formData = new FormData();
                formData.append('document', attachedFile);
                const uploadRes = await api.post('/api/ai/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                uploadedFileText = uploadRes.data.extractedText;
            }

            const payload = {
                message: msg,
                history: historyToSend,
                sessionId: currentSessionId,
                isLegalMode,
                fileContext: uploadedFileText,
                stream: true
            };

            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', timestamp: new Date() };
            setMessages(prev => [...prev, aiMsg]);

            const token = localStorage.getItem('platform_auth_token');
            const response = await fetch(api.defaults.baseURL + '/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let currentReply = '';
            let finalSessionId = currentSessionId;
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6);
                        if (dataStr.trim() === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.text) {
                                currentReply += parsed.text;
                                setMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, content: currentReply } : m));
                            }
                            if (parsed.sessionId) {
                                finalSessionId = parsed.sessionId;
                            }
                        } catch (e) {
                            console.error("SSE parse error", e);
                        }
                    }
                }
            }
            
            if (finalSessionId && finalSessionId !== currentSessionId) {
                setCurrentSessionId(finalSessionId);
                fetchSessions();
            }

            // Clear file after sending
            setAttachedFile(null);
        } catch (err: any) {
            console.error('Chat error:', err);
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
        <div className="flex h-[calc(100vh-64px)] -m-4 md:-m-6 overflow-hidden bg-white relative">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="absolute inset-0 bg-gray-900/20 z-20 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={clsx(
                "absolute z-30 h-full bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden shadow-xl",
                isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"
            )}>
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-indigo-600" />
                            Chat History
                        </h2>
                        <button 
                            onClick={() => setIsSidebarOpen(false)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            title="Close Sidebar"
                        >
                            <X className="w-4 h-4" />
                        </button>
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
            <div className="flex-1 flex flex-col h-full bg-white relative min-w-0" onClick={() => setIsPlusMenuOpen(false)}>

                <div className="page-header flex items-center justify-between flex-shrink-0 border-b border-gray-100 bg-white py-3 px-4 md:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}
                            className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer z-10 flex items-center justify-center"
                            title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className={clsx("hidden md:flex w-8 h-8 rounded-lg items-center justify-center transition-colors", isLegalMode ? "bg-amber-500" : "bg-gradient-to-br from-indigo-500 to-purple-600")}>
                            {isLegalMode ? <Scale className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
                        </div>
                        <div>
                            <h1 className="page-title !mb-0 text-xl font-bold flex items-center gap-2">
                                AI Assistant
                                {isLegalMode && <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Legal Counsel</span>}
                            </h1>
                            <p className="page-subtitle !mt-0.5 text-sm text-gray-500">
                                {isLegalMode ? "Contract Analysis & Drafting Mode" : "Ask anything about your workplace"}
                            </p>
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
                                'w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden',
                                msg.role === 'assistant' 
                                    ? (isLegalMode ? 'bg-amber-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600') 
                                    : 'bg-white shadow-sm border border-gray-200'
                            )}>
                                {msg.role === 'assistant' 
                                    ? (isLegalMode ? <Scale className="w-4 h-4 md:w-5 md:h-5 text-white" /> : <img src="/white icon.svg" alt="AI" className="w-5 h-5 object-contain" />) 
                                    : (
                                        (user?.photoUrl || (user as any)?.companyLogo || (user as any)?.logoUrl) ? (
                                            <img src={user?.photoUrl || (user as any)?.companyLogo || (user as any)?.logoUrl} alt={user?.name || "User"} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
                                                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                                            </div>
                                        )
                                    )
                                }
                            </div>
                            <div className={clsx('max-w-[85%] md:max-w-[75%] group flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
                                <div className={clsx(
                                    'rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap',
                                    msg.role === 'assistant'
                                        ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                                        : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-sm'
                                )}>
                                    {msg.content.includes('[COMPONENT:Chart]') ? (
                                        <div className="flex flex-col gap-4 w-full">
                                            <div
                                                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content.replace(/\[COMPONENT:Chart\]/g, '')) }}
                                                className="prose prose-sm md:prose-base prose-indigo max-w-none"
                                            />
                                            <div className="w-full h-48 bg-white/50 rounded-xl border border-gray-200 flex items-end justify-around p-4 gap-2 mt-2">
                                                <div className="w-full bg-indigo-400 rounded-t-md hover:bg-indigo-500 transition-colors" style={{ height: '40%' }}></div>
                                                <div className="w-full bg-indigo-500 rounded-t-md hover:bg-indigo-600 transition-colors" style={{ height: '70%' }}></div>
                                                <div className="w-full bg-indigo-300 rounded-t-md hover:bg-indigo-400 transition-colors" style={{ height: '20%' }}></div>
                                                <div className="w-full bg-indigo-600 rounded-t-md hover:bg-indigo-700 transition-colors" style={{ height: '90%' }}></div>
                                                <div className="w-full bg-indigo-400 rounded-t-md hover:bg-indigo-500 transition-colors" style={{ height: '60%' }}></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                                            className="prose prose-sm md:prose-base prose-indigo max-w-none"
                                        />
                                    )}
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
                            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1", isLegalMode ? "bg-amber-500" : "bg-gradient-to-br from-indigo-500 to-purple-600")}>
                                {isLegalMode ? <Scale className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
                            </div>
                            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1.5 h-12">
                                <span className={clsx("w-1.5 h-1.5 rounded-full animate-bounce", isLegalMode ? "bg-amber-400" : "bg-indigo-400")} style={{ animationDelay: '0ms' }} />
                                <span className={clsx("w-1.5 h-1.5 rounded-full animate-bounce", isLegalMode ? "bg-amber-400" : "bg-indigo-400")} style={{ animationDelay: '150ms' }} />
                                <span className={clsx("w-1.5 h-1.5 rounded-full animate-bounce", isLegalMode ? "bg-amber-400" : "bg-indigo-400")} style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Bottom Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <div className="max-w-4xl mx-auto relative">
                        
                        {/* Mention Suggestions Popup */}
                        {mentionState.active && (
                            <div className="absolute bottom-full left-12 mb-2 w-64 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-50">
                                <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                                    <span>
                                        {mentionState.type === 'C' ? 'Tag Client' : (mentionState.type === 'E' ? 'Tag Employee' : 'Tag Project')}
                                    </span>
                                    <span>Type to search...</span>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {searchResults.length === 0 && mentionState.query.length > 0 && (
                                        <div className="p-3 text-sm text-gray-500 text-center">No results found</div>
                                    )}
                                    {searchResults.length === 0 && mentionState.query.length === 0 && (
                                        <div className="p-3 text-sm text-gray-500 text-center">Start typing to search...</div>
                                    )}
                                    {searchResults.map((result) => (
                                        <button 
                                            key={result.id}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 border-b border-gray-50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const replaceTarget = `@${mentionState.type}/${mentionState.query}`;
                                                setInput(input.replace(replaceTarget, `@${mentionState.type}/${result.name} `));
                                                setMentionState({ active: false, type: null, query: '' });
                                            }}
                                        >
                                            <div className="font-semibold text-gray-800">{result.name}</div>
                                            <div className="text-xs text-gray-500">{result.subtitle}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Suggestions */}
                        {messages.length <= 2 && !isLegalMode && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {SUGGESTIONS.map(s => (
                                    <button key={s} onClick={() => send(s)} className="text-[13px] bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 rounded-full px-3.5 py-1.5 transition-all shadow-sm">
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Attached File Chip */}
                        {attachedFile && (
                            <div className="flex items-center gap-2 mb-2 p-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg w-max max-w-full">
                                {attachedFile.type.startsWith('image/') ? (
                                    <img src={URL.createObjectURL(attachedFile)} alt="Preview" className="w-8 h-8 object-cover rounded-md flex-shrink-0 border border-indigo-200" />
                                ) : (
                                    <Paperclip className="w-4 h-4 flex-shrink-0" />
                                )}
                                <span className="text-xs font-medium truncate">{attachedFile.name}</span>
                                <span className="text-[10px] text-indigo-400 font-bold ml-2">({(attachedFile.size / 1024 / 1024).toFixed(1)}MB)</span>
                                <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-indigo-200 rounded-md transition-colors ml-2">
                                    <XCircle className="w-3.5 h-3.5 text-indigo-500" />
                                </button>
                            </div>
                        )}

                        {/* Input Form */}
                        <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all relative">
                            
                            {/* Plus Menu Button */}
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsPlusMenuOpen(!isPlusMenuOpen); }}
                                    className="p-2.5 bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                                    title="Add attachment or switch mode"
                                >
                                    <Plus className={clsx("w-5 h-5 transition-transform", isPlusMenuOpen && "rotate-45")} />
                                </button>

                                {/* Plus Menu Dropdown */}
                                {isPlusMenuOpen && (
                                    <div className="absolute bottom-full left-0 mb-3 w-56 bg-white border border-gray-200 shadow-xl rounded-2xl overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-2" onClick={(e) => e.stopPropagation()}>
                                        <div className="p-2">
                                            <button 
                                                onClick={() => { setIsLegalMode(!isLegalMode); setIsPlusMenuOpen(false); }}
                                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center", isLegalMode ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-600")}>
                                                        <Scale className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-800">Legal Counsel Mode</div>
                                                        <div className="text-xs text-gray-500">{isLegalMode ? "Currently Active" : "Off"}</div>
                                                    </div>
                                                </div>
                                                {isLegalMode && <Check className="w-4 h-4 text-amber-500" />}
                                            </button>
                                            
                                            <div className="h-px bg-gray-100 my-1"></div>

                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                    <Paperclip className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-800">Upload File or Image</div>
                                                    <div className="text-[11px] text-gray-500">PDF, DOCX, TXT, PNG, JPG (Max 25MB)</div>
                                                </div>
                                            </button>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                className="hidden" 
                                                onChange={handleFileAttach}
                                                accept=".pdf,.doc,.docx,.txt,image/*"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <textarea
                                value={input}
                                onChange={handleInput}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        send();
                                    }
                                }}
                                placeholder={isLegalMode ? "Attach a contract or ask legal advice... (Use @C/, @E/, @P/ to mention)" : "Ask about leave, payroll, tasks... (Use @C/, @E/, @P/ to mention)"}
                                className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 px-1 max-h-32 min-h-[44px] outline-none text-gray-700 placeholder-gray-400"
                                rows={1}
                                disabled={loading}
                            />
                            <button
                                onClick={() => send()}
                                disabled={loading || (!input.trim() && !attachedFile)}
                                className={clsx(
                                    "flex-shrink-0 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50 h-11 w-11 flex items-center justify-center",
                                    isLegalMode ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                                )}
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

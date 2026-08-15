'use client';

import React, { useState } from 'react';
import { Send, User, Bot, Paperclip, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ChatPage() {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { sender: 'bot', text: 'Hello! I am the 180workspace Support Assistant. How can I help you today?', time: '10:00 AM' }
    ]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        
        setChatHistory([...chatHistory, { sender: 'user', text: message, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
        setMessage('');
        
        // Simulate bot response
        setTimeout(() => {
            setChatHistory(prev => [...prev, { 
                sender: 'bot', 
                text: 'Thank you for your message. An agent will be with you shortly. In the meantime, you can check our documentation for quick answers.', 
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
            }]);
        }, 1000);
    };

    return (
        <div className="w-full max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="mb-6">
                <Link href="/dashboard/help-support" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4">
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Back to Help & Support
                </Link>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Live Support</h1>
                <p className="text-gray-500 mt-2">Chat directly with our customer care team.</p>
            </div>

            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <div className="relative">
                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                <Bot className="h-5 w-5" />
                            </div>
                            <span className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                        </div>
                        <div>
                            <div className="font-semibold text-gray-900">Support Agent</div>
                            <div className="text-xs font-normal text-emerald-600">Online - Replies typically in 5 mins</div>
                        </div>
                    </h3>
                </div>
                
                <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50 space-y-6">
                    <div className="text-center text-xs text-gray-400 mb-6">Today, 10:00 AM</div>
                    
                    {chatHistory.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-gray-200 text-gray-600 ml-3' : 'bg-blue-100 text-blue-600 mr-3'}`}>
                                    {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                </div>
                                <div>
                                    <div className={`px-4 py-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'}`}>
                                        <p className="text-sm leading-relaxed">{msg.text}</p>
                                    </div>
                                    <div className={`text-[10px] text-gray-400 mt-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                        {msg.time}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="p-4 bg-white border-t border-gray-50">
                    <form onSubmit={handleSend} className="w-full relative flex items-center gap-2">
                        <button type="button" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                            <Paperclip className="h-5 w-5" />
                        </button>
                        <input 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message..." 
                            className="flex-1 border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded-full px-4 h-11"
                        />
                        <button 
                            type="submit" 
                            disabled={!message.trim()}
                            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors h-11 w-11 flex items-center justify-center shrink-0"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}


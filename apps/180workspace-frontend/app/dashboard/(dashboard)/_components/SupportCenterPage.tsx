'use client';

import React from 'react';
import { ArrowLeft, Search, Clock, MessageSquare, ShieldAlert, CreditCard, RefreshCcw, ChevronRight, AlertOctagon, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

export default function SupportCenterPage() {
    const router = useRouter();

    const commonIssues = [
        { id: 1, title: 'Project Delivery Delayed', icon: Clock },
        { id: 2, title: 'Milestone Dispute', icon: MessageSquare },
        { id: 3, title: 'Quality Not as Expected', icon: ShieldAlert },
        { id: 4, title: 'Payment & Escrow Issues', icon: CreditCard },
        { id: 5, title: 'Refunds & Cancellations', icon: RefreshCcw }
    ];

    return (
        <div className="max-w-2xl mx-auto min-h-screen bg-white pb-10">
            {/* Header */}
            <header className="flex items-center p-6 mb-2">
                <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-900" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 ml-2">Support Center</h1>
            </header>

            <main className="px-6 space-y-8">
                {/* Hero Section */}
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">How can we help you?</h2>
                    <p className="text-gray-500 font-medium">We&apos;re here to resolve any issue quickly.</p>
                </div>

                {/* Search Bar */}
                <div className="relative flex items-center">
                    <input 
                        type="text" 
                        placeholder="Search help articles..." 
                        className="w-full pl-5 pr-14 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-gray-900 placeholder:text-gray-400 outline-none"
                    />
                    <button className="absolute right-2 p-2.5 bg-blue-600 hover:bg-blue-700 transition-colors rounded-xl text-white">
                        <Search className="w-5 h-5" />
                    </button>
                </div>

                {/* Common Issues */}
                <div>
                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Common Issues</h3>
                    <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-sm">
                        {commonIssues.map((issue) => (
                            <button 
                                key={issue.id}
                                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors text-left group"
                            >
                                <div className="flex items-center gap-4">
                                    <issue.icon className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" strokeWidth={2.5} />
                                    <span className="font-bold text-sm text-gray-700 group-hover:text-gray-900">{issue.title}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Action Cards Grid */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                    {/* Raise Dispute */}
                    <button className="bg-rose-50 hover:bg-rose-100 transition-colors rounded-2xl p-5 text-left group">
                        <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform shadow-sm shadow-rose-200">
                            <AlertOctagon className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-rose-900 mb-1">Raise a Dispute</h4>
                        <p className="text-xs font-medium text-rose-700/80 leading-relaxed">Get our team involved</p>
                    </button>

                    {/* Chat with Support */}
                    <button className="bg-blue-50 hover:bg-blue-100 transition-colors rounded-2xl p-5 text-left group">
                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform shadow-sm shadow-blue-200">
                            <MessageCircle className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-blue-900 mb-1">Chat with Support</h4>
                        <p className="text-xs font-medium text-blue-700/80 leading-relaxed">We usually reply in minutes</p>
                    </button>
                </div>
            </main>
        </div>
    );
}

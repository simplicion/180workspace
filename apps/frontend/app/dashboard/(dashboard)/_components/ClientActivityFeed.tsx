'use client';

import React from 'react';
import { Users, UploadCloud, CheckSquare, MessageCircle, FileText, ArrowRightCircle } from 'lucide-react';
import clsx from 'clsx';

// Mock data for client activities
const MOCK_CLIENT_ACTIVITIES = [
    {
        id: '1',
        client: 'Acme Corp',
        action: 'uploaded a new document',
        target: 'Q3 Financials.pdf',
        time: '15 mins ago',
        icon: <UploadCloud className="w-4 h-4 text-blue-500" />,
        bgClass: 'bg-blue-50 text-blue-600',
    },
    {
        id: '2',
        client: 'Stark Industries',
        action: 'approved milestone',
        target: 'Phase 1 Delivery',
        time: '1 hr ago',
        icon: <CheckSquare className="w-4 h-4 text-emerald-500" />,
        bgClass: 'bg-emerald-50 text-emerald-600',
    },
    {
        id: '3',
        client: 'Wayne Enterprises',
        action: 'sent a new message',
        target: 'Regarding project timeline',
        time: '3 hrs ago',
        icon: <MessageCircle className="w-4 h-4 text-purple-500" />,
        bgClass: 'bg-purple-50 text-purple-600',
    },
    {
        id: '4',
        client: 'Daily Planet',
        action: 'signed contract',
        target: 'Annual Retainer 2024',
        time: 'Yesterday',
        icon: <FileText className="w-4 h-4 text-indigo-500" />,
        bgClass: 'bg-indigo-50 text-indigo-600',
    },
    {
        id: '5',
        client: 'LexCorp',
        action: 'requested changes on',
        target: 'Design Concepts',
        time: 'Yesterday',
        icon: <ArrowRightCircle className="w-4 h-4 text-orange-500" />,
        bgClass: 'bg-orange-50 text-orange-600',
    }
];

export default function ClientActivityFeed() {
    return (
        <div className="card overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xs font-bold flex items-center gap-2 text-gray-400 uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5" /> Client Activity
                </h2>
                <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-blue-50 text-blue-600 rounded-full">
                    {MOCK_CLIENT_ACTIVITIES.length} Updates
                </span>
            </div>

            {/* Feed List */}
            <div className="p-5">
                <div className="space-y-4">
                    {MOCK_CLIENT_ACTIVITIES.map((activity) => (
                        <div key={activity.id} className="flex gap-4 p-3 hover:bg-gray-50/80 rounded-xl transition-colors group">
                            {/* Icon */}
                            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-transparent group-hover:border-white/50 shadow-sm", activity.bgClass)}>
                                {activity.icon}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm text-gray-900 font-bold truncate">
                                        {activity.client}
                                    </p>
                                    <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap pt-0.5">
                                        {activity.time}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {activity.action} <span className="font-semibold text-gray-700">{activity.target}</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/30 text-center">
                <button className="text-[11px] font-bold text-gray-500 hover:text-blue-600 transition-colors">
                    View Client Hub
                </button>
            </div>
        </div>
    );
}

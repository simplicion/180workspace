'use client';

import React from 'react';
import { Activity, CheckCircle2, MessageSquare, PlusCircle, Calendar, RefreshCcw } from 'lucide-react';
import clsx from 'clsx';

// Mock data for the live activity feed since we are building UI first
const MOCK_ACTIVITIES = [
    {
        id: '1',
        user: { name: 'Alex', initials: 'AL' },
        action: 'completed a task',
        target: 'Design Homepage Mockup',
        time: '10:15 AM',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        bgClass: 'bg-emerald-50 text-emerald-600',
    },
    {
        id: '2',
        user: { name: 'Priya', initials: 'PR' },
        action: 'created a new project',
        target: 'Website Redesign',
        time: '09:42 AM',
        icon: <PlusCircle className="w-4 h-4 text-indigo-500" />,
        bgClass: 'bg-indigo-50 text-indigo-600',
    },
    {
        id: '3',
        user: { name: 'System', initials: 'SY' },
        action: 'scheduled a meeting for',
        target: 'Team Sync',
        time: '09:00 AM',
        icon: <Calendar className="w-4 h-4 text-blue-500" />,
        bgClass: 'bg-blue-50 text-blue-600',
    },
    {
        id: '4',
        user: { name: 'Rahul', initials: 'RA' },
        action: 'commented on',
        target: 'Q3 Marketing Strategy',
        time: 'Yesterday',
        icon: <MessageSquare className="w-4 h-4 text-amber-500" />,
        bgClass: 'bg-amber-50 text-amber-600',
    },
    {
        id: '5',
        user: { name: 'Aman', initials: 'AM' },
        action: 'updated milestone in',
        target: 'Mobile App Build',
        time: 'Yesterday',
        icon: <RefreshCcw className="w-4 h-4 text-purple-500" />,
        bgClass: 'bg-purple-50 text-purple-600',
    }
];

export default function LiveActivityFeed() {
    return (
        <div className="card overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xs font-bold flex items-center gap-2 text-gray-400 uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5" /> Team Activity
                </h2>
                <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Live</span>
                </div>
            </div>

            {/* Feed List */}
            <div className="p-5">
                <div className="relative border-l-2 border-gray-100 ml-3 space-y-6">
                    {MOCK_ACTIVITIES.map((activity) => (
                        <div key={activity.id} className="relative pl-6">
                            {/* Timeline Node */}
                            <div className={clsx("absolute -left-[13px] top-1 h-6 w-6 rounded-full border-2 border-white flex items-center justify-center", activity.bgClass)}>
                                {activity.icon}
                            </div>
                            
                            {/* Content */}
                            <div className="bg-gray-50/50 hover:bg-gray-50 transition-colors p-3 rounded-xl border border-gray-100">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600">
                                            {activity.user.initials}
                                        </div>
                                        <p className="text-xs text-gray-700">
                                            <span className="font-bold text-gray-900">{activity.user.name}</span> {activity.action}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap">
                                        {activity.time}
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-indigo-600 ml-7">
                                    {activity.target}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/30 text-center">
                <button className="text-[11px] font-bold text-gray-500 hover:text-indigo-600 transition-colors">
                    View All Activity
                </button>
            </div>
        </div>
    );
}

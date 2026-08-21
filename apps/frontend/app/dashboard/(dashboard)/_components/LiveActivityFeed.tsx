'use client';

import React from 'react';
import { Activity, CheckCircle2, MessageSquare, PlusCircle, Calendar, RefreshCcw, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useGetLiveActivityQuery } from '@/redux/api/dashboardApi';

interface ActivityLog {
    id: string;
    actionType: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: string;
    actor: {
        firstName: string;
        lastName: string;
        email: string;
        profilePictureUrl: string | null;
    };
}

// Keep mock data as fallback or while loading
const FALLBACK_ACTIVITIES = [
    {
        id: '1',
        user: { name: 'System', initials: 'SY' },
        action: 'initialized the team activity feed',
        target: 'System',
        time: 'Just now',
        icon: <Activity className="w-4 h-4 text-emerald-500" />,
        bgClass: 'bg-emerald-50 text-emerald-600',
    }
];

export default function LiveActivityFeed() {
    const { data: response, isLoading: loading } = useGetLiveActivityQuery(undefined, {
        pollingInterval: 30000,
    });
    
    const activities: ActivityLog[] = response?.activities || [];

    const getIconForAction = (actionType: string) => {
        const type = actionType.toLowerCase();
        if (type.includes('create') || type.includes('add')) return <PlusCircle className="w-4 h-4 text-indigo-500" />;
        if (type.includes('complete') || type.includes('finish')) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        if (type.includes('comment') || type.includes('message')) return <MessageSquare className="w-4 h-4 text-amber-500" />;
        if (type.includes('schedule') || type.includes('meeting')) return <Calendar className="w-4 h-4 text-blue-500" />;
        return <RefreshCcw className="w-4 h-4 text-purple-500" />;
    };

    const getBgClassForAction = (actionType: string) => {
        const type = actionType.toLowerCase();
        if (type.includes('create') || type.includes('add')) return 'bg-indigo-50 text-indigo-600';
        if (type.includes('complete') || type.includes('finish')) return 'bg-emerald-50 text-emerald-600';
        if (type.includes('comment') || type.includes('message')) return 'bg-amber-50 text-amber-600';
        if (type.includes('schedule') || type.includes('meeting')) return 'bg-blue-50 text-blue-600';
        return 'bg-purple-50 text-purple-600';
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 172800) return 'Yesterday';
        return date.toLocaleDateString();
    };

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
                {loading ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                    </div>
                ) : activities.length === 0 ? (
                    <div className="relative border-l-2 border-gray-100 ml-3 space-y-6">
                        {FALLBACK_ACTIVITIES.map((activity) => (
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
                ) : (
                    <div className="relative border-l-2 border-gray-100 ml-3 space-y-6">
                        {activities.map((activity) => (
                            <div key={activity.id} className="relative pl-6">
                                {/* Timeline Node */}
                                <div className={clsx("absolute -left-[13px] top-1 h-6 w-6 rounded-full border-2 border-white flex items-center justify-center", getBgClassForAction(activity.actionType))}>
                                    {getIconForAction(activity.actionType)}
                                </div>
                                
                                {/* Content */}
                                <div className="bg-gray-50/50 hover:bg-gray-50 transition-colors p-3 rounded-xl border border-gray-100">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            {activity.actor?.profilePictureUrl ? (
                                                <img src={activity.actor.profilePictureUrl} alt={activity.actor.firstName} className="w-5 h-5 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                                                    {(activity.actor?.firstName?.[0] || '') + (activity.actor?.lastName?.[0] || '')}
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-700">
                                                <span className="font-bold text-gray-900">{activity.actor?.firstName} {activity.actor?.lastName}</span> {activity.actionType.toLowerCase().replace(/_/g, ' ')}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap">
                                            {formatTime(activity.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-indigo-600 ml-7">
                                        {activity.entityType || 'Record'} {activity.entityId ? `#${activity.entityId.substring(0, 5)}` : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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

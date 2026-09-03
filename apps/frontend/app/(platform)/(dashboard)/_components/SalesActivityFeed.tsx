'use client';

import React, { useEffect, useState } from 'react';
import { Users, FileText, CheckSquare, ArrowRightCircle, RefreshCcw, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface SalesActivity {
    id: string;
    client: string;
    action: string;
    target: string;
    time: string;
    type: string;
}

const SalesActivityFeed: React.FC<{ isLocked?: boolean }> = ({ isLocked: isLockedProp }) => {
    const [activities, setActivities] = useState<SalesActivity[]>([]);
    const [isLoading, setIsLoading] = useState(!isLockedProp);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLocked, setIsLocked] = useState(isLockedProp || false);

    const fetchActivities = async (refresh = false) => {
        if (isLockedProp) return;
        try {
            if (refresh) setIsRefreshing(true);
            const response = await api.get('/api/v1/crm-and-sales/sales/activity');
            setActivities(response.data || []);
        } catch (error: any) {
            if (error.response?.status === 403) {
                setIsLocked(true);
            }
            console.error('Failed to fetch sales activity:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (isLockedProp) return;
        fetchActivities();
        const interval = setInterval(() => fetchActivities(), 30000); // 30s polling
        return () => clearInterval(interval);
    }, [isLockedProp]);

    const getIcon = (type: string) => {
        if (type === 'lead') return <Users className="w-4 h-4 text-blue-500" />;
        if (type === 'deal') return <CheckSquare className="w-4 h-4 text-emerald-500" />;
        return <FileText className="w-4 h-4 text-indigo-500" />;
    };

    const getBgClass = (type: string) => {
        if (type === 'lead') return 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400';
        if (type === 'deal') return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400';
        return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400';
    };

    if (isLocked && !isLockedProp) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col h-[380px]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-none mb-1">Sales Activity</h3>
                    <p className="text-[11px] text-zinc-400 font-medium">Live updates from clients and lead interactions</p>
                </div>
                <button 
                    onClick={() => fetchActivities(true)}
                    disabled={isRefreshing}
                    title="Refresh activities"
                    className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
                >
                    <RefreshCcw className={clsx("w-3.5 h-3.5", isRefreshing && "animate-spin text-indigo-500")} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 min-h-0 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-3">
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-300 dark:text-zinc-600" />
                        <span className="text-xs">Loading activity...</span>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-2">
                        <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                        </div>
                        <span className="text-xs font-medium text-zinc-400">No recent sales activity</span>
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {activities.map((activity) => (
                            <li
                                key={activity.id}
                                className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                            >
                                <div className={clsx("mt-0.5 p-2 rounded-lg shrink-0", getBgClass(activity.type))}>
                                    {getIcon(activity.type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-snug">
                                        <span className="font-bold text-zinc-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer truncate inline-block max-w-[140px] align-bottom">
                                            {activity.client}
                                        </span>{' '}
                                        <span className="text-zinc-500 dark:text-zinc-400">{activity.action}</span>{' '}
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate inline-block max-w-[140px] align-bottom">{activity.target}</span>
                                    </p>
                                    <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1.5 font-medium">
                                        <span>{activity.time ? formatDistanceToNow(new Date(activity.time), { addSuffix: true }) : 'Just now'}</span>
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                <Link 
                    href="/sales/leads-pipeline"
                    className="w-full py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                    View CRM Dashboard
                    <ArrowRightCircle className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
};

export default SalesActivityFeed;

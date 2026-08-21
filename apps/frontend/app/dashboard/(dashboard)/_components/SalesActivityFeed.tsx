'use client';

import React, { useEffect, useState } from 'react';
import { Users, CheckSquare, FileText, ArrowRightCircle, RefreshCcw, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface SalesActivity {
    id: string;
    client: string;
    action: string;
    target: string;
    time: string;
    type: string;
}

const SalesActivityFeed: React.FC = () => {
    const [activities, setActivities] = useState<SalesActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchActivities = async (refresh = false) => {
        try {
            if (refresh) setIsRefreshing(true);
            const response = await api.get('/api/v1/crm-and-sales/sales/activity');
            setActivities(response.data || []);
        } catch (error) {
            console.error('Failed to fetch sales activity:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchActivities();
        const interval = setInterval(() => fetchActivities(), 30000); // 30s polling
        return () => clearInterval(interval);
    }, []);

    const getIcon = (type: string) => {
        if (type === 'lead') return <Users className="w-4 h-4 text-blue-500" />;
        if (type === 'deal') return <CheckSquare className="w-4 h-4 text-emerald-500" />;
        return <FileText className="w-4 h-4 text-indigo-500" />;
    };

    const getBgClass = (type: string) => {
        if (type === 'lead') return 'bg-blue-50 text-blue-600';
        if (type === 'deal') return 'bg-emerald-50 text-emerald-600';
        return 'bg-indigo-50 text-indigo-600';
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm flex flex-col h-[400px]">
            {/* Header */}
            <div className="p-5 border-b border-gray-100/80 flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 leading-none mb-1">Sales Activity</h3>
                    <p className="text-sm text-gray-500">Live updates from clients</p>
                </div>
                <button 
                    onClick={() => fetchActivities(true)}
                    disabled={isRefreshing}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors disabled:opacity-50"
                >
                    <RefreshCcw className={clsx("w-4 h-4", isRefreshing && "animate-spin")} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 min-h-0 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                        <span className="text-sm">Loading activity...</span>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-gray-300" />
                        </div>
                        <span className="text-sm font-medium text-gray-500">No recent sales activity</span>
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {activities.map((activity) => (
                            <li
                                key={activity.id}
                                className="group flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                <div className={clsx("mt-0.5 p-2 rounded-lg shrink-0", getBgClass(activity.type))}>
                                    {getIcon(activity.type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-gray-900 leading-snug">
                                        <span className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer truncate inline-block max-w-[120px] align-bottom">
                                            {activity.client}
                                        </span>{' '}
                                        <span className="text-gray-600">{activity.action}</span>{' '}
                                        <span className="font-medium text-gray-900 truncate inline-block max-w-[120px] align-bottom">{activity.target}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                                        <span>{activity.time ? formatDistanceToNow(new Date(activity.time), { addSuffix: true }) : 'Just now'}</span>
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100/80 shrink-0">
                <button className="w-full py-2.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 rounded-xl transition-colors flex items-center justify-center gap-2">
                    View CRM Dashboard
                    <ArrowRightCircle className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default SalesActivityFeed;

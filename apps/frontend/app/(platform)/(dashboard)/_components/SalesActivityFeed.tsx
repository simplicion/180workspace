'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
    Users, 
    FileText, 
    CheckSquare, 
    ArrowRightCircle, 
    RefreshCcw, 
    Loader2, 
    Briefcase, 
    Sparkles, 
    DollarSign, 
    TrendingUp, 
    ChevronRight, 
    Building2,
    Calendar,
    PhoneCall,
    CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useSettings } from '@/lib/settings-context';
import { useRouter } from 'next/navigation';

export interface SalesActivityItem {
    id: string;
    actor: string;
    actorAvatar?: string | null;
    action: string;
    target: string;
    client: string;
    value?: number | null;
    stage?: string | null;
    stageLabel?: string | null;
    type: string;
    time: string;
}

type FilterType = 'all' | 'deals' | 'leads';

const SalesActivityFeed: React.FC<{ isLocked?: boolean }> = ({ isLocked: isLockedProp }) => {
    const { company } = useSettings();
    const router = useRouter();
    const currencySymbol = company?.currencySymbol || '₹';

    const [activities, setActivities] = useState<SalesActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(!isLockedProp);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLocked, setIsLocked] = useState(isLockedProp || false);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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
        const interval = setInterval(() => fetchActivities(), 30000); // 30s live polling
        return () => clearInterval(interval);
    }, [isLockedProp]);

    const filteredActivities = useMemo(() => {
        if (activeFilter === 'deals') {
            return activities.filter(a => a.type === 'deal' || a.type === 'stage_change' || a.type === 'conversion');
        }
        if (activeFilter === 'leads') {
            return activities.filter(a => a.type === 'lead' || a.type === 'lead_created' || a.type === 'note');
        }
        return activities;
    }, [activities, activeFilter]);

    const getEventBadge = (type: string, stage?: string | null) => {
        if (type === 'conversion' || stage === 'ClosedWon' || stage === 'ClosedPaid') {
            return {
                icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
                label: 'Won & Converted'
            };
        }
        if (type === 'stage_change' || stage === 'ContractSigned') {
            return {
                icon: <Briefcase className="w-3.5 h-3.5" />,
                bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/60',
                label: 'Contract Signed'
            };
        }
        if (stage === 'InDelivery') {
            return {
                icon: <TrendingUp className="w-3.5 h-3.5" />,
                bg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/60',
                label: 'In Delivery'
            };
        }
        if (type === 'lead' || type === 'lead_created') {
            return {
                icon: <Users className="w-3.5 h-3.5" />,
                bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/60',
                label: 'New Lead'
            };
        }
        return {
            icon: <FileText className="w-3.5 h-3.5" />,
            bg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200/80 dark:border-purple-800/60',
            label: 'Sales Milestone'
        };
    };

    if (isLocked && !isLockedProp) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-sm flex flex-col h-[440px] overflow-hidden">
            {/* Header with Title & Filter Controls */}
            <div className="p-4 sm:px-5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col gap-3 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="relative flex items-center justify-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/40 absolute animate-ping" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-none">
                                    Sales Activity
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50">
                                    Live Stream
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                                Real-time deal closures, contract milestones & client interactions
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={() => fetchActivities(true)}
                        disabled={isRefreshing}
                        title="Refresh activity feed"
                        className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCcw className={clsx("w-3.5 h-3.5", isRefreshing && "animate-spin text-indigo-500")} />
                    </button>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={clsx(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                            activeFilter === 'all'
                                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                        )}
                    >
                        All ({activities.length})
                    </button>
                    <button
                        onClick={() => setActiveFilter('deals')}
                        className={clsx(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                            activeFilter === 'deals'
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                        )}
                    >
                        <Briefcase className="w-3 h-3" />
                        <span>Deals & Execution</span>
                    </button>
                    <button
                        onClick={() => setActiveFilter('leads')}
                        className={clsx(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                            activeFilter === 'leads'
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                        )}
                    >
                        <Users className="w-3 h-3" />
                        <span>Leads & Inquiries</span>
                    </button>
                </div>
            </div>

            {/* Activities List */}
            <div className="flex-1 overflow-y-auto p-3 min-h-0 divide-y divide-zinc-100 dark:divide-zinc-800/50 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-3">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        <span className="text-xs font-medium">Gathering latest sales activity...</span>
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-2 py-8">
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400">
                            <Sparkles className="w-6 h-6 stroke-[1.5]" />
                        </div>
                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No activities found</p>
                        <p className="text-[11px] text-zinc-400 text-center max-w-[240px]">
                            {activeFilter === 'all' 
                                ? 'Sales activities will show up here as your team interacts with leads and manages deals.' 
                                : `No items currently match the "${activeFilter}" filter.`}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredActivities.map((activity) => {
                            const badge = getEventBadge(activity.type, activity.stage);
                            const isDeal = activity.type === 'deal' || activity.type === 'stage_change' || activity.type === 'conversion';
                            const destinationUrl = isDeal ? '/sales/deals' : '/sales/leads-pipeline';

                            return (
                                <div
                                    key={activity.id}
                                    onClick={() => router.push(destinationUrl)}
                                    className="group flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-all cursor-pointer border border-transparent hover:border-zinc-200/60 dark:hover:border-zinc-700/50"
                                >
                                    {/* Actor Avatar / Event Icon */}
                                    <div className="relative shrink-0 mt-0.5">
                                        {activity.actorAvatar ? (
                                            <img
                                                src={activity.actorAvatar}
                                                alt={activity.actor}
                                                className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shadow-2xs"
                                                onError={(e) => {
                                                    (e.target as HTMLElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white text-xs font-bold flex items-center justify-center shadow-2xs">
                                                {activity.actor ? activity.actor.charAt(0).toUpperCase() : 'S'}
                                            </div>
                                        )}
                                        <span className={clsx(
                                            "absolute -bottom-1 -right-1 p-0.5 rounded-full border border-white dark:border-zinc-900 shadow-xs",
                                            badge.bg
                                        )}>
                                            {badge.icon}
                                        </span>
                                    </div>

                                    {/* Activity Details */}
                                    <div className="min-w-0 flex-1">
                                        {/* Row 1: Actor, Action & Time */}
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-tight">
                                                <span className="font-bold text-zinc-900 dark:text-white">
                                                    {activity.actor}
                                                </span>{' '}
                                                <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                                                    {activity.action}
                                                </span>
                                            </p>
                                            <span className="text-[10px] text-zinc-400 shrink-0 font-medium font-mono">
                                                {activity.time ? formatDistanceToNow(new Date(activity.time), { addSuffix: true }) : 'Just now'}
                                            </span>
                                        </div>

                                        {/* Row 2: Target / Requirement Title */}
                                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-1 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {activity.target}
                                        </p>

                                        {/* Row 3: Metadata Badges (Client, Stage, Deal Value) */}
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                            {/* Client Name Badge */}
                                            {activity.client && activity.client !== 'Client' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                                                    <Building2 className="w-3 h-3 text-zinc-400" />
                                                    <span className="truncate max-w-[120px]">{activity.client}</span>
                                                </span>
                                            )}

                                            {/* Stage Label Badge */}
                                            {activity.stageLabel && (
                                                <span className={clsx(
                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-2xs",
                                                    badge.bg
                                                )}>
                                                    <span>{activity.stageLabel}</span>
                                                </span>
                                            )}

                                            {/* Valuation Badge */}
                                            {activity.value && activity.value > 0 ? (
                                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 font-mono ml-auto">
                                                    <span>{currencySymbol}{activity.value.toLocaleString()}</span>
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    {/* Action Arrow */}
                                    <div className="self-center pl-1 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer with Direct Pipeline Navigation */}
            <div className="p-3 bg-zinc-50/70 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 shrink-0">
                <Link 
                    href="/sales/deals"
                    className="flex-1 py-1.5 px-3 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all border border-zinc-200/60 dark:border-zinc-800 shadow-2xs flex items-center justify-center gap-1.5 text-center"
                >
                    <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Active Deals Pipeline</span>
                </Link>

                <Link 
                    href="/sales/leads-pipeline"
                    className="flex-1 py-1.5 px-3 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-all border border-zinc-200/60 dark:border-zinc-800 shadow-2xs flex items-center justify-center gap-1.5 text-center"
                >
                    <Users className="w-3.5 h-3.5 text-amber-500" />
                    <span>Leads Pipeline</span>
                </Link>
            </div>
        </div>
    );
};

export default SalesActivityFeed;

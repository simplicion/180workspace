'use client';

import React from 'react';
import { TrendingUp, Users, Target, PhoneCall, ChevronRight, AlertCircle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from "@workspace/ui";
import { useGetDashboardStatsQuery } from '@/redux/api/dashboardApi';

export default function SalesOverview({ isLocked }: { isLocked?: boolean }) {
    const { data: response, isLoading: loading, isFetching } = useGetDashboardStatsQuery(undefined, {
        skip: isLocked,
        pollingInterval: 30000, // Poll every 30 seconds
    });
    const data = response?.data;

    const newLeads = data?.metrics?.pendingLeads || 0;
    const processingLeads = data?.metrics?.activeLeads || 0;
    const ongoingDeals = data?.metrics?.activeOpportunities || 0;
    const conversionRate = data?.funnel?.dealWinRate || 0;
    const recentActivity = data?.recentActivities || [];
    const hotLeadsCount = data?.anomalies?.length || 0;

    return (
        <div className="card overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            Sales Pipeline
                            {!loading && (
                                <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-emerald-50 text-emerald-600 rounded-full flex items-center gap-1">
                                    <ArrowUpRight className="w-3 h-3" /> {conversionRate}% Conversion
                                </span>
                            )}
                        </h3>
                        <p className="text-[11px] text-gray-400 font-medium">Real-time sales health and urgent actions</p>
                    </div>
                </div>
                <Link 
                    href="/dashboard/crm" 
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors self-start sm:self-auto border border-transparent hover:border-blue-100"
                >
                    View CRM <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            <div className="p-5">
                {/* Insights / Pipeline Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">New Leads</p>
                        <div className="flex items-baseline gap-2">
                            {loading ? <Skeleton className="h-6 w-12" /> : <span className="text-xl font-black text-gray-900">{newLeads}</span>}
                        </div>
                    </div>
                    
                    <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100/50">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Processing</p>
                        <div className="flex items-baseline gap-2">
                            {loading ? <Skeleton className="h-6 w-12" /> : <span className="text-xl font-black text-gray-900">{processingLeads}</span>}
                        </div>
                    </div>

                    <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Ongoing Deals</p>
                        <div className="flex items-baseline gap-2">
                            {loading ? <Skeleton className="h-6 w-12" /> : <span className="text-xl font-black text-gray-900">{ongoingDeals}</span>}
                        </div>
                    </div>
                </div>

                {/* Valuable Insights / Urgent Action */}
                <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-blue-600" /> Actionable Insights (Client Activity)
                        </h4>
                        {!loading && hotLeadsCount > 0 && (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">
                                {hotLeadsCount} Urgent Actions
                            </span>
                        )}
                    </div>
                    
                    <div className="space-y-2.5">
                        {loading ? (
                            <div className="space-y-3 mt-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-2">
                                        <Skeleton className="w-2 h-2 rounded-full mt-1" />
                                        <div className="space-y-2 w-full">
                                            <Skeleton className="h-3 w-full" />
                                            <Skeleton className="h-2 w-24" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : recentActivity.length === 0 ? (
                            <div className="py-4 text-center">
                                <p className="text-xs text-gray-500 font-medium">No recent client activities found.</p>
                            </div>
                        ) : (
                            recentActivity.slice(0, 4).map((activity: any) => {
                                const isUrgent = activity.type === 'call_missed' || activity.type === 'email_bounced';
                                const clientName = activity.relatedClient?.name || activity.lead?.title || activity.deal?.companyName || 'Client';
                                const text = `${clientName}: ${activity.title || activity.type?.replace(/_/g, ' ')}`;
                                return (
                                    <div key={activity.id} className="flex items-start gap-2.5">
                                        <div className={`mt-0.5 w-1.5 h-1.5 rounded-full ${isUrgent ? 'bg-rose-500' : 'bg-blue-400'}`} />
                                        <div className="flex-1">
                                            <p className={`text-xs font-medium ${isUrgent ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>
                                                {text}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                                {formatDistanceToNow(new Date(activity.timestamp || activity.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        {isUrgent && (
                                            <button className="text-[10px] font-bold bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-50 transition-colors shrink-0">
                                                Follow Up
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

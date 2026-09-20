'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
    Calendar, CheckCircle2, Clock, AlertTriangle, AlertCircle, 
    Sparkles, ArrowRight, MessageSquare, Send, CheckSquare, 
    Instagram, Linkedin, Youtube, Film, Eye, ChevronRight
} from 'lucide-react';
import { socialProjectService, DashboardMetrics, AttentionItem, SocialProject } from '@/lib/services/social-project.service';
import { UniversalSkeleton } from '@workspace/ui';
import toast from 'react-hot-toast';

interface OverviewTabProps {
    project: SocialProject;
    onSelectPost: (post: any) => void;
    onNavigateTab: (tabId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ project, onSelectPost, onNavigateTab }) => {
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<{
        metrics: DashboardMetrics;
        attentionItems: AttentionItem[];
        upcomingContent: any[];
    } | null>(null);
    const [activityEvents, setActivityEvents] = useState<any[]>([]);

    useEffect(() => {
        const loadOverview = async () => {
            try {
                setLoading(true);
                const [dash, act] = await Promise.all([
                    socialProjectService.getProjectDashboard(project.id),
                    socialProjectService.getProjectActivity(project.id, 10)
                ]);
                setDashboardData(dash);
                setActivityEvents(act);
            } catch (err: any) {
                toast.error('Failed to load project dashboard data');
            } finally {
                setLoading(false);
            }
        };
        loadOverview();
    }, [project.id]);

    if (loading || !dashboardData) {
        return (
            <div className="space-y-6">
                <UniversalSkeleton type="financial" />
                <UniversalSkeleton type="metrics" />
            </div>
        );
    }

    const { metrics, attentionItems, upcomingContent } = dashboardData;

    return (
        <div className="space-y-8">
            {/* Attention Required Banner */}
            {attentionItems.length > 0 && (
                <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Action Required ({attentionItems.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {attentionItems.map((item) => (
                            <div
                                key={item.id}
                                className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-3 shadow-sm"
                            >
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title}</h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                                </div>
                                <button
                                    onClick={() => onNavigateTab(item.actionLink.split('tab=')[1] || 'overview')}
                                    className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm transition whitespace-nowrap"
                                >
                                    Resolve
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top 4 Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-xs font-medium">Scheduled This Week</span>
                        <Calendar className="w-4 h-4 text-indigo-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                        {metrics.postsScheduledThisWeek}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Ready for automated dispatch</p>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-xs font-medium">Awaiting Approval</span>
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-amber-500">
                        {metrics.postsAwaitingApproval}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Client review pending</p>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-xs font-medium">Editing In Progress</span>
                        <Film className="w-4 h-4 text-sky-500" />
                    </div>
                    <p className="text-2xl font-black text-sky-500">
                        {metrics.editingTasksInProgress}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">180 Media Studio tasks</p>
                </div>

                <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-xs font-medium">Published This Month</span>
                        <Send className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-emerald-500">
                        {metrics.postsPublishedThisMonth}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Confirmed live posts</p>
                </div>
            </div>

            {/* 2-Column: Upcoming Content & Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Content (2 Cols) */}
                <div className="lg:col-span-2 p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Upcoming Content</h3>
                            <p className="text-xs text-slate-500">Chronological publishing schedule</p>
                        </div>
                        <button
                            onClick={() => onNavigateTab('calendar')}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                            <span>Open Full Calendar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {upcomingContent.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs">
                            No upcoming scheduled posts. Create content or proposal in the Calendar tab.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcomingContent.map((post) => (
                                <div
                                    key={post.id}
                                    onClick={() => onSelectPost(post)}
                                    className="p-4 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-500/50 flex items-center justify-between gap-4 cursor-pointer transition group shadow-sm"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0">
                                            {post.mediaType === 'video' ? <Film className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 transition">
                                                {post.title || post.content?.slice(0, 40) || 'Untitled Post'}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                                <span>{new Date(post.scheduledFor).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                                                <span>•</span>
                                                <span className="capitalize">{post.mediaType}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full capitalize ${
                                            post.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                        }`}>
                                            {post.status.replace('_', ' ')}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Project Activity Stream (1 Col) */}
                <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Activity</h3>
                        <p className="text-xs text-slate-500">Live project event log</p>
                    </div>

                    {activityEvents.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-xs">
                            No recent activity recorded yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activityEvents.map((ev) => (
                                <div key={ev.id} className="flex items-start gap-3 text-xs">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                            {ev.title}
                                        </p>
                                        <p className="text-slate-400 text-[11px] mt-0.5">
                                            {ev.description}
                                        </p>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

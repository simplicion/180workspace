'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    FolderKanban, Plus, Search, Filter, Calendar, CheckCircle2, Clock, 
    AlertCircle, Sparkles, Layers, ArrowRight, Instagram, Linkedin, 
    Youtube, MessageSquare, ShieldCheck, ChevronRight, User, Users, Share2
} from 'lucide-react';
import { socialProjectService, SocialProject } from '@/lib/services/social-project.service';
import { UniversalSkeleton, SkeletonBoundary } from '@workspace/ui';
import { useSubscription } from '@/lib/useSubscription';
import toast from 'react-hot-toast';

export default function SocialProjectsListPage() {
    const { hasApp } = useSubscription();
    const [projects, setProjects] = useState<SocialProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const loadProjects = async () => {
        try {
            setLoading(true);
            const data = await socialProjectService.getProjects({
                search: search || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined
            });
            setProjects(data.projects || []);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to load social projects');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, [statusFilter]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        loadProjects();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'in_progress':
            case 'active':
                return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'in_review':
                return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'completed':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default:
                return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    return (
        <div className="min-h-screen p-6 md:p-10 space-y-8 bg-slate-50/50 dark:bg-slate-950/50">
            {/* Top Navigation / Breadcrumb Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                        <Share2 className="w-4 h-4" />
                        <span>Social Media Suite</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Social Media Projects
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Manage client social media engagements from footage intake to editing, approvals, publishing, and analytics.
                    </p>
                </div>

                <Link
                    href="/social-projects/new"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create Social Project</span>
                </Link>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search projects by name or client..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100/70 dark:bg-slate-800/70 border border-transparent focus:border-indigo-500 rounded-xl outline-none transition text-slate-900 dark:text-slate-100 placeholder-slate-400"
                    />
                </form>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                    {['all', 'in_progress', 'in_review', 'completed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg capitalize whitespace-nowrap transition ${
                                statusFilter === status
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {status.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Projects Grid */}
            {loading ? (
                <UniversalSkeleton type="projects" />
            ) : projects.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white/40 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 backdrop-blur-md">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-inner">
                        <FolderKanban className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No Social Projects Found</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-6">
                        Create your first social media project to link client content calendars, video editing tasks, approvals, and multi-platform publishing.
                    </p>
                    <Link
                        href="/social-projects/new"
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow-lg shadow-indigo-600/25"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Social Project</span>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => {
                        const metrics = project.metrics || {
                            scheduledPosts: 0,
                            pendingApprovals: 0,
                            outstandingTasks: 0,
                            publishedPosts: 0
                        };

                        return (
                            <Link
                                key={project.id}
                                href={`/social-projects/${project.id}`}
                                className="group relative flex flex-col justify-between p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1"
                            >
                                <div>
                                    {/* Card Header: Client Badge & Status */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg">
                                            {project.client?.name || 'Internal Project'}
                                        </span>
                                        <span className={`px-2.5 py-0.5 text-xs font-medium border rounded-full capitalize ${getStatusColor(project.status)}`}>
                                            {project.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    {/* Title & Description */}
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {project.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 mb-5">
                                        {project.description || 'Comprehensive social media growth and content production engagement.'}
                                    </p>

                                    {/* Connected Platforms Row */}
                                    <div className="flex items-center gap-1.5 mb-6">
                                        <span className="text-xs text-slate-400 mr-1">Platforms:</span>
                                        {project.socialAccounts && project.socialAccounts.length > 0 ? (
                                            project.socialAccounts.map((acc: any) => (
                                                <div
                                                    key={acc.id}
                                                    title={`${acc.platform} (@${acc.username})`}
                                                    className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300"
                                                >
                                                    {getPlatformIcon(acc.platform)}
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">No accounts linked</span>
                                        )}
                                    </div>
                                </div>

                                {/* Micro-Metrics Footer */}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                            <p className="text-xs text-slate-400">Scheduled</p>
                                            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                                {metrics.scheduledPosts}
                                            </p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                            <p className="text-xs text-slate-400">Pending Review</p>
                                            <p className="text-base font-bold text-amber-500 mt-0.5">
                                                {metrics.pendingApprovals}
                                            </p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                            <p className="text-xs text-slate-400">Tasks</p>
                                            <p className="text-base font-bold text-indigo-500 mt-0.5">
                                                {metrics.outstandingTasks}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                                        <span>Open Workspace</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ShareIcon(props: any) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
    );
}

function getPlatformIcon(platform: string) {
    switch (platform?.toLowerCase()) {
        case 'instagram':
            return <Instagram className="w-3.5 h-3.5 text-pink-500" />;
        case 'linkedin':
            return <Linkedin className="w-3.5 h-3.5 text-sky-600" />;
        case 'youtube':
            return <Youtube className="w-3.5 h-3.5 text-red-500" />;
        case 'tiktok':
            return <span className="text-[10px] font-black">TT</span>;
        default:
            return <ShareIcon className="w-3.5 h-3.5 text-slate-400" />;
    }
}

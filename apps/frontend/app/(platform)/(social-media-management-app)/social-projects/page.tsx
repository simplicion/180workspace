'use client';

import React, { useState, useEffect } from 'react';
import { 
    FolderKanban, Plus, Search, Filter, Calendar, CheckCircle2, Clock, 
    AlertCircle, Sparkles, Layers, ArrowRight, Instagram, Linkedin, 
    Youtube, MessageSquare, ShieldCheck, ChevronRight, User, Users, Share2,
    Zap, Download, Monitor, Smartphone, X, Trash2, Info, ExternalLink, RefreshCw
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

    // Modals state
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<SocialProject | null>(null);
    const [projectForDetails, setProjectForDetails] = useState<SocialProject | null>(null);

    // Create form state
    const [newProjectName, setNewProjectName] = useState('');
    const [newClientName, setNewClientName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [submittingCreate, setSubmittingCreate] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) {
            toast.error('Please enter a project name');
            return;
        }

        try {
            setSubmittingCreate(true);
            await socialProjectService.createProject({
                name: newProjectName.trim(),
                description: newProjectDesc.trim() || undefined,
                client: newClientName.trim() ? { name: newClientName.trim() } : undefined,
                status: 'in_progress',
                priority: 'medium'
            });
            toast.success('Social project created successfully');
            setIsCreateModalOpen(false);
            setNewProjectName('');
            setNewClientName('');
            setNewProjectDesc('');
            loadProjects();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to create project');
        } finally {
            setSubmittingCreate(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!projectToDelete) return;
        try {
            setDeletingId(projectToDelete.id);
            await socialProjectService.deleteProject(projectToDelete.id);
            toast.success(`Project "${projectToDelete.name}" deleted`);
            setProjectToDelete(null);
            loadProjects();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to delete project');
        } finally {
            setDeletingId(null);
        }
    };

    const handleLaunchStudio = (projectId: string) => {
        window.location.href = `one80://projects/${projectId}`;
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

    // Aggregate metrics
    const totalScheduled = projects.reduce((acc, p) => acc + (p.metrics?.scheduledPosts || 0), 0);
    const totalPending = projects.reduce((acc, p) => acc + (p.metrics?.pendingApprovals || 0), 0);

    return (
        <div className="min-h-screen p-6 md:p-10 space-y-8 bg-slate-50/50 dark:bg-slate-950/50">
            {/* Top Navigation Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                        <Share2 className="w-4 h-4" />
                        <span>180 Workspace Suite</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                        180 Social Media Manager
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Centralized project dashboard. Manage client engagements and launch full AI video editing and social publishing in our native desktop and mobile app.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsDownloadModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-xl shadow-sm transition active:scale-95"
                    >
                        <Download className="w-4 h-4 text-indigo-500" />
                        <span>Download 180 Studio</span>
                    </button>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Project</span>
                    </button>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Projects</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{projects.length}</p>
                    <p className="text-xs text-indigo-500 mt-1">Managed workspaces</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled Posts</p>
                    <p className="text-2xl font-black text-emerald-500 mt-1">{totalScheduled}</p>
                    <p className="text-xs text-slate-400 mt-1">Across all campaigns</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Approvals</p>
                    <p className="text-2xl font-black text-amber-500 mt-1">{totalPending}</p>
                    <p className="text-xs text-slate-400 mt-1">Awaiting client review</p>
                </div>
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-2xl backdrop-blur-md">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Native Studio App</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">Windows • macOS • Android</p>
                    <button
                        onClick={() => setIsDownloadModalOpen(true)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 underline hover:no-underline mt-2 inline-flex items-center gap-1"
                    >
                        <span>Get App Downloads</span>
                        <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Filter & Search Bar */}
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
                    <button
                        onClick={loadProjects}
                        title="Refresh projects"
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
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
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow-lg shadow-indigo-600/25"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Social Project</span>
                    </button>
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
                            <div
                                key={project.id}
                                className="group relative flex flex-col justify-between p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5"
                            >
                                <div>
                                    {/* Card Header: Client Badge, Status & Actions */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg">
                                            {project.client?.name || 'Internal Project'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-0.5 text-xs font-medium border rounded-full capitalize ${getStatusColor(project.status)}`}>
                                                {project.status.replace('_', ' ')}
                                            </span>
                                            <button
                                                onClick={() => setProjectToDelete(project)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                                                title="Delete Project"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Title & Description */}
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
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
                                            <p className="text-xs text-slate-400">Pending</p>
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

                                    {/* Action Row */}
                                    <div className="flex items-center justify-between pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setProjectForDetails(project)}
                                            className="flex items-center text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition"
                                        >
                                            <Info className="w-3.5 h-3.5 mr-1" />
                                            <span>Details</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleLaunchStudio(project.id)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95"
                                            title="Launch in 180 Social Media Manager (Desktop / Mobile App)"
                                        >
                                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                                            <span>Launch in 180 Studio</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* In-Place Create Project Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                        Create Social Project
                                    </h3>
                                    <p className="text-xs text-slate-400">Start a new social campaign engagement</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Project Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Acme Q3 TikTok Growth"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Client Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Acme Corp"
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Description (Optional)
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Brief summary of creative direction and social targets..."
                                    value={newProjectDesc}
                                    onChange={(e) => setNewProjectDesc(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingCreate}
                                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition shadow-md shadow-indigo-600/20"
                                >
                                    {submittingCreate ? 'Creating...' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Project Confirmation Modal */}
            {projectToDelete && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-500 flex items-center justify-center mx-auto">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Delete Project?
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-200">"{projectToDelete.name}"</span>? This will archive the project workspace and associated media files.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setProjectToDelete(null)}
                                className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteProject}
                                disabled={deletingId === projectToDelete.id}
                                className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl transition shadow-md shadow-red-600/20"
                            >
                                {deletingId === projectToDelete.id ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Details Modal */}
            {projectForDetails && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FolderKanban className="w-5 h-5 text-indigo-500" />
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    {projectForDetails.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setProjectForDetails(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Client:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{projectForDetails.client?.name || 'Internal'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Status:</span>
                                    <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">{projectForDetails.status.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Project ID:</span>
                                    <span className="font-mono text-[10px] text-slate-500">{projectForDetails.id}</span>
                                </div>
                            </div>

                            {projectForDetails.description && (
                                <div>
                                    <span className="text-slate-400 block mb-1">Description:</span>
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                        {projectForDetails.description}
                                    </p>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    onClick={() => {
                                        handleLaunchStudio(projectForDetails.id);
                                        setProjectForDetails(null);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-indigo-600/20 transition active:scale-95"
                                >
                                    <Zap className="w-4 h-4 text-amber-300" />
                                    <span>Open in 180 Social Media Manager App</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Native App Download Modal */}
            {isDownloadModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                                    <Download className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                        180 Social Media Manager
                                    </h3>
                                    <p className="text-xs text-slate-400">Native High-Performance Creative Suite</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDownloadModalOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            For heavy 4K video editing, CapCut-style viral captions, teleprompter recording, and seamless cross-platform publishing, download our native app for your device:
                        </p>

                        <div className="space-y-2.5">
                            <a
                                href="/downloads/180-social-media-manager-windows-x64.exe"
                                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition group"
                            >
                                <div className="flex items-center gap-3">
                                    <Monitor className="w-5 h-5 text-indigo-500" />
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Windows (64-bit)</p>
                                        <p className="text-[10px] text-slate-400">Windows 10 / 11 Native Installer (.exe)</p>
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">Download</span>
                            </a>

                            <a
                                href="/downloads/180-social-media-manager-macos-universal.dmg"
                                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition group"
                            >
                                <div className="flex items-center gap-3">
                                    <Monitor className="w-5 h-5 text-indigo-500" />
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">macOS (Universal)</p>
                                        <p className="text-[10px] text-slate-400">Apple Silicon M1-M4 & Intel (.dmg)</p>
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">Download</span>
                            </a>

                            <a
                                href="/downloads/app-release.apk"
                                download="180-social-media-manager.apk"
                                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition group"
                            >
                                <div className="flex items-center gap-3">
                                    <Smartphone className="w-5 h-5 text-indigo-500" />
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Android APK</p>
                                        <p className="text-[10px] text-slate-400">Direct phone package (.apk - 112 MB)</p>
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">Download</span>
                            </a>
                        </div>
                    </div>
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

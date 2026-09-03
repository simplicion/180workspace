'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight, Users, CheckCircle2, Clock, AlertTriangle, FolderKanban } from 'lucide-react';
import { SkeletonProjectGrid } from '@workspace/ui';

interface TaskStats {
    totalTasks: number;
    completedTasks: number;
}

interface Project {
    id?: string;
    _id: string;
    name: string;
    status: string;
    priority: string;
    progress: number;
    deadline?: string;
    ownerId?: { name: string; email: string; photoUrl?: string };
    memberIds?: Array<{ name: string; email: string; photoUrl?: string }>;
    taskStats?: TaskStats;
    updatedAt: string;
}

interface RecentProjectsProps {
    projects: Project[];
    loading: boolean;
}

export default function RecentProjects({ projects, loading }: RecentProjectsProps) {
    if (loading) {
        return <SkeletonProjectGrid count={5} />;
    }

    const getStatusStyles = (status: string) => {
        switch ((status || '').toLowerCase()) {
            case 'completed': return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60';
            case 'in_progress':
            case 'in progress': return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/60';
            case 'on_hold':
            case 'on hold': return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/60';
            case 'cancelled': return 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
            default: return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/60';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch ((priority || '').toLowerCase()) {
            case 'critical': return <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />;
            case 'high': return <Clock className="w-2.5 h-2.5 text-orange-500" />;
            default: return null;
        }
    };

    return (
        <div className="card overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-sm">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <FolderKanban className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            Recent Projects
                            <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-full">
                                {projects.length} Active
                            </span>
                        </h3>
                        <p className="text-[11px] text-zinc-400 font-medium">Projects recently created or updated</p>
                    </div>
                </div>
                <Link 
                    href='/projects' 
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors self-start sm:self-auto border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900"
                >
                    View All <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* Standard Project Cards Row/Grid: 2 cards in mobile, 3-5 in PC */}
            <div className="p-4 sm:p-5">
                {projects.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Users className="w-7 h-7 text-zinc-300 dark:text-zinc-600" />
                        </div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No active projects</p>
                        <p className="text-xs text-zinc-400 mt-0.5">Start by creating your first project</p>
                        <Link href='/projects' className="btn-primary mt-4 py-2 px-4 text-xs inline-block">
                            Create Project
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                        {projects.map((project) => {
                            const projectId = project.id || project._id;
                            const totalTasks = project.taskStats?.totalTasks || 0;
                            const completedTasks = project.taskStats?.completedTasks || 0;
                            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (project.progress || 0);

                            // Project Health Indicator
                            let health = '🟢 Healthy';
                            let healthClass = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40';
                            
                            if (project.status !== 'completed' && project.deadline) {
                                const deadlineDate = new Date(project.deadline);
                                const today = new Date();
                                const diffDays = (deadlineDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
                                
                                if (diffDays < 0) {
                                    health = '🔴 Critical';
                                    healthClass = 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/40';
                                } else if (diffDays <= 3 && completionRate < 80) {
                                    health = '🔴 Critical';
                                    healthClass = 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/40';
                                } else if (diffDays <= 7 && completionRate < 80) {
                                    health = '🟡 Risk';
                                    healthClass = 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/40';
                                }
                            }

                            return (
                                <Link
                                    key={projectId}
                                    href={`/projects/${projectId}`}
                                    className="group flex flex-col justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-850/40 hover:bg-white dark:hover:bg-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md transition-all duration-200 cursor-pointer"
                                >
                                    <div>
                                        {/* Card Top: Avatar & Badges */}
                                        <div className="flex items-start justify-between gap-1.5 mb-2.5">
                                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                                                {project?.name ? project.name.charAt(0).toUpperCase() : 'P'}
                                            </div>
                                            <div className="flex flex-wrap items-center justify-end gap-1">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${healthClass}`}>
                                                    {health}
                                                </span>
                                                {(project.priority === 'critical' || project.priority === 'high') && (
                                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[8px] font-bold uppercase tracking-widest border border-rose-100 dark:border-rose-800/40">
                                                        {getPriorityIcon(project.priority)}
                                                        {project.priority}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Project Title */}
                                        <h4 className="font-bold text-zinc-900 dark:text-white text-xs sm:text-sm truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1.5" title={project.name}>
                                            {project.name}
                                        </h4>

                                        {/* Status & Deadline Tags */}
                                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                            <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${getStatusStyles(project.status)}`}>
                                                {(project.status || 'Planning').replace('_', ' ')}
                                            </span>
                                            <span className="flex items-center gap-1 text-[9px] text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700">
                                                <Calendar className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                                                <span className="truncate max-w-[70px] sm:max-w-none">
                                                    {project.deadline ? new Date(project.deadline).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'No deadline'}
                                                </span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Bottom: Progress & Members */}
                                    <div className="pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/80 space-y-2 mt-auto">
                                        {/* Progress Bar */}
                                        <div>
                                            <div className="flex items-center justify-between text-[9px] font-semibold text-zinc-400 mb-1">
                                                <span className="uppercase tracking-wider">Progress</span>
                                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{completionRate}%</span>
                                            </div>
                                            <div 
                                                className="h-1.5 w-full bg-zinc-200/70 dark:bg-zinc-700 rounded-full overflow-hidden"
                                                role="progressbar"
                                                aria-valuenow={Math.round(completionRate)}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                            >
                                                <div 
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                                                    style={{ width: `${completionRate}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Task Count & Team Member Avatars */}
                                        <div className="flex items-center justify-between gap-1 pt-0.5">
                                            <div className="flex items-center gap-1 text-[9px] text-zinc-500 dark:text-zinc-400 font-medium">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                                <span>{completedTasks}/{totalTasks} Tasks</span>
                                            </div>

                                            {/* Team Avatars */}
                                            <div className="flex -space-x-1.5 shrink-0">
                                                {project.memberIds?.slice(0, 2).map((member, i) => (
                                                    <div 
                                                        key={i} 
                                                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-white dark:border-zinc-800 bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-[9px] font-bold text-indigo-600 dark:text-indigo-400 overflow-hidden"
                                                        title={member.name || 'Member'}
                                                    >
                                                        {member.photoUrl ? (
                                                            <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            member.name ? member.name.charAt(0).toUpperCase() : 'U'
                                                        )}
                                                    </div>
                                                ))}
                                                {(project.memberIds?.length || 0) > 2 && (
                                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-white dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-500 dark:text-zinc-300">
                                                        +{(project.memberIds?.length || 0) - 2}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight, Users, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface TaskStats {
    totalTasks: number;
    completedTasks: number;
}

interface Project {
    _id: string;
    id?: string;
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
        return (
            <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="h-6 w-48 bg-gray-100 animate-pulse rounded-md" />
                    <div className="h-4 w-24 bg-gray-100 animate-pulse rounded-md" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border border-gray-50 rounded-xl">
                            <div className="w-12 h-12 bg-gray-100 animate-pulse rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-1/3 bg-gray-100 animate-pulse rounded-md" />
                                <div className="h-3 w-1/2 bg-gray-100 animate-pulse rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'on_hold': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'cancelled': return 'bg-gray-50 text-gray-700 border-gray-100';
            default: return 'bg-indigo-50 text-indigo-700 border-indigo-100';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'critical': return <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />;
            case 'high': return <Clock className="w-3.5 h-3.5 text-orange-500" />;
            default: return null;
        }
    };

    return (
        <div className="card overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-transparent">
                <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        Recent Projects
                        <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-indigo-100 text-indigo-700 rounded-full">
                            {projects.length} Active
                        </span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Projects recently created or updated</p>
                </div>
                <Link 
                    href='/projects' 
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                >
                    View All <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="divide-y divide-gray-50">
                {projects.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">No active projects</p>
                        <p className="text-xs text-gray-500 mt-1">Start by creating your first project</p>
                        <Link href='/projects' className="btn-primary mt-4 py-2 px-4 text-xs">
                            Create Project
                        </Link>
                    </div>
                ) : (
                    projects.map((project) => {
                        const totalTasks = project.taskStats?.totalTasks || 0;
                        const completedTasks = project.taskStats?.completedTasks || 0;
                        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                        return (
                            <div 
                                key={project.id} 
                                className="p-5 hover:bg-indigo-50/20 transition-all cursor-pointer group border-l-2 border-l-transparent hover:border-l-indigo-500"
                                onClick={() => window.location.href = '/projects/${project.id}'}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-100 flex-shrink-0 group-hover:scale-110 transition-transform">
                                            {project.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors text-base">
                                                    {project.name}
                                                </h4>
                                                {project.priority === 'critical' || project.priority === 'high' ? (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-tight">
                                                        {getPriorityIcon(project.priority)}
                                                        {project.priority}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-gray-500 font-medium">
                                                <span className={`px-2 py-0.5 rounded-full border ${getStatusStyles(project.status)} uppercase tracking-wider text-[9px] font-bold`}>
                                                    {project.status.replace('_', ' ')}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'No deadline'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 w-full md:w-auto">
                                        {/* Task Progress */}
                                        <div className="flex-1 md:w-48">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress</span>
                                                <span className="text-[10px] font-bold text-indigo-600">{completionRate}%</span>
                                            </div>
                                            <div 
                                                className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"
                                                {...{
                                                    role: "progressbar",
                                                    "aria-valuenow": Math.round(completionRate),
                                                    "aria-valuemin": 0,
                                                    "aria-valuemax": 100,
                                                    "aria-label": `${project.name} completion: ${Math.round(completionRate)}%`
                                                }}
                                            >
                                                    <div 
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                                        {...{ style: { width: `${completionRate}%` } as React.CSSProperties }}
                                                    />
                                            </div>
                                            <div className="flex items-center gap-1 mt-1">
                                                <CheckCircle2 className="w-2.5 h-2.5 text-indigo-400" />
                                                <span className="text-[10px] text-gray-400">{completedTasks}/{totalTasks} Tasks</span>
                                            </div>
                                        </div>

                                        {/* Team */}
                                        <div className="flex -space-x-2 flex-shrink-0">
                                            {project.memberIds?.slice(0, 3).map((member, i) => (
                                                <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 overflow-hidden ring-1 ring-gray-100">
                                                    {member.photoUrl ? (
                                                        <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        member.name.charAt(0)
                                                    )}
                                                </div>
                                            ))}
                                            {(project.memberIds?.length || 0) > 3 && (
                                                <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500 ring-1 ring-gray-100">
                                                    +{(project.memberIds?.length || 0) - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

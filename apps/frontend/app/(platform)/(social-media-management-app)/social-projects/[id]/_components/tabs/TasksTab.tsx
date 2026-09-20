'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    CheckSquare, Plus, Film, Clock, User, ArrowRight, 
    CheckCircle2, AlertCircle, ExternalLink, Sparkles, Video
} from 'lucide-react';
import { SocialProject } from '@/lib/services/social-project.service';
import api from '@/lib/api';
import { UniversalSkeleton } from '@workspace/ui';
import toast from 'react-hot-toast';

interface TasksTabProps {
    project: SocialProject;
    onAssignTaskClick: () => void;
    onSubmitDeliverableClick: (taskId: string) => void;
}

export const TasksTab: React.FC<TasksTabProps> = ({ project, onAssignTaskClick, onSubmitDeliverableClick }) => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadTasks = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/api/tasks', {
                params: { projectId: project.id }
            });
            setTasks(data.tasks || []);
        } catch (err) {
            toast.error('Failed to load project tasks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTasks();
    }, [project.id]);

    if (loading) {
        return <UniversalSkeleton type="table" />;
    }

    return (
        <div className="space-y-6">
            {/* Header / Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Editing & Production Tasks
                    </h3>
                    <p className="text-xs text-slate-500">
                        Tasks linked to content scripts and 180 Media Studio editing workflows.
                    </p>
                </div>

                <button
                    onClick={onAssignTaskClick}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    <span>Assign Editor Task</span>
                </button>
            </div>

            {/* Task Cards List */}
            {tasks.length === 0 ? (
                <div className="text-center py-16 p-6 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
                    <Film className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Editing Tasks Assigned</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                        Assign video editors to content scripts to produce Reels, TikToks, and Shorts.
                    </p>
                    <button
                        onClick={onAssignTaskClick}
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
                    >
                        Assign Video Editor
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {tasks.map(task => (
                        <div
                            key={task.id}
                            className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                        >
                            <div className="space-y-1.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-md">
                                        PRIORITY: {task.priority?.toUpperCase() || 'MEDIUM'}
                                    </span>
                                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                                        task.status === 'completed' || task.status === 'done' ? 'bg-emerald-500/10 text-emerald-500' :
                                        task.status === 'submitted_for_review' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'
                                    }`}>
                                        {task.status?.replace('_', ' ')}
                                    </span>
                                </div>

                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {task.title}
                                </h4>

                                <p className="text-xs text-slate-500 line-clamp-1">
                                    {task.description}
                                </p>

                                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                                    <span className="flex items-center gap-1">
                                        <User className="w-3.5 h-3.5" />
                                        <span>{task.assignee?.name || 'Unassigned'}</span>
                                    </span>
                                    {task.dueDate && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Task Action CTAs */}
                            <div className="flex items-center gap-2 shrink-0">
                                <Link
                                    href={`/media-editor?projectId=${project.id}&taskId=${task.id}`}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-xl transition"
                                >
                                    <Video className="w-3.5 h-3.5" />
                                    <span>Open 180 Studio</span>
                                </Link>

                                <button
                                    onClick={() => onSubmitDeliverableClick(task.id)}
                                    className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 rounded-xl transition"
                                >
                                    Submit Video
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

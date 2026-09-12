'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
    Target,
    CheckSquare,
    StickyNote as StickyNoteIcon,
    Calendar,
    Clock,
    Plus,
    Trash2,
    Pin,
    ChevronRight,
    Sparkles,
    CheckCircle2,
    Video,
    AlertCircle,
    ArrowUpRight,
    Tag,
    Layers,
    ListTodo
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import api from '@/lib/api';
import { PlatformModal } from '@workspace/ui';

interface UpcomingTasksAndGoalsProps {
    isLocked?: boolean;
}

interface CalendarEvent {
    id: string;
    title: string;
    startDate: string;
    startTime?: string;
    type?: string;
    platform?: string;
    meetingLink?: string;
    roomId?: string;
    location?: string;
    attendees?: Array<{ id: string; name?: string; email?: string; photoUrl?: string }>;
}

interface Goal {
    id: string;
    title: string;
    description?: string;
    progress?: number;
    status?: string;
    dueDate?: string;
    targetDate?: string;
    difficulty?: string;
    color?: string;
    createdAt?: string;
}

interface TaskItem {
    id: string;
    title: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    projectId?: { id?: string; name?: string; status?: string } | string;
    assignee?: { id?: string; name?: string; photoUrl?: string };
}

interface StickyNoteItem {
    id: string;
    title: string;
    content: string;
    color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | string;
    isPinned?: boolean;
    tag?: string;
    createdAt?: string;
}

type TabFilter = 'all' | 'notes' | 'goals' | 'tasks' | 'meetings';

const PAPER_COLORS: Record<string, { bg: string; border: string; tape: string; text: string; subtext: string; name: string }> = {
    yellow: {
        bg: 'bg-[#fef9c3] dark:bg-[#854d0e]/25',
        border: 'border-[#fde047]/80 dark:border-[#ca8a04]/40',
        tape: 'bg-[#fef08a]/80 dark:bg-[#eab308]/30',
        text: 'text-[#713f12] dark:text-[#fef08a]',
        subtext: 'text-[#854d0e]/80 dark:text-[#fef08a]/70',
        name: 'Sunshine Yellow'
    },
    green: {
        bg: 'bg-[#dcfce7] dark:bg-[#166534]/25',
        border: 'border-[#86efac]/80 dark:border-[#22c55e]/40',
        tape: 'bg-[#bbf7d0]/80 dark:bg-[#16a34a]/30',
        text: 'text-[#14532d] dark:text-[#bbf7d0]',
        subtext: 'text-[#166534]/80 dark:text-[#bbf7d0]/70',
        name: 'Mint Pastel'
    },
    blue: {
        bg: 'bg-[#e0f2fe] dark:bg-[#075985]/25',
        border: 'border-[#7dd3fc]/80 dark:border-[#0284c7]/40',
        tape: 'bg-[#bae6fd]/80 dark:bg-[#0369a1]/30',
        text: 'text-[#0c4a6e] dark:text-[#bae6fd]',
        subtext: 'text-[#0369a1]/80 dark:text-[#bae6fd]/70',
        name: 'Sky Blue'
    },
    pink: {
        bg: 'bg-[#fce7f3] dark:bg-[#9d174d]/25',
        border: 'border-[#f472b6]/60 dark:border-[#db2777]/40',
        tape: 'bg-[#fbcfe8]/80 dark:bg-[#be185d]/30',
        text: 'text-[#831843] dark:text-[#fbcfe8]',
        subtext: 'text-[#9d174d]/80 dark:text-[#fbcfe8]/70',
        name: 'Blush Rose'
    },
    purple: {
        bg: 'bg-[#f3e8ff] dark:bg-[#6b21a8]/25',
        border: 'border-[#d8b4fe]/80 dark:border-[#9333ea]/40',
        tape: 'bg-[#e9d5ff]/80 dark:bg-[#7e22ce]/30',
        text: 'text-[#581c87] dark:text-[#e9d5ff]',
        subtext: 'text-[#6b21a8]/80 dark:text-[#e9d5ff]/70',
        name: 'Lavender Note'
    }
};

export default function UpcomingTasksAndGoals({ isLocked }: UpcomingTasksAndGoalsProps) {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>([]);
    const [meetings, setMeetings] = useState<CalendarEvent[]>([]);
    const [activeTab, setActiveTab] = useState<TabFilter>('all');
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'sticky_note' | 'goal'>('sticky_note');
    const [submitting, setSubmitting] = useState(false);

    // Form inputs: Sticky Note
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [noteColor, setNoteColor] = useState<string>('yellow');
    const [noteTag, setNoteTag] = useState('General');
    const [noteIsPinned, setNoteIsPinned] = useState(false);

    // Form inputs: Goal
    const [goalTitle, setGoalTitle] = useState('');
    const [goalDescription, setGoalDescription] = useState('');
    const [goalTargetDate, setGoalTargetDate] = useState('');
    const [goalProgress, setGoalProgress] = useState(0);
    const [goalDifficulty, setGoalDifficulty] = useState('medium');
    const [goalColor, setGoalColor] = useState('#6366f1');

    const fetchData = async () => {
        if (isLocked) return;
        setLoading(true);
        try {
            const [tasksRes, goalsRes, notesRes, calRes] = await Promise.allSettled([
                api.get('/api/tasks?limit=30'),
                api.get('/api/goals?limit=50'),
                api.get('/api/sticky-notes'),
                api.get('/api/calendar')
            ]);

            if (tasksRes.status === 'fulfilled' && tasksRes.value.data) {
                const rawTasks = tasksRes.value.data.tasks || [];
                const pending = rawTasks.filter((t: any) => t.status !== 'done' && t.status !== 'completed');
                setTasks(pending.length > 0 ? pending : rawTasks.slice(0, 10));
            }

            if (goalsRes.status === 'fulfilled' && goalsRes.value.data) {
                setGoals(goalsRes.value.data.goals || []);
            }

            if (notesRes.status === 'fulfilled' && notesRes.value.data) {
                setStickyNotes(notesRes.value.data.notes || []);
            }

            if (calRes.status === 'fulfilled' && calRes.value.data) {
                const rawCal: CalendarEvent[] = calRes.value.data.events || [];
                setMeetings(rawCal.filter((e: any) => e.type === 'meeting' || e.meetingLink || e.platform || e.roomId));
            }
        } catch (err) {
            console.error('Error fetching tasks & goals:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [isLocked]);

    // Open modal with specific active type
    const openCreateModal = (type: 'sticky_note' | 'goal') => {
        setModalType(type);
        setIsModalOpen(true);
    };

    // Handle create submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (modalType === 'sticky_note') {
                if (!noteTitle && !noteContent) return;
                const { data } = await api.post('/api/sticky-notes', {
                    title: noteTitle,
                    content: noteContent,
                    color: noteColor,
                    tag: noteTag,
                    isPinned: noteIsPinned
                });
                if (data.note) {
                    setStickyNotes(prev => [data.note, ...prev]);
                }
                setNoteTitle('');
                setNoteContent('');
                setNoteTag('General');
                setNoteIsPinned(false);
            } else {
                if (!goalTitle) return;
                const { data } = await api.post('/api/goals', {
                    title: goalTitle,
                    description: goalDescription,
                    targetDate: goalTargetDate || null,
                    progress: Number(goalProgress) || 0,
                    difficulty: goalDifficulty,
                    color: goalColor
                });
                if (data.goal) {
                    setGoals(prev => [data.goal, ...prev]);
                }
                setGoalTitle('');
                setGoalDescription('');
                setGoalTargetDate('');
                setGoalProgress(0);
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error('Failed to create:', err);
        } finally {
            setSubmitting(false);
        }
    };

    // Delete Sticky Note
    const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            setStickyNotes(prev => prev.filter(n => n.id !== id));
            await api.delete(`/api/sticky-notes/${id}`);
        } catch (err) {
            console.error('Failed to delete note:', err);
            fetchData();
        }
    };

    // Delete Goal
    const handleDeleteGoal = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            setGoals(prev => prev.filter(g => g.id !== id));
            await api.delete(`/api/goals/${id}`);
        } catch (err) {
            console.error('Failed to delete goal:', err);
            fetchData();
        }
    };

    // Update Goal Progress Toggle
    const handleToggleGoalProgress = async (goal: Goal, e: React.MouseEvent) => {
        e.stopPropagation();
        const newProgress = (goal.progress || 0) >= 100 ? 0 : Math.min(100, (goal.progress || 0) + 25);
        const newStatus = newProgress === 100 ? 'completed' : 'active';
        try {
            setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, progress: newProgress, status: newStatus } : g));
            await api.patch(`/api/goals/${goal.id}`, { progress: newProgress, status: newStatus });
        } catch (err) {
            console.error('Failed to update goal progress:', err);
        }
    };

    // Counts for tabs
    const counts = useMemo(() => ({
        all: stickyNotes.length + goals.length + tasks.length + meetings.length,
        notes: stickyNotes.length,
        goals: goals.length,
        tasks: tasks.length,
        meetings: meetings.length
    }), [stickyNotes, goals, tasks, meetings]);

    return (
        <div className="card overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-sm flex flex-col h-[520px]">
            {/* Header */}
            <div className="p-4 sm:p-4.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-50 dark:bg-purple-950/60 rounded-xl text-purple-600 dark:text-purple-400 shrink-0">
                        <Target className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-none">
                                Upcoming Tasks & Goals
                            </h3>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 rounded-full">
                                {counts.all}
                            </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                            Founder priorities, active targets & paper notes
                        </p>
                    </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => openCreateModal('sticky_note')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/70 dark:border-amber-800/60 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        title="Add a paper-style sticky note"
                    >
                        <StickyNoteIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="hidden sm:inline">Add Sticky Note</span>
                        <span className="sm:hidden">Note</span>
                    </button>

                    <button
                        onClick={() => openCreateModal('goal')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        title="Set a new milestone or goal"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Set Goal</span>
                        <span className="sm:hidden">Goal</span>
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-850/20 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
                <button
                    onClick={() => setActiveTab('all')}
                    className={clsx(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                        activeTab === 'all'
                            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                >
                    All ({counts.all})
                </button>

                <button
                    onClick={() => setActiveTab('notes')}
                    className={clsx(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                        activeTab === 'notes'
                            ? "bg-amber-500 text-white shadow-xs"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                >
                    <StickyNoteIcon className="w-3 h-3" />
                    <span>Sticky Notes ({counts.notes})</span>
                </button>

                <button
                    onClick={() => setActiveTab('goals')}
                    className={clsx(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                        activeTab === 'goals'
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                >
                    <Target className="w-3 h-3" />
                    <span>Goals ({counts.goals})</span>
                </button>

                <button
                    onClick={() => setActiveTab('tasks')}
                    className={clsx(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                        activeTab === 'tasks'
                            ? "bg-purple-600 text-white shadow-xs"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                >
                    <CheckSquare className="w-3 h-3" />
                    <span>Tasks ({counts.tasks})</span>
                </button>

                {counts.meetings > 0 && (
                    <button
                        onClick={() => setActiveTab('meetings')}
                        className={clsx(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                            activeTab === 'meetings'
                                ? "bg-teal-600 text-white shadow-xs"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                    >
                        <Video className="w-3 h-3" />
                        <span>Meetings ({counts.meetings})</span>
                    </button>
                )}
            </div>

            {/* Vertical Stacked Column (Items listed one by one below each other) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0">
                {loading ? (
                    <div className="space-y-3 py-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : counts.all === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No active goals or sticky notes yet</h4>
                        <p className="text-xs text-zinc-400 max-w-xs mt-1 mb-4">
                            Keep your team aligned by setting milestone goals or pinning quick paper sticky notes.
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => openCreateModal('sticky_note')}
                                className="px-3 py-1.5 text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-lg hover:bg-amber-200 transition-colors"
                            >
                                + Add Sticky Note
                            </button>
                            <button
                                onClick={() => openCreateModal('goal')}
                                className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                + Set Goal
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 1. STICKY NOTES (Authentic Paper-Type Design) */}
                        {(activeTab === 'all' || activeTab === 'notes') && stickyNotes.map(note => {
                            const colorStyle = PAPER_COLORS[note.color] || PAPER_COLORS.yellow;
                            return (
                                <div
                                    key={note.id}
                                    className={clsx(
                                        "relative p-3.5 rounded-xl border shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-all group overflow-hidden",
                                        colorStyle.bg,
                                        colorStyle.border
                                    )}
                                >
                                    {/* Paper Tape / Pin Strip */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {/* Washi-Tape Accent */}
                                            <div className={clsx("h-2.5 px-3 rounded-xs border border-black/5 shadow-2xs flex items-center justify-center font-mono text-[8px] font-bold uppercase tracking-wider opacity-90", colorStyle.tape, colorStyle.text)}>
                                                {note.tag || 'STICKY NOTE'}
                                            </div>
                                            {note.isPinned && (
                                                <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/60 px-1.5 py-0.2 rounded">
                                                    <Pin className="w-2.5 h-2.5 fill-current" /> Pinned
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleDeleteNote(note.id, e)}
                                                className="p-1 rounded text-zinc-500 hover:text-rose-600 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                                title="Delete note"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Note Content */}
                                    {note.title && (
                                        <h4 className={clsx("text-xs font-extrabold mb-1 tracking-tight", colorStyle.text)}>
                                            {note.title}
                                        </h4>
                                    )}
                                    <p className={clsx("text-xs font-medium leading-relaxed whitespace-pre-line font-sans", colorStyle.text)}>
                                        {note.content}
                                    </p>

                                    {/* Footer Date */}
                                    {note.createdAt && (
                                        <div className="mt-2.5 pt-1.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                                            <span className={clsx("text-[9px] font-mono", colorStyle.subtext)}>
                                                {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="text-[9px] font-bold opacity-60">📌 Paper Note</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* 2. GOALS & TARGETS */}
                        {(activeTab === 'all' || activeTab === 'goals') && goals.map(goal => {
                            const isCompleted = (goal.progress || 0) >= 100 || goal.status === 'completed';
                            return (
                                <div
                                    key={goal.id}
                                    className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/50 hover:bg-white dark:hover:bg-zinc-850 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all group"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <button
                                                onClick={(e) => handleToggleGoalProgress(goal, e)}
                                                className={clsx(
                                                    "w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                                                    isCompleted
                                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-xs"
                                                        : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-indigo-400 text-transparent hover:text-indigo-400"
                                                )}
                                                title="Click to advance progress or complete"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                                            </button>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h4 className={clsx(
                                                        "text-xs font-bold text-zinc-900 dark:text-white leading-tight",
                                                        isCompleted && "line-through text-zinc-400 dark:text-zinc-500"
                                                    )}>
                                                        {goal.title}
                                                    </h4>
                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900">
                                                        Goal
                                                    </span>
                                                    {goal.difficulty && (
                                                        <span className="text-[9px] font-semibold uppercase text-zinc-400">
                                                            • {goal.difficulty}
                                                        </span>
                                                    )}
                                                </div>

                                                {goal.description && (
                                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
                                                        {goal.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                                                {goal.progress || 0}%
                                            </span>
                                            <button
                                                onClick={(e) => handleDeleteGoal(goal.id, e)}
                                                className="p-1 rounded text-zinc-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                title="Delete goal"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-2.5">
                                        <div className="w-full h-1.5 bg-zinc-200/80 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={clsx(
                                                    "h-full rounded-full transition-all duration-300",
                                                    isCompleted
                                                        ? "bg-emerald-500"
                                                        : "bg-gradient-to-r from-indigo-500 to-purple-500"
                                                )}
                                                style={{ width: `${Math.min(100, Math.max(5, goal.progress || 0))}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Footer Meta */}
                                    {(goal.targetDate || goal.dueDate) && (
                                        <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                                            <span className="flex items-center gap-1 font-medium">
                                                <Clock className="w-3 h-3 text-zinc-400" />
                                                Target: {new Date(goal.targetDate || goal.dueDate || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                                                {isCompleted ? 'Achieved' : 'In Progress'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* 3. UPCOMING TASKS */}
                        {(activeTab === 'all' || activeTab === 'tasks') && tasks.map(task => {
                            const priority = (task.priority || 'medium').toLowerCase();
                            const taskMark = `#${task.id ? task.id.replace(/\D/g, '').slice(0, 3) || task.id.slice(0, 4).toUpperCase() : '101'}`;
                            const projectName = typeof task.projectId === 'object' && task.projectId?.name ? task.projectId.name : 'Workspace';

                            let priorityBadge = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900';
                            if (priority === 'urgent') priorityBadge = 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900';
                            if (priority === 'high') priorityBadge = 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-900';

                            return (
                                <Link
                                    key={task.id}
                                    href="/tasks"
                                    className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-purple-300 dark:hover:border-purple-800 hover:shadow-xs transition-all flex items-center justify-between gap-3 group"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                            <CheckSquare className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-mono font-bold text-zinc-400">{taskMark}</span>
                                                <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-purple-600 transition-colors">
                                                    {task.title}
                                                </h4>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400">
                                                <span className="truncate">{projectName}</span>
                                                {task.dueDate && (
                                                    <span>• Due {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase", priorityBadge)}>
                                            {priority}
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </Link>
                            );
                        })}

                        {/* 4. MEETINGS */}
                        {(activeTab === 'all' || activeTab === 'meetings') && meetings.map((meet, idx) => (
                            <Link
                                key={meet.id || idx}
                                href={meet.meetingLink || (meet.roomId ? `/dashboard/meeting/${meet.roomId}` : '/calendar')}
                                className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-teal-300 dark:hover:border-teal-800 hover:shadow-xs transition-all flex items-center justify-between gap-3 group"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                                        <Video className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-teal-600 transition-colors">
                                            {meet.title || 'Scheduled Meeting'}
                                        </h4>
                                        <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {meet.startTime || (meet.startDate ? new Date(meet.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900">
                                        Join
                                    </span>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </div>
                            </Link>
                        ))}
                    </>
                )}
            </div>

            {/* Universal Popup Modal for Sticky Notes & Strategic Goals */}
            <PlatformModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalType === 'sticky_note' ? 'Add Paper Sticky Note' : 'Set Strategic Goal'}
                icon={modalType === 'sticky_note' ? StickyNoteIcon : Target}
                iconBgClass={modalType === 'sticky_note' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}
                iconColorClass={modalType === 'sticky_note' ? 'text-amber-700' : 'text-indigo-700'}
                maxWidthClass="max-w-lg"
                onSubmit={handleSubmit}
                subHeader={
                    <div className="px-6 py-2.5 bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-500">Create:</span>
                        <div className="flex items-center bg-zinc-200/70 dark:bg-zinc-800 p-0.5 rounded-lg text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setModalType('sticky_note')}
                                className={clsx(
                                    "px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5",
                                    modalType === 'sticky_note'
                                        ? "bg-amber-400 text-amber-950 shadow-xs"
                                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                                )}
                            >
                                <StickyNoteIcon className="w-3.5 h-3.5" /> Sticky Note
                            </button>
                            <button
                                type="button"
                                onClick={() => setModalType('goal')}
                                className={clsx(
                                    "px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5",
                                    modalType === 'goal'
                                        ? "bg-indigo-600 text-white shadow-xs"
                                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                                )}
                            >
                                <Target className="w-3.5 h-3.5" /> Milestone Goal
                            </button>
                        </div>
                    </div>
                }
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={clsx(
                                "px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer",
                                modalType === 'sticky_note'
                                    ? "bg-amber-600 hover:bg-amber-700"
                                    : "bg-indigo-600 hover:bg-indigo-700"
                            )}
                        >
                            {submitting ? 'Saving...' : modalType === 'sticky_note' ? 'Pin Sticky Note' : 'Save Goal'}
                        </button>
                    </>
                }
            >
                {modalType === 'sticky_note' ? (
                    /* Sticky Note Form */
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                                Note Title (Optional)
                            </label>
                            <input
                                type="text"
                                value={noteTitle}
                                onChange={(e) => setNoteTitle(e.target.value)}
                                placeholder="e.g. Follow up with investor / Pitch deck update"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                                Paper Note Content *
                            </label>
                            <textarea
                                required
                                rows={4}
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                placeholder="Write down tactical insights, daily reminders, or quick ideas here..."
                                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none font-sans"
                            />
                        </div>

                        {/* Paper Color Palette Picker */}
                        <div>
                            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                                Paper Texture & Tint
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {Object.entries(PAPER_COLORS).map(([colorKey, colorVal]) => (
                                    <button
                                        key={colorKey}
                                        type="button"
                                        onClick={() => setNoteColor(colorKey)}
                                        className={clsx(
                                            "p-2.5 rounded-xl border-2 text-center flex flex-col items-center gap-1 transition-all cursor-pointer",
                                            colorVal.bg,
                                            noteColor === colorKey
                                                ? "border-amber-500 scale-105 shadow-sm ring-2 ring-amber-500/30"
                                                : "border-transparent opacity-80 hover:opacity-100"
                                        )}
                                    >
                                        <div className={clsx("w-4 h-4 rounded-full border border-black/10 shadow-2xs", colorVal.tape)} />
                                        <span className={clsx("text-[9px] font-bold leading-none", colorVal.text)}>
                                            {colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tag & Pin Row */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                                    Category Tag
                                </label>
                                <select
                                    value={noteTag}
                                    onChange={(e) => setNoteTag(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                                >
                                    <option value="General">General</option>
                                    <option value="Urgent">Urgent</option>
                                    <option value="Strategy">Strategy</option>
                                    <option value="Follow-up">Follow-up</option>
                                    <option value="Idea">Idea</option>
                                </select>
                            </div>

                            <div className="flex items-end pb-2">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                    <input
                                        type="checkbox"
                                        checked={noteIsPinned}
                                        onChange={(e) => setNoteIsPinned(e.target.checked)}
                                        className="w-4 h-4 text-amber-600 rounded border-zinc-300 focus:ring-amber-500"
                                    />
                                    <span>Pin to top of feed</span>
                                </label>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Strategic Goal Form */
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                                Goal Title *
                            </label>
                            <input
                                type="text"
                                required
                                value={goalTitle}
                                onChange={(e) => setGoalTitle(e.target.value)}
                                placeholder="e.g. Reach ₹25L Monthly Recurring Revenue"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                                Goal Description / Key Results
                            </label>
                            <textarea
                                rows={3}
                                value={goalDescription}
                                onChange={(e) => setGoalDescription(e.target.value)}
                                placeholder="Details, target milestones or key metrics to track..."
                                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                                    Target Due Date
                                </label>
                                <input
                                    type="date"
                                    value={goalTargetDate}
                                    onChange={(e) => setGoalTargetDate(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                                    Difficulty / Priority
                                </label>
                                <select
                                    value={goalDifficulty}
                                    onChange={(e) => setGoalDifficulty(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                >
                                    <option value="low">Low Priority</option>
                                    <option value="medium">Medium Priority</option>
                                    <option value="high">High Priority</option>
                                    <option value="critical">Critical (P0)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                    Initial Progress (%)
                                </label>
                                <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                                    {goalProgress}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={goalProgress}
                                onChange={(e) => setGoalProgress(Number(e.target.value))}
                                className="w-full accent-indigo-600 cursor-pointer"
                            />
                        </div>
                    </div>
                )}
            </PlatformModal>
        </div>
    );
}

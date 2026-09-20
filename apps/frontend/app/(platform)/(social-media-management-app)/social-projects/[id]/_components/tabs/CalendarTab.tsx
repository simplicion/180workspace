'use client';

import React, { useState, useEffect } from 'react';
import { 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, 
    Filter, Layers, Film, Image as ImageIcon, CheckCircle2, Clock,
    AlertTriangle, Globe
} from 'lucide-react';
import { socialProjectService, SocialProject } from '@/lib/services/social-project.service';
import { UniversalSkeleton } from '@workspace/ui';
import toast from 'react-hot-toast';

interface CalendarTabProps {
    project: SocialProject;
    onSelectPost: (post: any) => void;
    onCreateContent: (date?: Date) => void;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({ project, onSelectPost, onCreateContent }) => {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

    const loadPosts = async () => {
        try {
            setLoading(true);
            const data = await socialProjectService.getPosts({ projectId: project.id });
            setPosts(data);
        } catch (err) {
            toast.error('Failed to load project calendar');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPosts();
    }, [project.id]);

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Calculate calendar month days
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
        days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        days.push(new Date(year, month, d));
    }

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const defaultTimezone = project.socialSettings?.defaultTimezone || 'UTC';

    // Helper to detect cannibalization collisions (<15 min gap between posts on same day)
    const checkDayCollision = (dayPosts: any[]): boolean => {
        if (dayPosts.length < 2) return false;
        const times = dayPosts
            .map(p => new Date(p.scheduledFor).getTime())
            .sort((a, b) => a - b);

        for (let i = 0; i < times.length - 1; i++) {
            if (times[i + 1] - times[i] < 15 * 60 * 1000) {
                return true; // Scheduled within 15 minutes!
            }
        }
        return false;
    };

    if (loading) {
        return <UniversalSkeleton type="calendar" />;
    }

    return (
        <div className="space-y-6">
            {/* Calendar Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{monthName}</h3>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Timezone Indicator */}
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold border border-indigo-100 dark:border-indigo-900">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{defaultTimezone}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                        onClick={() => setViewMode(viewMode === 'month' ? 'list' : 'month')}
                        className="px-3.5 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200"
                    >
                        {viewMode === 'month' ? 'List View' : 'Month Grid'}
                    </button>
                    <button
                        onClick={() => onCreateContent()}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Schedule Content</span>
                    </button>
                </div>
            </div>

            {/* Month View Grid */}
            {viewMode === 'month' ? (
                <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-4 mb-2 border-b border-slate-100 dark:border-slate-800">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day}>{day}</div>
                        ))}
                    </div>

                    {/* Day Cells */}
                    <div className="grid grid-cols-7 gap-2">
                        {days.map((date, idx) => {
                            if (!date) {
                                return <div key={`empty-${idx}`} className="min-h-[110px] rounded-2xl bg-slate-50/40 dark:bg-slate-950/20 border border-transparent" />;
                            }

                            const dayPosts = posts.filter(p => {
                                if (!p.scheduledFor) return false;
                                const pDate = new Date(p.scheduledFor);
                                return pDate.getFullYear() === date.getFullYear() &&
                                       pDate.getMonth() === date.getMonth() &&
                                       pDate.getDate() === date.getDate();
                            });

                            const isToday = new Date().toDateString() === date.toDateString();
                            const hasCollision = checkDayCollision(dayPosts);

                            return (
                                <div
                                    key={date.toISOString()}
                                    onClick={() => onCreateContent(date)}
                                    className={`min-h-[110px] p-2.5 rounded-2xl border transition group cursor-pointer flex flex-col justify-between ${
                                        isToday
                                            ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600'
                                            : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-400'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-bold ${
                                            isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                                        }`}>
                                            {date.getDate()}
                                        </span>
                                        
                                        <div className="flex items-center gap-1">
                                            {hasCollision && (
                                                <span 
                                                    title="Cannibalization Warning: 2+ posts scheduled within 15 minutes of each other"
                                                    className="p-0.5 rounded bg-amber-500/20 text-amber-500"
                                                >
                                                    <AlertTriangle className="w-3 h-3" />
                                                </span>
                                            )}
                                            {dayPosts.length > 0 && (
                                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Posts in this day */}
                                    <div className="space-y-1 my-1 flex-1 overflow-hidden">
                                        {dayPosts.slice(0, 2).map(post => (
                                            <div
                                                key={post.id}
                                                onClick={(e) => { e.stopPropagation(); onSelectPost(post); }}
                                                className="p-1 px-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-medium truncate hover:bg-indigo-500 transition"
                                                title={post.title || post.content}
                                            >
                                                {post.title || post.content?.slice(0, 20)}
                                            </div>
                                        ))}
                                        {dayPosts.length > 2 && (
                                            <div className="text-[10px] text-slate-400 font-semibold pl-1">
                                                +{dayPosts.length - 2} more
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-[10px] text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition text-right">
                                        + Add
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* List View */
                <div className="space-y-3">
                    {posts.map(post => (
                        <div
                            key={post.id}
                            onClick={() => onSelectPost(post)}
                            className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-4 cursor-pointer hover:border-indigo-500 transition shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600">
                                    {post.mediaType === 'video' ? <Film className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        {post.title || post.content?.slice(0, 40) || 'Untitled Post'}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                        <span>{post.scheduledFor ? new Date(post.scheduledFor).toLocaleString() : 'Unscheduled Draft'}</span>
                                        <span>•</span>
                                        <span className="capitalize">{post.mediaType || 'video'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${
                                    post.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 
                                    post.status === 'published' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}>
                                    {post.status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

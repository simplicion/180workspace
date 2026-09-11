'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Legend, Cell 
} from 'recharts';
import { 
    ChevronLeft, ChevronRight, Calendar, TrendingUp, CheckCircle2, 
    Clock, Timer, AlertCircle, BarChart3, ChevronUp, ChevronDown, 
    Sparkles, Filter
} from 'lucide-react';
import clsx from 'clsx';
import { 
    format, startOfMonth, endOfMonth, eachDayOfInterval, 
    isSameDay, addMonths, subMonths, getDay, isThisMonth 
} from 'date-fns';
import api from '@/lib/api';

interface TaskMonthAnalyticsProps {
    onDateRangeSelect?: (startDate: string, endDate: string, label: string) => void;
    currentFilterDateRange?: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TaskMonthAnalytics({ onDateRangeSelect, currentFilterDateRange }: TaskMonthAnalyticsProps) {
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'dayOfWeek'>('daily');
    const [monthTasks, setMonthTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Fetch all tasks for the selected month
    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const startDate = startOfMonth(currentMonth).toISOString();
        const endDate = endOfMonth(currentMonth).toISOString();

        api.get('/api/tasks', {
            params: {
                startDate,
                endDate,
                limit: 500
            }
        })
        .then(({ data }) => {
            if (isMounted) {
                setMonthTasks(data.tasks || []);
            }
        })
        .catch(err => {
            console.error('[TaskMonthAnalytics] Failed to fetch month tasks:', err);
        })
        .finally(() => {
            if (isMounted) setLoading(false);
        });

        return () => { isMounted = false; };
    }, [currentMonth]);

    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
    const handleResetThisMonth = () => setCurrentMonth(new Date());

    // Compute Summary Stats for the month
    const stats = useMemo(() => {
        const total = monthTasks.length;
        const done = monthTasks.filter(t => t.status === 'done').length;
        const inReview = monthTasks.filter(t => t.status === 'in_review').length;
        const inProgress = monthTasks.filter(t => t.status === 'in_progress').length;
        const todo = monthTasks.filter(t => t.status === 'todo' || t.status === 'backlog').length;
        const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

        return { total, done, inReview, inProgress, todo, completionRate };
    }, [monthTasks]);

    // Compute Chart Data based on selected view mode
    const chartData = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

        if (viewMode === 'daily') {
            return allDays.map(day => {
                const dayTasks = monthTasks.filter(t => {
                    const taskDate = t.createdAt ? new Date(t.createdAt) : null;
                    return taskDate && isSameDay(taskDate, day);
                });

                const done = dayTasks.filter(t => t.status === 'done').length;
                const inReview = dayTasks.filter(t => t.status === 'in_review').length;
                const inProgress = dayTasks.filter(t => t.status === 'in_progress').length;
                const todo = dayTasks.filter(t => t.status === 'todo' || t.status === 'backlog').length;

                return {
                    label: format(day, 'd'),
                    fullDate: format(day, 'MMM dd, yyyy (EEE)'),
                    rawDate: day,
                    total: dayTasks.length,
                    done,
                    inReview,
                    inProgress,
                    todo
                };
            });
        }

        if (viewMode === 'weekly') {
            // Group into 5 distinct weeks
            const weeks: { [key: string]: { label: string; done: number; inReview: number; inProgress: number; todo: number; total: number } } = {
                'Week 1': { label: 'Week 1 (1-7)', done: 0, inReview: 0, inProgress: 0, todo: 0, total: 0 },
                'Week 2': { label: 'Week 2 (8-14)', done: 0, inReview: 0, inProgress: 0, todo: 0, total: 0 },
                'Week 3': { label: 'Week 3 (15-21)', done: 0, inReview: 0, inProgress: 0, todo: 0, total: 0 },
                'Week 4': { label: 'Week 4 (22-28)', done: 0, inReview: 0, inProgress: 0, todo: 0, total: 0 },
                'Week 5': { label: `Week 5 (29-${allDays.length})`, done: 0, inReview: 0, inProgress: 0, todo: 0, total: 0 },
            };

            monthTasks.forEach(task => {
                const date = task.createdAt ? new Date(task.createdAt) : null;
                if (!date) return;
                const dayNum = date.getDate();
                let weekKey = 'Week 1';
                if (dayNum > 28) weekKey = 'Week 5';
                else if (dayNum > 21) weekKey = 'Week 4';
                else if (dayNum > 14) weekKey = 'Week 3';
                else if (dayNum > 7) weekKey = 'Week 2';

                weeks[weekKey].total += 1;
                if (task.status === 'done') weeks[weekKey].done += 1;
                else if (task.status === 'in_review') weeks[weekKey].inReview += 1;
                else if (task.status === 'in_progress') weeks[weekKey].inProgress += 1;
                else weeks[weekKey].todo += 1;
            });

            return Object.values(weeks);
        }

        if (viewMode === 'dayOfWeek') {
            // Monday through Sunday distribution
            const dayMap: { [key: number]: { label: string; done: number; inReview: number; inProgress: number; todo: number; total: number } } = {
                1: { label: 'Mon', done: 0, inReview: 0, inProgress: 0, todo: 0, total: 0 },
                2: { label: 'Tue', done: 0, inReview: 0, inProgress: 0, todo: 0, total: 0 },
                3: { label: 'Wed', done: 0, inReview: 0, inProgress: 0, todo: 0, total: 0 },
                4: { label: 'Thu', done: 0, inReview: 0, inProgress: 0, todo: 0, total: 0 },
                5: { label: 'Fri', done: 0, inReview: 0, inProgress: 0, todo: 0, total: 0 },
                6: { label: 'Sat', done: 0, inReview: 0, inProgress: 0, todo: 0, total: 0 },
                0: { label: 'Sun', done: 0, inReview: 0, inProgress: 0, todo: 0, total: 0 },
            };

            monthTasks.forEach(task => {
                const date = task.createdAt ? new Date(task.createdAt) : null;
                if (!date) return;
                const dayOfWeek = getDay(date);
                if (dayMap[dayOfWeek]) {
                    dayMap[dayOfWeek].total += 1;
                    if (task.status === 'done') dayMap[dayOfWeek].done += 1;
                    else if (task.status === 'in_review') dayMap[dayOfWeek].inReview += 1;
                    else if (task.status === 'in_progress') dayMap[dayOfWeek].inProgress += 1;
                    else dayMap[dayOfWeek].todo += 1;
                }
            });

            // Return in order Mon -> Sun
            return [dayMap[1], dayMap[2], dayMap[3], dayMap[4], dayMap[5], dayMap[6], dayMap[0]];
        }

        return [];
    }, [currentMonth, monthTasks, viewMode]);

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const data = payload[0]?.payload;
        return (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 text-xs z-50 min-w-[160px]">
                <p className="font-bold text-gray-900 dark:text-gray-100 mb-2 border-b border-gray-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
                    <span>{data.fullDate || data.label}</span>
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                        {data.total} {data.total === 1 ? 'Task' : 'Tasks'}
                    </span>
                </p>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Done
                        </span>
                        <span className="font-bold">{data.done}</span>
                    </div>
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" /> In Review
                        </span>
                        <span className="font-bold">{data.inReview}</span>
                    </div>
                    <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" /> In Progress
                        </span>
                        <span className="font-bold">{data.inProgress}</span>
                    </div>
                    <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-500" /> To Do
                        </span>
                        <span className="font-bold">{data.todo}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-5 mb-5 transition-all">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-none flex-shrink-0">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                Monthly Task Activity
                            </h2>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                                <Sparkles className="w-2.5 h-2.5" /> Full Month
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Daily progress & volume distribution for {format(currentMonth, 'MMMM yyyy')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* View Mode Segmented Control */}
                    <div className="flex bg-gray-100 dark:bg-slate-800 rounded-xl p-0.5 border border-gray-200/60 dark:border-slate-700 text-xs">
                        <button
                            type="button"
                            onClick={() => setViewMode('daily')}
                            className={clsx(
                                "px-2.5 py-1 rounded-lg font-medium transition-all",
                                viewMode === 'daily'
                                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                            )}
                        >
                            Day of Month
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('weekly')}
                            className={clsx(
                                "px-2.5 py-1 rounded-lg font-medium transition-all",
                                viewMode === 'weekly'
                                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                            )}
                        >
                            Weekly
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('dayOfWeek')}
                            className={clsx(
                                "px-2.5 py-1 rounded-lg font-medium transition-all",
                                viewMode === 'dayOfWeek'
                                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                            )}
                        >
                            Day of Week
                        </button>
                    </div>

                    {/* Month Navigator */}
                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-800/60 rounded-xl px-2 py-1 border border-gray-200/60 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            title="Previous Month"
                            className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200/60 dark:hover:bg-slate-700 transition-colors"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 px-1 min-w-[100px] text-center">
                            {format(currentMonth, 'MMM yyyy')}
                        </span>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            title="Next Month"
                            className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200/60 dark:hover:bg-slate-700 transition-colors"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {!isThisMonth(currentMonth) && (
                        <button
                            type="button"
                            onClick={handleResetThisMonth}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline px-1"
                        >
                            This Month
                        </button>
                    )}

                    {/* Toggle Collapse */}
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        title={isCollapsed ? "Expand Analytics" : "Collapse Analytics"}
                    >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Collapsible Content */}
            {!isCollapsed && (
                <div className="space-y-4 animate-in fade-in duration-200">
                    {/* KPI Quick Stats Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                        <div className="bg-gray-50/80 dark:bg-slate-800/50 rounded-xl p-2.5 border border-gray-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Tasks</span>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.total}</span>
                                <span className="text-[10px] text-gray-400">in month</span>
                            </div>
                        </div>

                        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl p-2.5 border border-emerald-100/60 dark:border-emerald-900/30">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</span>
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/40 px-1 rounded">
                                    {stats.completionRate}%
                                </span>
                            </div>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{stats.done}</span>
                                <span className="text-[10px] text-emerald-600/70">Done</span>
                            </div>
                        </div>

                        <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-xl p-2.5 border border-amber-100/60 dark:border-amber-900/30">
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">In Review</span>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-lg font-bold text-amber-700 dark:text-amber-400">{stats.inReview}</span>
                                <span className="text-[10px] text-amber-600/70">Pending</span>
                            </div>
                        </div>

                        <div className="bg-blue-50/60 dark:bg-blue-950/20 rounded-xl p-2.5 border border-blue-100/60 dark:border-blue-900/30">
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">In Progress</span>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{stats.inProgress}</span>
                                <span className="text-[10px] text-blue-600/70">Active</span>
                            </div>
                        </div>

                        <div className="bg-purple-50/60 dark:bg-purple-950/20 rounded-xl p-2.5 border border-purple-100/60 dark:border-purple-900/30 col-span-2 sm:col-span-1">
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">To Do</span>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-lg font-bold text-purple-700 dark:text-purple-400">{stats.todo}</span>
                                <span className="text-[10px] text-purple-600/70">Queued</span>
                            </div>
                        </div>
                    </div>

                    {/* Recharts Stacked Bar Graph */}
                    <div className="h-[200px] w-full pt-2">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-xs text-gray-400">
                                Loading monthly task graph...
                            </div>
                        ) : chartData.length === 0 || stats.total === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400 bg-gray-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
                                <Calendar className="w-6 h-6 text-gray-300 dark:text-gray-600 mb-1" />
                                <span>No task activity recorded in {format(currentMonth, 'MMMM yyyy')}</span>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                                    <XAxis 
                                        dataKey="label" 
                                        tickLine={false} 
                                        axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.5 }} 
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        interval={viewMode === 'daily' ? 1 : 0}
                                    />
                                    <YAxis 
                                        allowDecimals={false} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{ fontSize: 10, fill: '#64748b' }} 
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }} />
                                    <Bar dataKey="done" name="Done" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="inReview" name="In Review" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="todo" name="To Do" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Chart Legend / Color Indicator */}
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span>Done ({stats.done})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <span>In Review ({stats.inReview})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            <span>In Progress ({stats.inProgress})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                            <span>To Do ({stats.todo})</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

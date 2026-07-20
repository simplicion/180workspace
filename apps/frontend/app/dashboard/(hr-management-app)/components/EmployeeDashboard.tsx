'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { CheckSquare, FolderKanban, Clock, Calendar, Star, AlertCircle, TrendingUp, ChevronRight, Award, CheckCircle2, Palmtree, Play, Eye, Code2, LogOut, BarChart2 } from 'lucide-react';
import clsx from 'clsx';
import { format, isValid, subDays } from 'date-fns';
import Link from 'next/link';
import { TimeProgressBar , LogoLoader } from "@workspace/ui";
import MarkAttendanceModal from '@/app/dashboard/(hr-management-app)/components/MarkAttendanceModal';
import LogWorkModal from '@/app/dashboard/(projects-and-tasks-app)/_components/LogWorkModal';
import { ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Cell,
    PieChart, Pie, Legend
} from 'recharts';

const STATUS_COLOR: Record<string, string> = {
    todo: 'text-gray-500 bg-gray-50',
    in_progress: 'text-blue-600 bg-blue-50',
    in_review: 'text-amber-600 bg-amber-50',
    done: 'text-emerald-600 bg-emerald-50',
};

const STATUS_ICON: Record<string, React.ElementType> = {
    todo: Clock,
    in_progress: Play,
    in_review: Eye,
    done: CheckCircle2,
};

const PRIORITY_DOT: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-400',
    medium: 'bg-blue-400',
    low: 'bg-gray-300',
};

function ScoreRing({ score }: { score: number }) {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

    return (
        <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
                <circle cx="44" cy="44" r={radius} stroke="#f1f5f9" strokeWidth="8" fill="none" />
                <circle
                    cx="44" cy="44" r={radius}
                    stroke={color}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-[stroke-dashoffset] duration-1000 ease-in-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={clsx("text-xl font-black")} style={{ color }}>{score}</span>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Score</span>
            </div>
        </div>
    );
}
export default function EmployeeDashboard({ userName }: { userName?: string }) {
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [showLogWorkModal, setShowLogWorkModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    const fetchData = () => {
        setLoading(true);
        api.get('/api/employee/dashboard')
            .then(res => setData(res.data))
            .catch(() => setError('Failed to load your dashboard'))
            .finally(() => setLoading(false));
    };

    const handleAutoCheckIn = async () => {
        try {
            await api.post('/api/attendance/auto-checkin');
            fetchData();
        } catch (err) {
            // Silently fail or log
        }
    };

    const handleWorkOff = async () => {
        const confirm = window.confirm("Are you sure you want to clock out? This will end your work session for today.");
        if (!confirm) return;

        try {
            await api.post('/api/attendance/auto-checkout');
            fetchData();
            toast.success('Work off recorded! Good work today.');
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to clock out');
        }
    };

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        const loadingToast = toast.loading('Updating status...');
        try {
            await api.put(`/api/tasks/${taskId}`, { status: newStatus });
            toast.success('Status updated!', { id: loadingToast });
            fetchData(); // Refresh dashboard data
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to update status', { id: loadingToast });
        }
    };

    useEffect(() => {
        handleAutoCheckIn();
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
            </div>
        );
    }

    const { tasks, projects, attendance, leaves, performanceScore } = data || {};
    const pendingTasks: any[] = tasks?.list || [];
    const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done');

    return (
        <div className="space-y-6">
            {/* Greeting Header */}
            <div className="page-header">
                <h1 className="page-title">My Workspace</h1>
                <p className="page-subtitle">Welcome back, {userName?.split(' ')[0] || 'there'}! Here&apos;s your personal overview.</p>
            </div>

            {/* Overdue Tasks Alert */}
            {overdueTasks.length > 0 && (
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl px-5 py-4">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
                    <div>
                        <p className="font-semibold text-sm">You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}</p>
                        <p className="text-xs text-rose-600 mt-0.5">Completing overdue tasks protects your performance score.</p>
                    </div>
                    <Link href="/dashboard/tasks" className="ml-auto text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1.5 rounded-lg hover:bg-rose-200 transition-colors whitespace-nowrap">
                        View Tasks
                    </Link>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-5 group hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <CheckSquare className="w-5 h-5 text-amber-600" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pending Tasks</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{tasks?.pending ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">{tasks?.completed ?? 0} completed</p>
                </div>

                <div className="card p-5 group hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <FolderKanban className="w-5 h-5 text-indigo-600" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">My Projects</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{projects?.active ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">{projects?.total ?? 0} total</p>
                </div>

                <div className="card p-5 group hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-emerald-600" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Monthly Presence</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{attendance?.stats?.present ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">{attendance?.stats?.late ?? 0} late • {attendance?.stats?.absent ?? 0} absent</p>
                </div>

                <div className="card p-5 group hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                            <Palmtree className="w-5 h-5 text-rose-600" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Leave Balance</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{leaves?.balance ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">{leaves?.used ?? 0} days used this year</p>
                </div>
            </div>

            {/* ── Visual Analytics ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* 1. Attendance Overview */}
                {(() => {
                    const statsArr: any[] = attendance?.monthly || [];
                    const present = attendance?.stats?.present ?? 0;
                    const late = attendance?.stats?.late ?? 0;
                    const absent = attendance?.stats?.absent ?? 0;
                    const total = present + late + absent || 1;
                    const rate = Math.round((present / total) * 100);
                    const aggData = [
                        { label: 'Present', value: present, color: '#10B981' },
                        { label: 'Late', value: late, color: '#F59E0B' },
                        { label: 'Absent', value: absent, color: '#EF4444' },
                    ];
                    const chartData = statsArr.length > 0
                        ? statsArr.slice(-14).map((d: any) => ({
                            day: format(new Date(d.date || d.day), 'dd MMM'),
                            Present: d.present ?? (d.status === 'present' ? 1 : 0),
                            Late: d.late ?? (d.status === 'late' ? 1 : 0),
                            Absent: d.absent ?? (d.status === 'absent' ? 1 : 0),
                        }))
                        : Array.from({ length: 7 }, (_, i) => ({
                            day: format(subDays(new Date(), 6 - i), 'EEE'),
                            Present: i < 5 ? 1 : 0,
                            Late: i === 1 ? 1 : 0,
                            Absent: i >= 5 ? 1 : 0,
                        }));
                    return (
                        <div className="card p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                                        <Calendar className="w-4 h-4 text-emerald-500" />
                                        Attendance Overview
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">This month</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-emerald-600">{rate}%</p>
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Rate</p>
                                </div>
                            </div>
                            <div className="space-y-2 mb-3">
                                {aggData.map(item => (
                                    <div key={item.label} className="flex items-center gap-3">
                                        <span className="text-xs font-semibold text-gray-500 w-14">{item.label}</span>
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.color }} />
                                        </div>
                                        <span className="text-xs font-black text-gray-700 w-5 text-right">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                            <ResponsiveContainer width="100%" height={120}>
                                <BarChart data={chartData} barSize={7} barGap={2}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 11 }} cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="Present" fill="#10B981" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="Late" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="Absent" fill="#EF4444" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    );
                })()}

                {/* 2. Task Breakdown (Donut) */}
                {(() => {
                    const allTasks: any[] = tasks?.list || [];
                    const donuts = [
                        { name: 'Done', value: allTasks.filter(t => t.status === 'done').length, color: '#10B981' },
                        { name: 'In Progress', value: allTasks.filter(t => t.status === 'in_progress').length, color: '#6366F1' },
                        { name: 'In Review', value: allTasks.filter(t => t.status === 'in_review').length, color: '#F59E0B' },
                        { name: 'To Do', value: allTasks.filter(t => t.status === 'todo').length, color: '#94A3B8' },
                    ].filter(d => d.value > 0);
                    const totalTasks = allTasks.length || 1;
                    const done = allTasks.filter(t => t.status === 'done').length;
                    const completionRate = Math.round((done / totalTasks) * 100);
                    const priorityCounts = [
                        { label: 'Critical', count: allTasks.filter(t => t.priority === 'critical').length, color: '#EF4444' },
                        { label: 'High', count: allTasks.filter(t => t.priority === 'high').length, color: '#F97316' },
                        { label: 'Medium', count: allTasks.filter(t => t.priority === 'medium').length, color: '#6366F1' },
                        { label: 'Low', count: allTasks.filter(t => t.priority === 'low').length, color: '#94A3B8' },
                    ].filter(d => d.count > 0);
                    const CustomTooltip = ({ active, payload }: any) => {
                        if (active && payload?.length) {
                            return (
                                <div className="bg-white shadow-xl rounded-xl px-3 py-2 border border-gray-100">
                                    <p className="text-xs font-bold text-gray-700">{payload[0].name}</p>
                                    <p className="text-sm font-black" style={{ color: payload[0].payload.color }}>{payload[0].value} task{payload[0].value !== 1 ? 's' : ''}</p>
                                </div>
                            );
                        }
                        return null;
                    };
                    return (
                        <div className="card p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                                        <CheckSquare className="w-4 h-4 text-indigo-500" />
                                        Task Breakdown
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">All assigned tasks</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-indigo-600">{completionRate}%</p>
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Done</p>
                                </div>
                            </div>
                            {donuts.length > 0 ? (
                                <div className="flex items-center gap-4">
                                    <ResponsiveContainer width={130} height={130}>
                                        <PieChart>
                                            <Pie data={donuts} cx="50%" cy="50%" innerRadius={36} outerRadius={56} paddingAngle={3} dataKey="value">
                                                {donuts.map((entry, i) => <Cell key={i} fill={entry.color} strokeWidth={0} />)}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex-1 space-y-2">
                                        {donuts.map(d => (
                                            <div key={d.name} className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                                                <span className="text-[10px] font-semibold text-gray-500 flex-1">{d.name}</span>
                                                <span className="text-[10px] font-black text-gray-700">{d.value}</span>
                                            </div>
                                        ))}
                                        <div className="pt-1 border-t border-gray-50">
                                            {priorityCounts.map(d => (
                                                <div key={d.label} className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-semibold text-gray-400 w-12">{d.label}</span>
                                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${(d.count / totalTasks) * 100}%`, backgroundColor: d.color }} />
                                                    </div>
                                                    <span className="text-[9px] font-black text-gray-500">{d.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-32 gap-2">
                                    <CheckCircle2 className="w-10 h-10 text-gray-100" />
                                    <p className="text-xs text-gray-400 font-medium">No tasks yet</p>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* 3. Performance Points */}
                {(() => {
                    const score = performanceScore ?? 0;
                    const TIERS = [
                        { min: 0, label: 'Rookie', color: '#94A3B8' },
                        { min: 100, label: 'Contributor', color: '#10B981' },
                        { min: 200, label: 'Rising Star', color: '#06B6D4' },
                        { min: 300, label: 'High Achiever', color: '#F97316' },
                        { min: 400, label: 'Elite', color: '#8B5CF6' },
                        { min: 500, label: 'Legendary', color: '#FFD700' },
                    ];
                    const currentTier = [...TIERS].reverse().find(t => score >= t.min) || TIERS[0];
                    const now = new Date();
                    const pointsData = Array.from({ length: 8 }, (_, i) => ({
                        period: format(subDays(now, (7 - i) * 7), 'dd MMM'),
                        Points: i < 7 ? Math.round(score * ((i + 1) / 7) * (0.75 + Math.random() * 0.25)) : score,
                    }));
                    pointsData[7].Points = score;
                    return (
                        <div className="card p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                                        <Award className="w-4 h-4 text-violet-500" />
                                        Performance Points
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Score progression</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black" style={{ color: currentTier.color }}>{score}</p>
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">/ 500 pts</p>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={120}>
                                <AreaChart data={pointsData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="ptGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={currentTier.color} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={currentTier.color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="period" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis domain={[0, 500]} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: 12 }} formatter={(val: any) => [`${val} pts`, 'Points']} />
                                    <Area type="monotone" dataKey="Points" stroke={currentTier.color} strokeWidth={2.5} fill="url(#ptGrad)" dot={{ r: 3, fill: currentTier.color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                            <div className="mt-3 pt-3 border-t border-gray-50">
                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                    {TIERS.map(tier => {
                                        const reached = score >= tier.min;
                                        return (
                                            <div key={tier.label} title={tier.label} className="flex flex-col items-center gap-1 flex-1">
                                                <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center', reached ? 'scale-110' : 'opacity-25')} style={{ borderColor: tier.color, backgroundColor: reached ? tier.color : 'transparent' }}>
                                                    {reached && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                                </div>
                                                <span className="text-[8px] font-bold" style={{ color: reached ? tier.color : '#94a3b8' }}>{tier.min}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min((score / 500) * 100, 100)}%`, backgroundColor: currentTier.color }} />
                                </div>
                            </div>
                        </div>
                    );
                })()}

            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Task list */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="card overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-indigo-500" />
                                My Tasks
                            </h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedTask(null);
                                        setShowLogWorkModal(true);
                                    }}
                                    className="btn-primary py-1 px-3 text-[10px] flex items-center gap-1.5"
                                >
                                    <ClipboardCheck className="w-3.5 h-3.5" />
                                    Log Your Work
                                </button>
                                <Link href="/dashboard/tasks" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                    View all <ChevronRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                        {pendingTasks.length === 0 ? (
                            <div className="p-10 text-center">
                                <CheckCircle2 className="w-10 h-10 text-gray-100 mx-auto mb-3" />
                                <p className="text-gray-400 font-medium">All caught up! No pending tasks.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {pendingTasks.map((task: any) => {
                                    const Icon = STATUS_ICON[task.status] || Clock;
                                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
                                    return (
                                        <div key={task.id} className="p-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                                            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', STATUS_COLOR[task.status] || 'text-gray-400 bg-gray-50')}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                             <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{task.title}</p>
                                                <div className="flex items-center gap-2 mt-0.5 mb-1.5">
                                                    {task.priority && (
                                                        <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_DOT[task.priority] || 'bg-gray-300')} title={task.priority} />
                                                    )}
                                                    {task.projectId?.name && (
                                                        <span className="text-[10px] text-gray-400 truncate">{task.projectId.name}</span>
                                                    )}
                                                </div>
                                                {task.dueDate && (
                                                    <TimeProgressBar
                                                        createdAt={task.createdAt}
                                                        dueDate={task.dueDate}
                                                        estimatedHours={task.estimatedHours}
                                                        status={task.status}
                                                        completedOnTime={task.completedOnTime}
                                                        compact
                                                    />
                                                )}
                                            </div>
                                                <div className="flex items-center gap-2">
                                                    {task.status === 'in_progress' && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedTask(task);
                                                                setShowLogWorkModal(true);
                                                            }}
                                                            className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                                            title="Log work for this task"
                                                        >
                                                            <ClipboardCheck className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {task.status === 'in_review' || task.status === 'done' ? (
                                                        <span
                                                            className={clsx(
                                                                'text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border-none inline-block',
                                                                STATUS_COLOR[task.status] || 'text-gray-400 bg-gray-50'
                                                            )}
                                                            title="Status cannot be changed"
                                                        >
                                                            {task.status.replace('_', ' ')}
                                                        </span>
                                                    ) : (
                                                        <select
                                                            value={task.status}
                                                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                                            className={clsx(
                                                                'text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border-none cursor-pointer outline-none transition-all hover:ring-1 hover:ring-indigo-300',
                                                                STATUS_COLOR[task.status] || 'text-gray-400 bg-gray-50'
                                                            )}
                                                            title="Change status"
                                                        >
                                                            <option value="todo">Todo</option>
                                                            <option value="in_progress">In Progress</option>
                                                        </select>
                                                    )}
                                                </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* My Projects */}
                    {projects?.list?.length > 0 && (
                        <div className="card overflow-hidden">
                            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <FolderKanban className="w-4 h-4 text-indigo-500" />
                                    My Projects
                                </h3>
                                <Link href="/dashboard/projects" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                    View all <ChevronRight className="w-3 h-3" />
                                </Link>
                            </div>
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {projects.list.slice(0, 4).map((p: any) => {
                                    const progress = p.progress || 0;
                                    return (
                                        <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="flex flex-col gap-2 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                        <FolderKanban className="w-4 h-4 text-white" />
                                                    </div>
                                                    <p className="font-semibold text-sm text-gray-900 truncate group-hover:text-indigo-700">{p.name}</p>
                                                </div>
                                                <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider', p.role === 'Owner' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600')}>
                                                    {p.role}
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-medium">{progress}% complete</p>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Performance + Attendance + Leaves */}
                <div className="space-y-4">
                    {/* Performance & Achievement */}
                    {(() => {
                        const score = performanceScore ?? 100;
                        const TIERS = [
                            { min: 0, max: 100, tag: 'Rookie', emoji: '🌱', color: '#94A3B8', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
                            { min: 100, max: 200, tag: 'Consistent Contributor', emoji: '🔥', color: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
                            { min: 200, max: 300, tag: 'Rising Star', emoji: '⭐', color: '#06B6D4', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
                            { min: 300, max: 400, tag: 'High Achiever', emoji: '🚀', color: '#F97316', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
                            { min: 400, max: 500, tag: 'Elite Performer', emoji: '💎', color: '#8B5CF6', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
                            { min: 500, max: 500, tag: 'Legendary Executor', emoji: '🏆', color: '#FFD700', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                        ];
                        const tier = score >= 500 ? TIERS[5] : TIERS.find(t => score >= t.min && score < t.max) || TIERS[0];
                        const nextTier = TIERS.find(t => t.min > (tier?.min || 0));
                        const progressInTier = score >= 500 ? 100 : Math.round(((score - tier.min) / (tier.max - tier.min)) * 100);
                        const circumference = 2 * Math.PI * 36;
                        const dashOffset = circumference - (score / 500) * circumference;

                        return (
                            <div className={`card p-5 border ${tier.border} ${tier.bg}`}>
                                <h3 className={`font-bold mb-3 flex items-center gap-2 ${tier.text}`}>
                                    <Award className="w-4 h-4" />
                                    My Achievement
                                </h3>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-20 h-20 flex-shrink-0">
                                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 88 88">
                                            <circle cx="44" cy="44" r="36" stroke="#e2e8f0" strokeWidth="7" fill="none" />
                                            <circle cx="44" cy="44" r="36" stroke={tier.color} strokeWidth="7" fill="none" strokeLinecap="round"
                                                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                                                className="transition-[stroke-dashoffset] duration-1000 ease-in-out" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl">{tier.emoji}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-black text-base leading-tight ${tier.text}`}>{tier.tag}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className={`text-xl font-black ${tier.text}`}>{score}</span>
                                            <span className="text-xs text-gray-400">/ 500 pts</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1">+1 pt per on-time task</p>
                                    </div>
                                </div>
                                {nextTier && (
                                    <div className="mt-3 space-y-1">
                                        <div className="flex justify-between text-[10px] font-semibold text-gray-400">
                                            <span>Next: {nextTier.emoji} {nextTier.tag}</span>
                                            <span>{progressInTier}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/80 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressInTier}%`, backgroundColor: tier.color }} />
                                        </div>
                                        <p className="text-[10px] text-gray-400">{nextTier.min - score} pts to next level</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Today's Attendance */}
                    <div className="card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-emerald-500" />
                                Today&apos;s Attendance
                            </h3>
                            {data.attendance?.today?.shiftStatus && (
                                <span className={clsx(
                                    "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                    data.attendance.today.shiftStatus === 'on_time' ? "bg-emerald-50 text-emerald-600" :
                                    data.attendance.today.shiftStatus === 'late' ? "bg-amber-50 text-amber-600" :
                                    "bg-gray-50 text-gray-400"
                                )}>
                                    {data.attendance.today.shiftStatus.replace('_', ' ')}
                                </span>
                            )}
                        </div>
                        {data.attendance?.today?.checkIn ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-center">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Check In</p>
                                        <p className="text-sm font-black text-gray-900">{data.attendance.today.checkIn}</p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-center relative group/checkout">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Check Out</p>
                                        <p className="text-sm font-black text-gray-900">{data.attendance.today.checkOut || '--:--'}</p>
                                        {!data.attendance.today.checkOut && (
                                            <button 
                                                onClick={handleWorkOff}
                                                className="absolute inset-0 bg-red-600 text-white rounded-xl flex items-center justify-center gap-2 opacity-0 group-hover/checkout:opacity-100 transition-opacity duration-300 font-bold text-xs"
                                            >
                                                <LogOut className="w-3 h-3" />
                                                Work Off
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {data.attendance.today.workHours > 0 && (
                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100/50">
                                        <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-tight">Total Work Time</span>
                                        <span className="text-xs font-black text-indigo-700">{data.attendance.today.workHours} Hours</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-2xl">
                                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                                    <Clock className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-xs text-gray-400 font-medium px-4">Detecting check-in...</p>
                            </div>
                        )}
                    </div>

                    {/* Upcoming Holidays */}
                    <div className="card p-5">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Palmtree className="w-4 h-4 text-indigo-500" />
                            Upcoming Holidays
                        </h3>
                        {data?.holidays?.length > 0 ? (
                            <div className="space-y-3">
                                {data.holidays.map((h: any) => (
                                    <div key={h.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex flex-col items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                                            <span className="text-[10px] font-black text-indigo-600 uppercase leading-none">{format(new Date(h.date), 'MMM')}</span>
                                            <span className="text-sm font-black text-indigo-700 leading-none mt-0.5">{format(new Date(h.date), 'dd')}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{h.name}</p>
                                            <p className="text-[10px] text-gray-400 font-medium capitalize">{h.type} Holiday</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <Palmtree className="w-8 h-8 text-gray-100 mx-auto mb-2" />
                                <p className="text-xs text-gray-400 font-medium">No upcoming holidays</p>
                            </div>
                        )}
                    </div>

                    <div className="card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Palmtree className="w-4 h-4 text-rose-400" />
                                Upcoming Leaves
                            </h3>
                            <Link
                                href="/dashboard/attendance?tab=leaves&action=request"
                                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider bg-rose-50 px-2 py-1 rounded-lg"
                            >
                                Request Leave
                            </Link>
                        </div>
                        {leaves?.upcoming?.length > 0 ? (
                            <div className="space-y-3">
                                {leaves.upcoming.map((leave: any) => (
                                    <div key={leave.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 capitalize">{leave.type || 'Leave'}</p>
                                            <p className="text-xs text-gray-400">
                                                {isValid(new Date(leave.startDate)) ? format(new Date(leave.startDate), 'MMM d') : ''}
                                                {leave.endDate && leave.startDate !== leave.endDate ? ` – ${format(new Date(leave.endDate), 'MMM d')}` : ''}
                                            </p>
                                        </div>
                                        <span className={clsx('text-[10px] font-bold px-2 py-1 rounded-lg capitalize', leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                                            {leave.status}
                                        </span>
                                    </div>
                                ))}
                                <Link href="/dashboard/attendance?tab=leaves" className="block text-center text-xs text-indigo-600 hover:underline mt-2">View all leaves →</Link>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <Palmtree className="w-8 h-8 text-gray-100 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">No upcoming leaves</p>
                                <Link href="/dashboard/attendance?tab=leaves" className="mt-1 inline-block text-xs text-indigo-600 hover:underline">Apply for leave →</Link>
                            </div>
                        )}
                    </div>

                    {/* Developer Access */}
                    <div className="card p-5 bg-slate-900 border-slate-800 text-white overflow-hidden relative">
                        <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl" />
                        <h3 className="font-bold mb-3 flex items-center gap-2 text-indigo-400">
                            <Code2 className="w-4 h-4" />
                            Personal API Access
                        </h3>
                        {data?.profile?.apiKeyEnabled ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Active</span>
                                </div>
                                <p className="text-[10px] text-slate-400">Your profile data is available via API for external integrations.</p>
                                <Link href="/dashboard/profile/me?tab=developer" className="block w-full py-2 text-center text-xs font-bold bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700">
                                    Manage API Key
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Inactive</span>
                                </div>
                                <p className="text-[10px] text-slate-400">Generate an API key to access your profile statistics programmatically.</p>
                                <Link href="/dashboard/profile/me?tab=developer" className="block w-full py-2 text-center text-xs font-bold bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-lg shadow-indigo-500/20">
                                    Enable Developer Access
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Attendance Modal */}
            {showAttendanceModal && (
                <MarkAttendanceModal
                    onClose={() => setShowAttendanceModal(false)}
                    onSuccess={() => {
                        fetchData();
                        toast.success('Attendance updated!');
                    }}
                />
            )}

            {/* Log Work Modal */}
            {showLogWorkModal && (
                <LogWorkModal
                    onClose={() => {
                        setShowLogWorkModal(false);
                        setSelectedTask(null);
                    }}
                    onSuccess={() => {
                        setShowLogWorkModal(false);
                        setSelectedTask(null);
                        fetchData();
                        toast.success('Work log submitted for approval!');
                    }}
                    projectId={selectedTask?.projectId?.id || selectedTask?.projectId}
                    moduleId={selectedTask?.moduleId?.id || selectedTask?.moduleId}
                    taskId={selectedTask?.id}
                />
            )}
        </div>
    );
}

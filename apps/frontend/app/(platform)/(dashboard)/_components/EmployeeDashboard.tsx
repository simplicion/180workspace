'use client';

import CustomSelect from '@/components/ui/CustomSelect';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { CheckSquare, FolderKanban, Clock, Calendar, Star, AlertCircle, TrendingUp, ChevronRight, Award, CheckCircle2, Palmtree, Play, Eye, Code2, LogOut, BarChart2 } from 'lucide-react';
import clsx from 'clsx';
import { format, isValid, subDays } from 'date-fns';
import Link from 'next/link';
import { TimeProgressBar , LogoLoader, ConfirmModal, SkeletonWorkspace } from "@workspace/ui";
import MarkAttendanceDrawer from '@/app/(platform)/(hr-management-app)/_components/MarkAttendanceDrawer';
import LogWorkModal from '@/app/(platform)/(projects-and-tasks-app)/_components/LogWorkModal';
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
export default function EmployeeDashboard({ userName, isMobileView }: { userName?: string, isMobileView?: boolean }) {
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [showLogWorkModal, setShowLogWorkModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [currentTime, setCurrentTime] = useState('');
    const [showWorkOffConfirm, setShowWorkOffConfirm] = useState(false);

    const fetchData = () => {
        setLoading(true);
        api.get('/api/employee/dashboard')
            .then(res => setData(res.data))
            .catch((err) => setError('Failed to load your dashboard: ' + (err.response?.data?.error || err.message)))
            .finally(() => setLoading(false));
    };

    const handleAutoCheckIn = async () => {
        try {
            const now = new Date();
            const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const res = await api.post('/api/attendance/auto-checkin', { date, time });
            if (res.data?.message === 'Checked in successfully') {
                toast.success(`Automatically checked in for today at ${time}`);
            }
            fetchData();
        } catch (err) {
            // Silently fail or log
        }
    };

    const handleWorkOff = () => {
        setShowWorkOffConfirm(true);
    };

    const confirmWorkOff = async () => {
        try {
            const now = new Date();
            const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            await api.post('/api/attendance/auto-checkout', { date, time });
            fetchData();
            toast.success('Work off recorded! Good work today.');
            setShowWorkOffConfirm(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to clock out');
            setShowWorkOffConfirm(false);
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
        setCurrentTime(format(new Date(), 'hh:mm a'));
        handleAutoCheckIn();
        fetchData();
    }, []);

    if (loading) {
        return <SkeletonWorkspace />;
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
            <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">My Workspace</h1>
                    <p className="page-subtitle">Welcome back, {userName?.split(' ')[0] || 'there'}! Here&apos;s your personal overview.</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white border border-gray-200/60 rounded-2xl p-2 shadow-sm">
                    <div className="px-3 py-1 flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Session Active</span>
                        <span className="text-sm font-black text-gray-900">
                            {data?.attendance?.today?.checkIn || currentTime || '--:--'}
                        </span>
                    </div>
                    <div className="w-px h-8 bg-gray-100"></div>
                    <button 
                        onClick={handleWorkOff}
                        className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl flex items-center gap-2 transition-colors text-xs font-bold"
                    >
                        <LogOut className="w-4 h-4" />
                        Work Off
                    </button>
                </div>
            </div>

            {/* Overdue Tasks Alert */}
            {overdueTasks.length > 0 && (
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl px-5 py-4">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
                    <div>
                        <p className="font-semibold text-sm">You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}</p>
                        <p className="text-xs text-rose-600 mt-0.5">Completing overdue tasks protects your performance score.</p>
                    </div>
                    <Link href='/tasks' className="ml-auto text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1.5 rounded-lg hover:bg-rose-200 transition-colors whitespace-nowrap">
                        View Tasks
                    </Link>
                </div>
            )}

            {/* Stat Cards */}
            <div className={clsx("grid gap-4", isMobileView ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3")}>
                <div className="card p-5 group hover:shadow-md transition-all h-full flex flex-col border border-gray-200/60 bg-white">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                                <FolderKanban className="w-4.5 h-4.5 text-slate-700" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Workload Overview</h3>
                        </div>
                        <div className="flex items-center gap-2 bg-indigo-50/50 border border-indigo-100/50 px-2.5 py-1 rounded-full shadow-sm">
                            <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest ml-1">Active Projects</span>
                            <div className="bg-white px-2 py-0.5 rounded-full shadow-sm border border-indigo-100 flex items-center justify-center min-w-[20px]">
                                <span className="text-xs font-black text-indigo-700">{projects?.active ?? 0}</span>
                            </div>
                        </div>
                    </div>
                    
                    {(() => {
                        const allTasks: any[] = tasks?.list || [];
                        const done = allTasks.filter(t => t.status === 'done').length;
                        const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
                        const todo = allTasks.filter(t => t.status === 'todo').length;
                        const review = allTasks.filter(t => t.status === 'in_review').length;
                        const pending = todo + review;

                        const donuts = [
                            { name: 'Completed', value: done, color: '#10B981' },
                            { name: 'In Progress', value: inProgress, color: '#3B82F6' },
                            { name: 'Pending', value: pending, color: '#64748B' },
                        ].filter(d => d.value > 0);

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
                            <div className="flex items-center h-full gap-4">
                                {/* Chart side */}
                                <div className="flex-shrink-0 w-24 h-24">
                                    {donuts.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={donuts} cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={2} dataKey="value">
                                                    {donuts.map((entry, i) => <Cell key={i} fill={entry.color} strokeWidth={0} />)}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="w-full h-full rounded-full border-4 border-slate-100 flex items-center justify-center">
                                            <span className="text-[10px] text-slate-400 font-medium">No Tasks</span>
                                        </div>
                                    )}
                                </div>

                                {/* Stats side */}
                                <div className="flex-1 flex flex-col justify-center space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-slate-500" />
                                            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Pending</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-800">{pending}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">In Progress</span>
                                        </div>
                                        <span className="text-sm font-black text-blue-800">{inProgress}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Completed</span>
                                        </div>
                                        <span className="text-sm font-black text-emerald-800">{done}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* 3. Performance & Achievement */}
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

                    return (
                        <div className={`card p-5 border ${tier.border} ${tier.bg}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className={`font-black flex items-center gap-2 text-lg ${tier.text}`}>
                                        <span>{tier.emoji}</span>
                                        {tier.tag}
                                    </h3>
                                    <p className="text-[10px] text-gray-500 mt-1 font-semibold uppercase">+1 pt per on-time task</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1.5 mt-1 justify-end">
                                        <span className={`text-2xl font-black ${tier.text}`}>{score}</span>
                                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">/ 500</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 mt-6 mb-2">
                                <div className="text-sm">
                                    <span className="text-gray-500 font-medium">Yesterday: </span>
                                    <span className={`font-bold ${tier.text}`}>+5 pts</span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-500 font-medium">Today: </span>
                                    <span className={`font-bold ${tier.text}`}>+2 pts</span>
                                </div>
                            </div>
                            
                            {nextTier && (
                                <div className="mt-4 pt-4 border-t border-gray-200/60 space-y-2">
                                    <div className="flex justify-between text-[10px] font-semibold text-gray-500">
                                        <span>Next: {nextTier.emoji} {nextTier.tag}</span>
                                        <span>{progressInTier}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-white/80 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressInTier}%`, backgroundColor: tier.color }} />
                                    </div>
                                    <p className="text-[10px] text-gray-500 text-right">{nextTier.min - score} pts to next level</p>
                                </div>
                            )}
                        </div>
                    );
                })()}



                <div className="card p-5 group hover:shadow-md transition-shadow relative">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                                <Palmtree className="w-5 h-5 text-rose-600" />
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Attendance & Leaves</span>
                        </div>
                        <Link href="/leaves" className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md hover:bg-rose-100 transition-colors">
                            Request Leave
                        </Link>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{leaves?.balance ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1 mb-3">{leaves?.used ?? 0} days used this year</p>
                    
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <div className="flex flex-col">
                            <span className="text-gray-400">Present</span>
                            <span className="font-bold text-gray-700">{attendance?.stats?.present ?? 0}</span>
                        </div>
                        <div className="flex flex-col text-center">
                            <span className="text-gray-400">Late</span>
                            <span className="font-bold text-gray-700">{attendance?.stats?.late ?? 0}</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="text-gray-400">Absent</span>
                            <span className="font-bold text-gray-700">{attendance?.stats?.absent ?? 0}</span>
                        </div>
                    </div>
                </div>
            </div>



            {/* Main Section */}
            <div className="space-y-6 w-full">
                <div className="space-y-4 w-full">
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
                                <Link href='/tasks' className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
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
                            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                                {pendingTasks.map((task: any) => {
                                    const Icon = STATUS_ICON[task.status] || Clock;
                                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
                                    const taskId = task.id || task.id;
                                    return (
                                        <div key={taskId} className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-50/50 transition-colors">
                                            {/* Title & Metadata (Left Column) */}
                                            <div className="flex items-center gap-4 flex-[2] min-w-0">
                                                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', STATUS_COLOR[task.status] || 'text-gray-400 bg-gray-50')}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                 <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate" title={task.title}>{task.title}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {task.priority && (
                                                            <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_DOT[task.priority] || 'bg-gray-300')} title={`Priority: ${task.priority}`} />
                                                        )}
                                                        {task.projectId?.name && (
                                                            <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{task.projectId.name}</span>
                                                        )}
                                                        {task.workLogs_TaskWorkLogs?.length > 0 && (
                                                            <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-200 font-semibold" title="Rejection Count">
                                                                Rejected {task.workLogs_TaskWorkLogs.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Due Date & Progress (Middle Column) */}
                                            <div className="flex-[1.5] min-w-[200px]">
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

                                            {/* Actions (Right Column) */}
                                            <div className="flex items-center gap-2 justify-end md:flex-shrink-0">
                                                    {task.status === 'in_progress' && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedTask(task);
                                                                setShowLogWorkModal(true);
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors text-xs font-semibold border border-indigo-100"
                                                            title="Submit work log for review"
                                                        >
                                                            <ClipboardCheck className="w-3.5 h-3.5" />
                                                            Log Work
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
                                                        <CustomSelect
                                                            value={task.status}
                                                            onChange={(e) => handleStatusChange(task.id || task.id, e.target.value)}
                                                            className={clsx(
                                                                'text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border-none cursor-pointer outline-none transition-all hover:ring-1 hover:ring-indigo-300',
                                                                STATUS_COLOR[task.status] || 'text-gray-400 bg-gray-50'
                                                            )}
                                                            title="Change status"
                                                        >
                                                            <option value="todo">Todo</option>
                                                            <option value="in_progress">In Progress</option>
                                                        </CustomSelect>
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
                                <Link href='/projects' className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                    View all <ChevronRight className="w-3 h-3" />
                                </Link>
                            </div>
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {projects.list.slice(0, 4).map((p: any) => {
                                    const progress = p.progress || 0;
                                    const projectId = p.id || p.id;
                                    return (
                                        <Link key={projectId} href={`/projects/${projectId}`} className="flex flex-col gap-2 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
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
            </div>

            {/* Attendance Modal */}
            {showAttendanceModal && (
                <MarkAttendanceDrawer
                    open={showAttendanceModal}
                    onClose={() => setShowAttendanceModal(false)}
                    onSuccess={() => {
                        fetchData();
                        toast.success('Attendance updated!');
                        setShowAttendanceModal(false);
                    }}
                />
            )}

            {/* Modals */}
            <ConfirmModal
                isOpen={showWorkOffConfirm}
                title="Clock Out?"
                message="Are you sure you want to clock out? This will end your work session for today."
                confirmText="Clock Out"
                variant="danger"
                onConfirm={confirmWorkOff}
                onCancel={() => setShowWorkOffConfirm(false)}
            />

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
                    projectId={selectedTask?.projectId?.id || selectedTask?.projectId?.id || selectedTask?.projectId}
                    moduleId={selectedTask?.moduleId?.id || selectedTask?.moduleId?.id || selectedTask?.moduleId}
                    taskId={selectedTask?.id || selectedTask?.id}
                />
            )}
        </div>
    );
}

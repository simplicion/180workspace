'use client';


import { LogoLoader } from "@workspace/ui";
import { useEffect, useState } from 'react';
import TaskDetailModal from '@/app/dashboard/(projects-and-tasks-app)/_components/TaskDetailModal';
import api from '@/lib/api';
import { Clock, Plus, Search, Filter, CheckCircle2, XCircle, Timer, Calendar, Briefcase, Layout, CheckSquare, ExternalLink, MessageSquare, ChevronRight, User, BarChart3, TrendingUp, ChevronDown, Download, Users, Briefcase as ProjectIcon, Layers, CalendarDays, History, Paperclip } from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth-context';
import LogWorkModal from '@/app/dashboard/(projects-and-tasks-app)/_components/LogWorkModal';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
    pending: { label: 'Pending', color: 'badge-orange', icon: Timer },
    approved: { label: 'Approved', color: 'badge-green', icon: CheckCircle2 },
    rejected: { label: 'Rejected', color: 'badge-red', icon: XCircle },
};

export default function WorkLogsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team')) || user?.roles?.some((r: string) => ['admin', 'ceo'].includes(r));
    const isLead = isAdmin || user?.isModuleLead;
    const [activeTab, setActiveTab] = useState<'my_logs' | 'pending_reviews' | 'dashboard' | 'all_logs'>('my_logs');
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLogModal, setShowLogModal] = useState(false);

    // Dashboard State
    const [stats, setStats] = useState<any>(null);
    const [filters, setFilters] = useState({
        startDate: format(new Date().setDate(new Date().getDate() - 30), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        projectId: '',
        moduleId: '',
        userId: '',
        preset: 'last_30_days'
    });
    const [filterOptions, setFilterOptions] = useState<any>({
        projects: [],
        modules: [],
        users: []
    });
    
    // Review related
    const [reviewingLog, setReviewingLog] = useState<any>(null);
    const [viewTaskId, setViewTaskId] = useState<string | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [isReviewLoading, setIsReviewLoading] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let endpoint = '/api/work-logs/my';
            if (activeTab === 'pending_reviews') endpoint = '/api/work-logs/reviews';
            else if (activeTab === 'all_logs') endpoint = '/api/work-logs/all';
            
            const params = new URLSearchParams();
            if (filters.projectId) params.append('projectId', filters.projectId);
            if (filters.moduleId) params.append('moduleId', filters.moduleId);
            if (filters.userId) params.append('userId', filters.userId);

            const { data } = await api.get(`${endpoint}?${params.toString()}`);
            let mergedLogs = data?.logs || [];
            
            if (activeTab === 'my_logs' || activeTab === 'all_logs') {
                try {
                    const salesEndpoint = activeTab === 'all_logs' ? '/api/sales/activities?all=true' : '/api/sales/activities';
                    const salesRes = await api.get(salesEndpoint);
                    const salesLogs = salesRes.data?.activities || [];
                    
                    const formattedSales = salesLogs.map((s: any) => ({
                        id: s.id,
                        isSalesActivity: true,
                        workDate: s.timestamp || s.createdAt,
                        hoursSpent: 0,
                        description: s.notes || 'No description',
                        status: 'approved',
                        type: s.type,
                        projectId: { name: 'Sales Activity' },
                        taskId: { title: `Sales ${s.type.charAt(0).toUpperCase() + s.type.slice(1)}` },
                        user: s.owner,
                        relatedLead: s.relatedLead,
                        relatedDeal: s.relatedDeal,
                        relatedClient: s.relatedClient
                    }));
                    
                    mergedLogs = [...mergedLogs, ...formattedSales].sort((a: any, b: any) => 
                        new Date(b.workDate).getTime() - new Date(a.workDate).getTime()
                    );
                } catch (e) {
                    console.error('Failed to fetch sales activities', e);
                }
            }
            
            setLogs(mergedLogs);
        } catch (err) {
            toast.error('Failed to fetch work logs');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.projectId) params.append('projectId', filters.projectId);
            if (filters.moduleId) params.append('moduleId', filters.moduleId);
            if (filters.userId) params.append('userId', filters.userId);

            const { data } = await api.get(`/api/work-logs/stats?${params.toString()}`);
            setStats(data || null);
            if (data?.filterOptions) {
                setFilterOptions(data.filterOptions);
            }
        } catch (err) {
            toast.error('Failed to fetch dashboard statistics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (filterOptions.projects.length === 0) {
            api.get('/api/work-logs/stats').then(({ data }) => {
                if (data && data.filterOptions) {
                    setFilterOptions(data.filterOptions);
                }
            }).catch(() => {});
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetchStats();
        } else {
            fetchLogs();
        }
    }, [activeTab, filters.startDate, filters.endDate, filters.projectId, filters.moduleId, filters.userId]);

    const handleReview = async (logId: string, status: 'approved' | 'rejected') => {
        setIsReviewLoading(true);
        try {
            await api.patch(`/api/work-logs/${logId}/review`, { 
                status, 
                reviewComment 
            });
            toast.success(`Work log ${status}`);
            setReviewingLog(null);
            setReviewComment('');
            fetchLogs();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Review failed');
        } finally {
            setIsReviewLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="w-6 h-6 text-indigo-600" />
                        Work Logging System
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Track daily progress, submit work for review, and automate task completion.</p>
                </div>
                <button 
                    onClick={() => setShowLogModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Log Your Work
                </button>
            </div>

            {/* Tabs & Stats */}
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                        <button 
                            onClick={() => setActiveTab('my_logs')}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                activeTab === 'my_logs' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            My Logs
                        </button>
                        {(user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team')) || user?.isModuleLead) && (
                            <button 
                                onClick={() => setActiveTab('pending_reviews')}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                    activeTab === 'pending_reviews' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                Pending Reviews
                                {activeTab !== 'pending_reviews' && logs.length > 0 && activeTab === 'my_logs' && (
                                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                                )}
                            </button>
                        )}
                        {isAdmin && (
                            <button 
                                onClick={() => setActiveTab('all_logs')}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                    activeTab === 'all_logs' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                All Logs
                            </button>
                        )}
                        {(user?.role === 'admin' || user?.role === 'ceo' || (user?.permissions && user.permissions.includes('can_manage_team')) || user?.isModuleLead) && (
                            <button 
                                onClick={() => setActiveTab('dashboard')}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                    activeTab === 'dashboard' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <BarChart3 className="w-4 h-4" />
                                Dashboard
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
                            <LogoLoader className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                            <p className="text-gray-500 animate-pulse">Loading data...</p>
                        </div>
                    ) : activeTab === 'dashboard' ? (
                        <div className="space-y-6">
                            {/* Summary Totals */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <span className="block text-xs font-bold text-gray-400 uppercase">Total Hours</span>
                                            <h4 className="text-xl font-bold text-gray-900">{stats?.summary?.totalHours?.toFixed(1)}h</h4>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-green-500">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>ACTIVE PERFORMANCE</span>
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <span className="block text-xs font-bold text-gray-400 uppercase">Approved</span>
                                            <h4 className="text-xl font-bold text-gray-900">{stats?.summary?.approved}</h4>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Validated Logs</span>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                                            <Timer className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <span className="block text-xs font-bold text-gray-400 uppercase">Pending</span>
                                            <h4 className="text-xl font-bold text-gray-900">{stats?.summary?.pending}</h4>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Awaiting Review</span>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                                            <XCircle className="w-5 h-5 text-red-600" />
                                        </div>
                                        <div>
                                            <span className="block text-xs font-bold text-gray-400 uppercase">Rejected</span>
                                            <h4 className="text-xl font-bold text-gray-900">{stats?.summary?.rejected}</h4>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Action Required</span>
                                </div>
                            </div>

                            {/* Performance Chart */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-bold text-gray-900">Organizations Performance</h3>
                                        <p className="text-xs text-gray-500">Daily hours logged across the selected period</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">
                                        <Clock className="w-3.5 h-3.5" />
                                        Hours Tracking
                                    </div>
                                </div>
                                
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats?.chartData || []}>
                                            <defs>
                                                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis 
                                                dataKey="date" 
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#9ca3af', fontSize: 10 }}
                                                tickFormatter={(val) => {
                                                    try {
                                                        const date = new Date(val);
                                                        return !isNaN(date.getTime()) ? format(date, 'MMM dd') : val;
                                                    } catch (e) {
                                                        return val;
                                                    }
                                                }}
                                            />
                                            <YAxis 
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#9ca3af', fontSize: 10 }}
                                            />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="hours" 
                                                stroke="#4f46e5" 
                                                strokeWidth={3}
                                                fillOpacity={1} 
                                                fill="url(#colorHours)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Recent Reviewed Logs */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                        <History className="w-4 h-4 text-indigo-600" />
                                        Review History
                                    </h3>
                                    <button className="text-xs font-bold text-indigo-600 hover:underline">View All</button>
                                </div>
                                <div className="space-y-3">
                                    {(stats?.logs || []).slice(0, 5).map((log: any) => (
                                        <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100">
                                                    <img src={log.userId?.photoUrl || 'https://via.placeholder.com/40'} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-gray-900 text-sm">{log.userId?.name}</span>
                                                    <span className="block text-xs text-gray-500 truncate max-w-[200px]">{log.description}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                    log.status === 'approved' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                )}>
                                                    {log.status}
                                                </span>
                                                <span className="block text-[10px] font-bold text-gray-400 mt-1 uppercase leading-none">
                                                    {log.isSalesActivity 
                                                        ? format(new Date(log.workDate), 'MMM dd')
                                                        : `${log.hoursSpent}h • ${format(new Date(log.workDate), 'MMM dd')}`
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!stats?.logs || stats?.logs.length === 0) && (
                                        <div className="py-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <p className="text-xs font-medium text-gray-400">No review history matching current filters</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Clock className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">No work logs found</h3>
                            <p className="text-gray-500 max-w-xs text-center mt-1">
                                {activeTab === 'my_logs' 
                                    ? "You haven't logged any work yet. Click 'Log Your Work' to get started." 
                                    : activeTab === 'all_logs'
                                        ? "No work logs found in the system."
                                        : "Great job! All pending work logs for your projects have been reviewed."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map((log) => {
                                const StatusIcon = STATUS_CONFIG[log.status].icon;
                                return (
                                    <div key={log.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow group">
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                            <div className="space-y-3 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <span className={clsx("badge", STATUS_CONFIG[log.status].color, "flex items-center gap-1.5")}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {STATUS_CONFIG[log.status].label}
                                                    </span>
                                                    <span className="text-sm text-gray-400">•</span>
                                                    <span className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {format(new Date(log.workDate), 'MMM dd, yyyy')}
                                                    </span>
                                                    {log.isWorkCompleted && (
                                                        <span className="badge badge-indigo flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Completion Request
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                    {log.projectId?.name || 'Unknown Project'}
                                                    {log.moduleId && <span className="text-gray-400 font-normal mx-2">/</span>}
                                                    {log.moduleId?.name}
                                                </h3>

                                                {log.taskId && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 w-fit px-3 py-1.5 rounded-lg border border-gray-100">
                                                        <CheckSquare className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                        <span className="font-medium flex-shrink-0">Task:</span>
                                                        <span className="truncate max-w-[200px] md:max-w-xs">{log.taskId.title}</span>
                                                    </div>
                                                )}

                                                {log.isSalesActivity && (
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        {(log.relatedLead || log.relatedDeal || log.relatedAccount || log.relatedContact) && (
                                                            <div className="flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50 w-fit px-3 py-1.5 rounded-lg border border-indigo-100">
                                                                <span className="font-medium flex-shrink-0">Related to:</span>
                                                                <span className="truncate max-w-[200px] md:max-w-xs">
                                                                    {log.relatedLead?.name || log.relatedDeal?.title || log.relatedDeal?.name || log.relatedAccount?.name || log.relatedContact?.name}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <p className="text-gray-600 whitespace-pre-wrap leading-relaxed break-words break-all">
                                                    {log.description}
                                                </p>

                                                {log.links && log.links.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {log.links.map((link: string, i: number) => (
                                                            <a 
                                                                key={i} 
                                                                href={link} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                                                            >
                                                                <ExternalLink className="w-3 h-3" />
                                                                {(() => { try { return new URL(link).hostname; } catch(e) { return link; } })()}
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {log.reviewComment && (
                                                    <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100 flex gap-3">
                                                        <MessageSquare className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                                                        <div>
                                                            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Reviewer Commment</span>
                                                            <p className="text-sm text-gray-700 italic">&quot;{log.reviewComment}&quot;</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4">
                                                <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                                                    <Clock className="w-5 h-5 text-indigo-600" />
                                                    <div className="text-right">
                                                        <span className="block text-xl font-bold text-indigo-700 leading-tight">{log.hoursSpent}</span>
                                                        <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Hours</span>
                                                    </div>
                                                </div>

                                                {(activeTab === 'pending_reviews' || activeTab === 'all_logs') && log.status === 'pending' && (
                                                    <button 
                                                        onClick={() => setReviewingLog(log)}
                                                        className="btn-primary py-2 px-6 flex items-center gap-2"
                                                    >
                                                        Review Progress
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                )}
                                                
                                                {(activeTab === 'pending_reviews' || activeTab === 'all_logs') && (
                                                    <div className="flex items-center gap-2 px-2">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                                                            {log.userId?.photoUrl ? (
                                                                <img src={log.userId.photoUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="w-4 h-4 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div className="text-xs">
                                                            <span className="block font-bold text-gray-700">{log.userId?.name}</span>
                                                            <span className="block text-gray-400 text-[10px]">Submitted {format(new Date(log.createdAt), 'MMM dd')}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Sidebar Stats */}
                <div className="lg:w-80 space-y-6">
                    {/* Filters Sidebar (Only in Dashboard or Pending Reviews or All logs) */}
                    {(activeTab === 'dashboard' || activeTab === 'pending_reviews' || activeTab === 'all_logs') && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6 sticky top-24">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Filter className="w-5 h-5 text-indigo-600" />
                                Data Filters
                            </h3>

                            <div className="space-y-4">
                                {activeTab === 'dashboard' && (
                                    <>
                                        <div>
                                            <label className="label text-[10px] uppercase font-bold text-gray-400">Time Period</label>
                                            <div className="grid grid-cols-2 gap-2 mt-1.5">
                                                {['last_7_days', 'last_30_days', 'today'].map((p) => (
                                                    <button
                                                        key={p}
                                                        onClick={() => {
                                                            const start = new Date();
                                                            if (p === 'last_7_days') start.setDate(start.getDate() - 7);
                                                            if (p === 'last_30_days') start.setDate(start.getDate() - 30);
                                                            setFilters({
                                                                ...filters,
                                                                preset: p,
                                                                startDate: format(start, 'yyyy-MM-dd'),
                                                                endDate: format(new Date(), 'yyyy-MM-dd')
                                                            });
                                                        }}
                                                        className={clsx(
                                                            "px-2 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border",
                                                            filters.preset === p ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                                                        )}
                                                    >
                                                        {p.replace(/_/g, ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <div>
                                                <label className="label text-[10px] uppercase font-bold text-gray-400">From</label>
                                                <input 
                                                    type="date"
                                                    value={filters.startDate}
                                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value, preset: 'custom' })}
                                                    className="input py-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="label text-[10px] uppercase font-bold text-gray-400">To</label>
                                                <input 
                                                    type="date"
                                                    value={filters.endDate}
                                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value, preset: 'custom' })}
                                                    className="input py-2 text-xs"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="label text-[10px] uppercase font-bold text-gray-400">Project</label>
                                    <select 
                                        className="input py-2 text-xs mt-1"
                                        value={filters.projectId}
                                        onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                                    >
                                        <option value="">All Projects</option>
                                        {filterOptions.projects.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="label text-[10px] uppercase font-bold text-gray-400">Module</label>
                                    <select 
                                        className="input py-2 text-xs mt-1"
                                        value={filters.moduleId}
                                        onChange={(e) => setFilters({ ...filters, moduleId: e.target.value })}
                                    >
                                        <option value="">All Modules</option>
                                        {filterOptions.modules
                                            .filter((m: any) => !filters.projectId || m.projectId === filters.projectId)
                                            .map((m: any) => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>

                                {isAdmin && (
                                    <div>
                                        <label className="label text-[10px] uppercase font-bold text-gray-400">Employee</label>
                                        <select 
                                            className="input py-2 text-xs mt-1"
                                            value={filters.userId}
                                            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                                        >
                                            <option value="">All Employees</option>
                                            {filterOptions.users.map((u: any) => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => setFilters({
                                    preset: 'last_30_days',
                                    startDate: format(new Date().setDate(new Date().getDate() - 30), 'yyyy-MM-dd'),
                                    endDate: format(new Date(), 'yyyy-MM-dd'),
                                    projectId: '',
                                    moduleId: '',
                                    userId: ''
                                })}
                                className="w-full py-3 text-[10px] font-bold uppercase text-gray-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 border border-dashed border-gray-200 rounded-xl"
                            >
                                <XCircle className="w-3 h-3" />
                                Reset Filters
                            </button>
                        </div>
                    )}

                    {activeTab === 'my_logs' && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6 sticky top-24">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Timer className="w-5 h-5 text-indigo-600" />
                                Work Summary
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <span className="text-sm font-medium text-gray-600">Total Hours</span>
                                    <span className="text-lg font-bold text-gray-900">
                                        {logs.reduce((acc, log) => acc + (log.hoursSpent || 0), 0).toFixed(1)}h
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-100">
                                    <span className="text-sm font-medium text-green-700">Approved</span>
                                    <span className="text-lg font-bold text-green-800">
                                        {logs.filter(l => l.status === 'approved').length}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-100">
                                    <span className="text-sm font-medium text-orange-700">Pending Review</span>
                                    <span className="text-lg font-bold text-orange-800">
                                        {logs.filter(l => l.status === 'pending').length}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                                <h4 className="font-bold text-sm mb-1">Quick Tip</h4>
                                <p className="text-xs text-indigo-100 leading-relaxed">
                                    Always include proof links (PRs, Jira, Figma) to speed up the manager approval process.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {viewTaskId && <TaskDetailModal taskId={viewTaskId} onClose={() => setViewTaskId(null)} />}

            {/* Review Modal */}
            {reviewingLog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                            <h3 className="font-bold text-gray-900">Review Work Submission</h3>
                            <button onClick={() => setReviewingLog(null)} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
                                <XCircle className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border border-indigo-200">
                                        {reviewingLog.userId?.photoUrl ? (
                                            <img src={reviewingLog.userId.photoUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-5 h-5 text-indigo-300" />
                                        )}
                                    </div>
                                    <div>
                                        <span className="block font-bold text-indigo-900">{reviewingLog.userId?.name}</span>
                                        <span className="block text-xs text-indigo-600">{reviewingLog.hoursSpent} Hours • {format(new Date(reviewingLog.workDate), 'MMM dd, yyyy')}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-indigo-800 italic leading-relaxed break-words break-all whitespace-pre-wrap">
                                    &quot;{reviewingLog.description}&quot;
                                </p>
                                
                                {reviewingLog.links && reviewingLog.links.length > 0 && (
                                    <div className="mt-3">
                                        <span className="text-xs font-bold text-indigo-400 mb-1 block">Proof Links</span>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {reviewingLog.links.map((link: string, i: number) => (
                                                <a 
                                                    key={i} 
                                                    href={link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 bg-white border border-indigo-100 px-2 py-1 rounded hover:bg-indigo-50"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    {(() => { try { return new URL(link).hostname; } catch(e) { return link; } })()}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {reviewingLog.attachmentUrls && reviewingLog.attachmentUrls.length > 0 && (
                                    <div className="mt-3">
                                        <span className="text-xs font-bold text-indigo-400 mb-1 block">Attachments</span>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {reviewingLog.attachmentUrls.map((url: string, i: number) => (
                                                <a 
                                                    key={i} 
                                                    href={url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 bg-white border border-indigo-100 px-2 py-1 rounded hover:bg-indigo-50"
                                                >
                                                    <Paperclip className="w-3 h-3" />
                                                    Attachment {i + 1}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {reviewingLog.taskId && (
                                    <div className="mt-4 pt-4 border-t border-indigo-100/50">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1 block">Task Information</span>
                                                <div 
                                                    className="font-semibold text-indigo-900 text-sm cursor-pointer hover:underline"
                                                    onClick={() => setViewTaskId(reviewingLog.taskId?.id)}
                                                >
                                                    {reviewingLog.taskId?.title}
                                                </div>
                                                <div className="text-xs text-indigo-600 mt-1 flex items-center gap-2">
                                                    <span className="flex items-center gap-1"><Timer className="w-3 h-3"/> {reviewingLog.taskId?.estimatedHours || 0}h est.</span>
                                                    {reviewingLog.taskId?.priority && (
                                                        <span className="capitalize px-1.5 py-0.5 bg-indigo-100 rounded text-[10px] font-bold">
                                                            {reviewingLog.taskId.priority}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setViewTaskId(reviewingLog.taskId?.id)}
                                                className="shrink-0 text-xs flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 font-semibold px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="label">Review Comments (Optional)</label>
                                <textarea 
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder="Add feedback for the employee..."
                                    rows={3}
                                    className="input resize-none"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50 shrink-0">
                            <button 
                                onClick={() => handleReview(reviewingLog.id, 'rejected')}
                                disabled={isReviewLoading}
                                className="flex-1 py-3 px-4 bg-white border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <XCircle className="w-4 h-4" />
                                Reject Log
                            </button>
                            <button 
                                onClick={() => handleReview(reviewingLog.id, 'approved')}
                                disabled={isReviewLoading}
                                className="flex-[2] py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Approve Progress
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Log Work Modal */}
            {showLogModal && (
                <LogWorkModal 
                    onClose={() => setShowLogModal(false)}
                    onSuccess={() => {
                        setShowLogModal(false);
                        fetchLogs();
                    }}
                />
            )}

            {/* Task Detail Modal */}
            {viewTaskId && (
                <TaskDetailModal 
                    taskId={viewTaskId}
                    onClose={() => setViewTaskId(null)}
                    onUpdated={() => {}} 
                />
            )}
        </div>
    );
}


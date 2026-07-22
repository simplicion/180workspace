'use client';


import { LogoLoader } from "@workspace/ui";
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Activity, Clock, Filter, Search, Calendar, User, ArrowUpRight, Bell, CheckCircle2, AlertCircle, DollarSign, Briefcase, Users, FileText, Settings, RefreshCw, ChevronLeft, ChevronRight, Download, CalendarRange, ClipboardList, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { formatDistanceToNow, format } from 'date-fns';
import LogWorkModal from '@/app/dashboard/(projects-and-tasks-app)/_components/LogWorkModal';

const ACTION_COLORS: Record<string, string> = {
    'CREATE': 'text-emerald-600 bg-emerald-50',
    'UPDATE': 'text-blue-600 bg-blue-50',
    'DELETE': 'text-rose-600 bg-rose-50',
    'LOGIN': 'text-indigo-600 bg-indigo-50',
    'LOGOUT': 'text-gray-600 bg-gray-50',
    'PASSWORD_CHANGE': 'text-amber-600 bg-amber-50',
};

interface ActivityLog {
    _id: string;
    eventType: string;
    description: string;
    timestamp: string;
    triggeredBy?: {
        name: string;
        email: string;
        photoUrl?: string;
        role: string;
    } | null;
    isNotification: boolean;
    metadata?: any;
    title?: string;
}

const EVENT_TYPES = [
    { label: 'All Events', value: '' },
    { label: 'System', value: 'system' },
    { label: 'CRM/Sales', value: 'sales' },
    { label: 'Financial', value: 'finance' },
    { label: 'HR & People', value: 'hr' },
    { label: 'Projects', value: 'project' },
];

export default function GlobalActivityPage({ mobileLayout = false }: { mobileLayout?: boolean }) {
    const { user } = useAuth();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState({ eventType: '', startDate: '', endDate: '', page: 1 });
    const [searchTerm, setSearchTerm] = useState('');
    const [totalLogs, setTotalLogs] = useState(0);
    const [showLogModal, setShowLogModal] = useState(false);
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'activity' | 'audit'>('activity');

    // Audit State
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loadingAudit, setLoadingAudit] = useState(false);
    const [auditPage, setAuditPage] = useState(1);
    const [auditTotalPages, setAuditTotalPages] = useState(1);
    const [auditSearch, setAuditSearch] = useState('');

    const fetchLogs = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const { data } = await api.get('/api/activity', {
                params: {
                    eventType: filter.eventType || undefined,
                    startDate: filter.startDate || undefined,
                    endDate: filter.endDate || undefined,
                    page: filter.page,
                    limit: 20
                }
            });
            setLogs(data.logs || []);
            setTotalLogs(data.total || 0);
        } catch (error) {
            toast.error('Failed to load activity feed');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter]);

    const fetchAuditLogs = useCallback(async (page: number = 1, forceRefresh = false) => {
        if (forceRefresh) setRefreshing(true);
        else setLoadingAudit(true);
        try {
            const { data } = await api.get('/api/audit', { 
                params: { 
                    page, 
                    limit: 50,
                    action: auditSearch || undefined
                } 
            });
            setAuditLogs(data.logs || []);
            setAuditTotalPages(data.pages || 1);
            setAuditPage(page);
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to fetch audit logs');
        } finally {
            setLoadingAudit(false);
            setRefreshing(false);
        }
    }, [auditSearch]);

    const exportToCSV = async () => {
        try {
            const toastId = toast.loading('Exporting logs...');
            const { data } = await api.get('/api/activity', {
                params: {
                    eventType: filter.eventType || undefined,
                    startDate: filter.startDate || undefined,
                    endDate: filter.endDate || undefined,
                    page: 1,
                    limit: 1000
                }
            });
            const exportLogs = data.logs || [];
            if (exportLogs.length === 0) {
                toast.error('No logs to export', { id: toastId });
                return;
            }
            
            const headers = ['Date', 'Time', 'Event Type', 'Description', 'Triggered By (Name)', 'Triggered By (Role)'];
            const csvRows = exportLogs.map((l: any) => {
                const date = new Date(l.timestamp).toLocaleDateString();
                const time = new Date(l.timestamp).toLocaleTimeString();
                return [
                    date,
                    time,
                    l.eventType || 'N/A',
                    `"${(l.description || '').replace(/"/g, '""')}"`,
                    l.triggeredBy?.name || 'System',
                    l.triggeredBy?.role || 'N/A'
                ].join(',');
            });
            
            const csvContent = [headers.join(','), ...csvRows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `activity_audit_${new Date().getTime()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Export successful', { id: toastId });
        } catch (error) {
            toast.error('Failed to export CSV');
        }
    };

    useEffect(() => {
        if (activeTab === 'activity') {
            fetchLogs();
        } else {
            fetchAuditLogs(1);
        }
    }, [fetchLogs, fetchAuditLogs, activeTab]);

    const getEventIcon = (type: string, isNotification: boolean) => {
        if (isNotification) return <Bell className="w-4 h-4 text-amber-500" />;
        
        const t = type?.toLowerCase() || '';
        if (t.includes('invoice') || t.includes('payment') || t.includes('budget')) return <DollarSign className="w-4 h-4 text-emerald-500" />;
        if (t.includes('lead') || t.includes('deal') || t.includes('sale')) return <TrendingUpIcon className="w-4 h-4 text-blue-500" />;
        if (t.includes('project') || t.includes('task')) return <Briefcase className="w-4 h-4 text-indigo-500" />;
        if (t.includes('employee') || t.includes('user') || t.includes('hire')) return <Users className="w-4 h-4 text-purple-500" />;
        if (t.includes('login') || t.includes('setup') || t.includes('config')) return <Settings className="w-4 h-4 text-gray-500" />;
        
        return <Activity className="w-4 h-4 text-gray-400" />;
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = (now.getTime() - date.getTime()) / 1000;

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const filteredLogs = logs.filter(log => 
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.triggeredBy?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Activity Hub</h1>
                        <p className="text-sm text-gray-500">Cross-platform event monitoring and system audit logs</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowLogModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Clock className="w-4 h-4" />
                        Log Your Work
                    </button>
                    <button 
                        onClick={exportToCSV}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button 
                        onClick={() => activeTab === 'activity' ? fetchLogs(true) : fetchAuditLogs(auditPage, true)}
                        disabled={refreshing}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Minimal Underline Tabs */}
            <div className="flex items-center gap-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('activity')}
                    className={clsx(
                        "pb-3 text-sm font-semibold transition-all relative flex items-center gap-2",
                        activeTab === 'activity' ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    <Activity className="w-4 h-4" />
                    Activity Feed
                    {activeTab === 'activity' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    className={clsx(
                        "pb-3 text-sm font-semibold transition-all relative flex items-center gap-2",
                        activeTab === 'audit' ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    <ClipboardList className="w-4 h-4" />
                    Audit Logs
                    {activeTab === 'audit' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
                    )}
                </button>
            </div>

            {activeTab === 'activity' && (
                <>
                    {/* Professional Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Results</p>
                                <p className="text-2xl font-bold text-gray-900">{totalLogs === 0 && loading ? '-' : totalLogs.toLocaleString()}</p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Activity className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Alerts In View</p>
                                <p className="text-2xl font-bold text-gray-900">{loading ? '-' : logs.filter(l => l.isNotification).length}</p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Bell className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Timeframe</p>
                                <p className="text-lg font-bold text-gray-900 leading-tight">
                                    {filter.startDate ? new Date(filter.startDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'All Time'} 
                                    {filter.endDate ? ` - ${new Date(filter.endDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}` : ''}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Unified Filter Toolbar */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                {/* Search */}
                <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 w-full xl:max-w-sm">
                    <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                    <input 
                        type="text" 
                        placeholder={activeTab === 'activity' ? "Search activity timeline..." : "Search audit action..."}
                        className="bg-transparent border-none focus:ring-0 text-sm py-0 px-1 w-full text-gray-800 placeholder-gray-400"
                        value={activeTab === 'activity' ? searchTerm : auditSearch}
                        onChange={(e) => activeTab === 'activity' ? setSearchTerm(e.target.value) : setAuditSearch(e.target.value)}
                    />
                </div>
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 xl:ml-auto">
                    {/* Event Type Pills (Activity Tab Only) */}
                    {activeTab === 'activity' && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 hidden-scrollbar">
                            {EVENT_TYPES.map(type => (
                                <button
                                    key={type.value}
                                    onClick={() => setFilter(f => ({ ...f, eventType: type.value, page: 1 }))}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border",
                                        filter.eventType === type.value
                                            ? "bg-gray-900 text-white border-gray-900"
                                            : "bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {/* Date Range (Activity Tab Only) */}
                    {activeTab === 'activity' && (
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 px-2.5 py-1.5">
                                <CalendarRange className="w-3.5 h-3.5 text-gray-400 mr-2" />
                                <input 
                                    type="date" 
                                    className="bg-transparent border-none focus:ring-0 text-xs text-gray-700 p-0 m-0 h-auto font-medium"
                                    value={filter.startDate}
                                    onChange={(e) => setFilter(f => ({ ...f, startDate: e.target.value, page: 1 }))}
                                />
                            </div>
                            <span className="text-gray-400 text-xs font-medium">to</span>
                            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 px-2.5 py-1.5">
                                <input 
                                    type="date" 
                                    className="bg-transparent border-none focus:ring-0 text-xs text-gray-700 p-0 m-0 h-auto font-medium"
                                    value={filter.endDate}
                                    onChange={(e) => setFilter(f => ({ ...f, endDate: e.target.value, page: 1 }))}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Timeline Feed */}
            {activeTab === 'activity' ? (
                <>
                    <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute left-[21px] top-6 bottom-6 w-0.5 bg-gray-100 hidden sm:block" />

                        <div className="space-y-4">
                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <ActivitySkeleton key={i} />
                                    ))}
                                </div>
                            ) : filteredLogs.length > 0 ? (
                                <AnimatePresence mode="popLayout">
                                    {filteredLogs.map((log, idx) => (
                                        <motion.div
                                            key={log._id || idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="relative flex items-start gap-3 group"
                                        >
                                            {/* Icon Column */}
                                            <div className="relative z-10 flex-shrink-0 mt-1 hidden sm:block">
                                                <div className={clsx(
                                                    "w-9 h-9 rounded-lg flex items-center justify-center border-[3px] border-gray-50 transition-all group-hover:scale-110 shadow-sm",
                                                    log.isNotification ? "bg-amber-50 text-amber-600" : "bg-white text-gray-600"
                                                )}>
                                                    {getEventIcon(log.eventType, log.isNotification)}
                                                </div>
                                            </div>

                                            {/* Content Card */}
                                            <div className="flex-1 card p-3 hover:shadow-md hover:border-indigo-100 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    {/* Mobile User Avatar */}
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0 sm:hidden">
                                                        {log.triggeredBy?.photoUrl ? (
                                                            <img src={log.triggeredBy.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                                {log.triggeredBy?.name?.[0] || 'S'}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1 flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs font-black text-gray-900">
                                                                {log.isNotification ? (log.title || 'Notification') : (log.eventType.replace(/_/g, ' ').toUpperCase())}
                                                            </span>
                                                            <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                {log.isNotification ? 'Alert' : 'System'}
                                                            </span>
                                                            <span className="text-[9px] text-gray-400 flex items-center gap-1" title={new Date(log.timestamp).toLocaleString()}>
                                                                <Clock className="w-2.5 h-2.5" />
                                                                {formatTime(log.timestamp)}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-600 text-xs leading-relaxed">
                                                            {log.description}
                                                        </p>
                                                        
                                                        {/* Enhanced Metadata Context */}
                                                        {log.metadata && Object.keys(log.metadata).length > 0 && !(Object.keys(log.metadata).length === 1 && log.metadata.actionUrl) && (
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 pt-1.5 border-t border-gray-50">
                                                                {log.metadata.projectName && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold">
                                                                        <Briefcase className="w-2.5 h-2.5" />
                                                                        {log.metadata.projectName}
                                                                    </span>
                                                                )}
                                                                {log.metadata.taskTitle && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded font-semibold">
                                                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                                                        {log.metadata.taskTitle}
                                                                    </span>
                                                                )}
                                                                {log.metadata.dealTitle && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                                                                        <DollarSign className="w-2.5 h-2.5" />
                                                                        {log.metadata.dealTitle}{log.metadata.dealValue ? ` — $${Number(log.metadata.dealValue).toLocaleString()}` : ''}
                                                                    </span>
                                                                )}
                                                                {log.metadata.assignedTo && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-semibold">
                                                                        <User className="w-2.5 h-2.5" />
                                                                        Assigned to {log.metadata.assignedTo}
                                                                    </span>
                                                                )}
                                                                {(log.metadata.oldStatus || log.metadata.newStatus) && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold">
                                                                        <ArrowUpRight className="w-2.5 h-2.5" />
                                                                        {log.metadata.oldStatus ? `${log.metadata.oldStatus.replace(/_/g, ' ')} → ` : ''}{(log.metadata.newStatus || '').replace(/_/g, ' ')}
                                                                    </span>
                                                                )}
                                                                {log.metadata.clientName && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-semibold">
                                                                        <Users className="w-2.5 h-2.5" />
                                                                        {log.metadata.clientName}
                                                                    </span>
                                                                )}
                                                                {log.metadata.invoiceNumber && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-semibold">
                                                                        <FileText className="w-2.5 h-2.5" />
                                                                        Invoice #{log.metadata.invoiceNumber}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        
                                                        {/* Action Links */}
                                                        {log.metadata?.actionUrl && (
                                                            <a 
                                                                href={log.metadata.actionUrl}
                                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 mt-1.5 bg-indigo-50 px-2 py-0.5 rounded-lg"
                                                            >
                                                                View Details
                                                                <ArrowUpRight className="w-2.5 h-2.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* User Column (Desktop) */}
                                                <div className="hidden sm:flex items-center gap-2 bg-gray-50/80 px-3 py-1.5 rounded-lg min-w-[160px] flex-shrink-0">
                                                    <div className="w-7 h-7 rounded-full border-2 border-white shadow-sm overflow-hidden bg-white flex-shrink-0">
                                                        {log.triggeredBy?.photoUrl ? (
                                                            <img src={log.triggeredBy.photoUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600 text-[9px] font-black">
                                                                {log.triggeredBy?.name?.[0]?.toUpperCase() || 'S'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-bold text-gray-900 truncate">{log.triggeredBy?.name || 'System Auto'}</p>
                                                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight truncate">{log.triggeredBy?.role || 'Automation'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            ) : (
                                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                                    <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                    <h3 className="text-sm font-bold text-gray-900">No activity found</h3>
                                    <p className="text-gray-500 text-xs mt-1">There are no logs matching your current filter criteria.</p>
                                    <button 
                                        onClick={() => { setFilter({ eventType: '', startDate: '', endDate: '', page: 1 }); setSearchTerm(''); }}
                                        className="text-indigo-600 text-xs font-bold mt-3 hover:underline"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalLogs > 20 && (
                        <div className="flex items-center justify-center gap-2 pb-10">
                            <button 
                                disabled={filter.page === 1}
                                onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))}
                                className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 disabled:opacity-50"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-gray-500 px-4">
                                Page {filter.page} of {Math.ceil(totalLogs / 20)}
                            </span>
                            <button 
                                disabled={filter.page >= Math.ceil(totalLogs / 20)}
                                onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))}
                                className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 disabled:opacity-50"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                    <AuditLogsList 
                        logs={auditLogs} 
                        loading={loadingAudit} 
                        page={auditPage}
                        totalPages={auditTotalPages}
                        onPageChange={fetchAuditLogs}
                    />
                </div>
            )}
            {/* Log Work Modal */}
            {showLogModal && (
                <LogWorkModal 
                    onClose={() => setShowLogModal(false)}
                    onSuccess={() => {
                        setShowLogModal(false);
                        fetchLogs();
                        // Also trigger a refresh of the events to show the new submission log (audit)
                        setTimeout(() => fetchLogs(true), 1000);
                    }}
                />
            )}
        </div>
    );
}

function ActivitySkeleton() {
    return (
        <div className="flex items-start gap-4 animate-pulse">
            <div className="w-11 h-11 rounded-xl bg-gray-100 hidden sm:block" />
            <div className="flex-1 h-20 bg-gray-50 rounded-2xl border border-gray-100" />
        </div>
    );
}

function TrendingUpIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>;
}

function AuditLogsList({ logs, loading, page, totalPages, onPageChange }: any) {
    if (loading && logs.length === 0) return (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
            <LogoLoader className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="text-sm font-medium text-gray-500 tracking-wide">Fetching system logs...</p>
        </div>
    );

    return (
        <div className="relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
                    <LogoLoader className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            )}
            <div className="overflow-x-auto hidden-scrollbar">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="py-4 px-6 text-[13px] font-semibold text-gray-500">Time</th>
                            <th className="py-4 px-6 text-[13px] font-semibold text-gray-500">User</th>
                            <th className="py-4 px-6 text-[13px] font-semibold text-gray-500">Action</th>
                            <th className="py-4 px-6 text-[13px] font-semibold text-gray-500">Resource</th>
                            <th className="py-4 px-6 text-[13px] font-semibold text-gray-500">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                                            <ClipboardList className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <p className="text-gray-500 font-medium text-sm">No logs recorded</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            logs.map((log: any) => {
                                const actionKey = Object.keys(ACTION_COLORS).find(k => log.action.includes(k)) || 'LOGOUT';
                                return (
                                    <tr key={log.id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {format(new Date(log.createdAt), 'MMM d, yyyy • HH:mm:ss')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-600 shadow-sm">
                                                    {log.user?.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-medium text-gray-900">{log.user?.name || 'Unknown'}</span>
                                                    <span className="text-xs text-gray-500 capitalize">{log.user?.role?.replace(/_/g, ' ').toLowerCase() || 'User'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={clsx(
                                                "inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider",
                                                ACTION_COLORS[actionKey]
                                            )}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-0.5 max-w-[280px]">
                                                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{log.resourceType || '-'}</span>
                                                {(log.details?.title || log.details?.name) ? (
                                                    <span className="text-sm font-medium text-gray-900 truncate" title={log.details.title || log.details.name}>
                                                        {log.details.title || log.details.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-mono text-gray-500 truncate" title={log.resourceId}>
                                                        {log.resourceId}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            {Object.keys(log.details || {}).length > 0 ? (
                                                <div className="flex items-center gap-2 group/info cursor-help" title={JSON.stringify(log.details, null, 2)}>
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 group-hover/info:text-indigo-600 group-hover/info:border-indigo-200 group-hover/info:bg-indigo-50/50 transition-all shadow-sm">
                                                        <Info className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[13px] text-gray-500 font-mono truncate max-w-[120px]">
                                                        {JSON.stringify(log.details).substring(0, 30)}...
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[13px] text-gray-400 italic pl-2">No extra details</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
                    <span className="text-sm text-gray-500">
                        Showing page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => onPageChange(page - 1)}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => onPageChange(page + 1)}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}


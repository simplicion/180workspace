'use client';


import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
    Users, User, Search, Trash2, AlertCircle, Loader2, 
    ArrowLeft, Shield, CheckCircle2, XCircle, 
    ChevronDown, MoreHorizontal, UserMinus, UserCheck,
    ClipboardList, Filter, Calendar, Info, RefreshCw
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import clsx from 'clsx';
import { formatDistanceToNow, format } from 'date-fns';

const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-rose-50 text-rose-600 border-rose-100',
    manager: 'bg-purple-50 text-purple-600 border-purple-100',
    hr: 'bg-blue-50 text-blue-600 border-blue-100',
    employee: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    client: 'bg-amber-50 text-amber-600 border-amber-100',
};

const ACTION_COLORS: Record<string, string> = {
    'CREATE': 'text-emerald-600 bg-emerald-50',
    'UPDATE': 'text-blue-600 bg-blue-50',
    'DELETE': 'text-rose-600 bg-rose-50',
    'LOGIN': 'text-indigo-600 bg-indigo-50',
    'LOGOUT': 'text-gray-600 bg-gray-50',
    'PASSWORD_CHANGE': 'text-amber-600 bg-amber-50',
};

type ActiveTab = 'members' | 'logs';

export default function UserManagementPage() {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<ActiveTab>('members');
    
    // Member State
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [userSearch, setUserSearch] = useState('');
    const [updating, setUpdating] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    // Audit State
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logPage, setLogPage] = useState(1);
    const [logTotalPages, setLogTotalPages] = useState(1);
    const [logActionFilter, setLogActionFilter] = useState('');
    const [logUserFilter, setLogUserFilter] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const { data } = await api.get('/api/users', { params: { limit: 200 } });
            setUsers(data.users || []);
        } catch (error) {
            toast.error('Failed to fetch users');
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    const fetchLogs = useCallback(async (page: number = 1) => {
        setLoadingLogs(true);
        try {
            const { data } = await api.get('/api/audit', { 
                params: { 
                    page, 
                    limit: 50,
                    action: logActionFilter || undefined,
                    userId: logUserFilter || undefined
                } 
            });
            setLogs(data.logs || []);
            setLogTotalPages(data.pages || 1);
            setLogPage(page);
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to fetch audit logs');
        } finally {
            setLoadingLogs(false);
        }
    }, [logActionFilter, logUserFilter]);

    useEffect(() => {
        if (activeTab === 'members') fetchUsers();
        else fetchLogs(1);
    }, [activeTab, fetchUsers, fetchLogs]);

    async function toggleUserStatus(userId: string, currentStatus: boolean) {
        setUpdating(userId);
        try {
            await api.put(`/api/users/${userId}`, { isActive: !currentStatus });
            setUsers(prev => prev.map(u => (u as any).id === userId ? { ...u, isActive: !currentStatus } : u));
            toast.success(currentStatus ? 'User blocked' : 'User unblocked');
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to update status');
        } finally {
            setUpdating(null);
        }
    }

    async function deleteUser(userId: string) {
        setUpdating(userId);
        try {
            await api.delete(`/api/users/${userId}`);
            setUsers(prev => prev.filter(u => u.id !== userId));
            toast.success('User permanently removed');
            setConfirmDelete(null);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to delete user');
        } finally {
            setUpdating(null);
        }
    }

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <Link 
                        href="/dashboard/settings/system-configs"
                        className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to System Configs
                    </Link>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Users className="w-6 h-6" />
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">User Management</h1>
                        </div>
                        <p className="text-gray-500 font-medium">Monitoring access and security across the platform</p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1 bg-gray-100 rounded-2xl w-full md:w-max">
                    <button
                        onClick={() => setActiveTab('members')}
                        className={clsx(
                            "flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                            activeTab === 'members' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <Users className="w-4 h-4" />
                        Members
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={clsx(
                            "flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                            activeTab === 'logs' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <ClipboardList className="w-4 h-4" />
                        Audit Logs
                    </button>
                </div>
            </div>

            {/* Filters Area */}
            {activeTab === 'members' ? (
                <div className="relative group max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-[20px] shadow-sm text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                    />
                </div>
            ) : (
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative group flex-1 min-w-[240px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Filter by action..."
                            value={logActionFilter}
                            onChange={(e) => setLogActionFilter(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-medium focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <div className="relative group flex-1 min-w-[240px]">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={logUserFilter}
                            onChange={(e) => setLogUserFilter(e.target.value)}
                            aria-label="Filter logs by user"
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-medium appearance-none focus:border-indigo-500 transition-all"
                        >
                            <option value="">All Users</option>
                            {users.map(u => (
                                <option key={(u as any).id} value={(u as any).id}>{u.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    <button 
                        onClick={() => fetchLogs(1)}
                        aria-label="Refresh audit logs"
                        className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"
                    >
                        <RefreshCw className={clsx("w-5 h-5", loadingLogs && "animate-spin")} />
                    </button>
                </div>
            )}

            {/* Content Area */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                {activeTab === 'members' ? (
                    <MembersTable 
                        users={filteredUsers} 
                        loading={loadingUsers} 
                        currentUser={currentUser} 
                        updating={updating}
                        onToggleStatus={toggleUserStatus}
                        onDelete={(id) => setConfirmDelete(id)}
                    />
                ) : (
                    <AuditLogsList 
                        logs={logs} 
                        loading={loadingLogs} 
                        page={logPage}
                        totalPages={logTotalPages}
                        onPageChange={fetchLogs}
                    />
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
                    <div className="bg-white rounded-[40px] p-10 w-full max-w-md relative shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-[24px] bg-rose-50 flex items-center justify-center mb-6 mx-auto">
                            <AlertCircle className="w-8 h-8 text-rose-500" />
                        </div>
                        <h4 className="text-2xl font-black text-gray-900 text-center mb-3">Remove this member?</h4>
                        <p className="text-gray-500 text-center mb-8 font-medium px-4">
                            You&apos;re about to permanently remove <b className="text-gray-900"> {users.find(u => (u as any).id === confirmDelete)?.name} </b> from the company workspace. This action cannot be undone.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 px-6 py-4 text-sm font-black text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={() => deleteUser(confirmDelete)}
                                disabled={updating === confirmDelete}
                                className="flex-1 px-6 py-4 text-sm font-black text-white bg-rose-500 hover:bg-rose-600 rounded-2xl shadow-xl shadow-rose-200 transition-all flex items-center justify-center gap-2"
                            >
                                {updating === confirmDelete ? <Loader2 className="w-4 h-4 animate-spin" /> : 'REMOVE USER'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ──── Sub-Components ──── */

function MembersTable({ users, loading, currentUser, updating, onToggleStatus, onDelete }: any) {
    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading members...</p>
        </div>
    );

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/30">
                        <th className="py-5 px-8 text-[11px] font-black uppercase tracking-widest text-gray-400">User Profile</th>
                        <th className="py-5 px-8 text-[11px] font-black uppercase tracking-widest text-gray-400">Role & Dept</th>
                        <th className="py-5 px-8 text-[11px] font-black uppercase tracking-widest text-gray-400">Account Status</th>
                        <th className="py-5 px-8 text-[11px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {users.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="py-24 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                                        <Users className="w-8 h-8 text-gray-200" />
                                    </div>
                                    <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">No members found</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        users.map((u: any) => (
                            <tr key={u.id} className="group hover:bg-indigo-50/30 transition-colors">
                                <td className="py-5 px-8">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-200/50">
                                                {u.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div className={clsx(
                                                "absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full shadow-sm",
                                                u.isActive ? "bg-emerald-500" : "bg-rose-500"
                                            )} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{u.name}</h4>
                                            <p className="text-xs text-gray-400 font-medium">{u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-5 px-8">
                                    <div className="flex items-center gap-2">
                                        <span className={clsx(
                                            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                                            ROLE_COLORS[u.role as string] || 'bg-gray-50 text-gray-600 border-gray-100'
                                        )}>
                                            {u.role}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1 bg-gray-50 rounded-lg">
                                            {u.department || 'General'}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-5 px-8">
                                    <div className={clsx(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all w-max",
                                        u.isActive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                    )}>
                                        {u.isActive ? <UserCheck className="w-3 h-3" /> : <UserMinus className="w-3 h-3" />}
                                        {u.isActive ? 'Active' : 'Blocked'}
                                    </div>
                                </td>
                                <td className="py-5 px-8">
                                    <div className="flex items-center justify-end gap-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                        {currentUser?.id !== u.id && (
                                            <>
                                                <button
                                                    onClick={() => onToggleStatus(u.id, u.isActive)}
                                                    className={clsx(
                                                        "p-2 rounded-xl border transition-all",
                                                        u.isActive ? "border-rose-100 text-rose-400 hover:bg-rose-50 hover:text-rose-600" : "border-emerald-100 text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
                                                    )}
                                                    title={u.isActive ? "Block User" : "Unblock User"}
                                                >
                                                    {u.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => onDelete(u.id)}
                                                    className="p-2 border border-gray-100 text-gray-400 hover:border-red-100 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Permanently Remove"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                        {updating === u.id && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

function AuditLogsList({ logs, loading, page, totalPages, onPageChange }: any) {
    if (loading && logs.length === 0) return (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Fetching system logs...</p>
        </div>
    );

    return (
        <div className="relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-50 bg-gray-50/30">
                            <th className="py-5 px-8 text-[11px] font-black uppercase tracking-widest text-gray-400">Time</th>
                            <th className="py-5 px-8 text-[11px] font-black uppercase tracking-widest text-gray-400">User</th>
                            <th className="py-5 px-8 text-[11px] font-black uppercase tracking-widest text-gray-400">Action</th>
                            <th className="py-5 px-8 text-[11px] font-black uppercase tracking-widest text-gray-400">Resource</th>
                            <th className="py-5 px-8 text-[11px] font-black uppercase tracking-widest text-gray-400">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                                            <ClipboardList className="w-8 h-8 text-gray-200" />
                                        </div>
                                        <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">No logs recorded</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            logs.map((log: any) => {
                                const actionKey = Object.keys(ACTION_COLORS).find(k => log.action.includes(k)) || 'LOGOUT';
                                return (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-8">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-900">
                                                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-8">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                    {log.userId?.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-700">{log.userId?.name || 'Unknown'}</span>
                                                    <span className="text-[10px] text-gray-400">{log.userId?.role || 'user'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-8">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                                ACTION_COLORS[actionKey]
                                            )}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-8">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">{log.resourceType || '-'}</span>
                                                <span className="text-[9px] font-mono text-gray-400 truncate max-w-[100px]">{log.resourceId}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-8">
                                            <div className="flex items-center gap-2 group/info">
                                                <Info className="w-3.5 h-3.5 text-gray-300 group-hover/info:text-indigo-500 transition-colors cursor-help" />
                                                <span className="text-[11px] text-gray-500 truncate max-w-[200px]" title={JSON.stringify(log.details, null, 2)}>
                                                    {Object.keys(log.details || {}).length > 0 ? JSON.stringify(log.details).substring(0, 50) + '...' : 'No extra details'}
                                                </span>
                                            </div>
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
                <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-gray-50/10">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => onPageChange(page - 1)}
                            className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-900 disabled:opacity-50 hover:bg-gray-50 transition-all"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => onPageChange(page + 1)}
                            className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-900 disabled:opacity-50 hover:bg-gray-50 transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

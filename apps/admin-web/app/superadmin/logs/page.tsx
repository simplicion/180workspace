'use client';

import { useEffect, useState } from 'react';
import { ScrollText, RefreshCw, AlertCircle, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import saApi from '@/lib/superadmin-api';
import toast, { Toaster } from 'react-hot-toast';
import { Skeleton } from '@workspace/ui';

interface AuditLog {
    _id?: string;
    id?: string;
    superAdminId?: { name: string; email: string };
    action: string;
    resource?: string;
    success: boolean;
    ipAddress?: string;
    createdAt: string;
}

export default function SuperAdminLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLogs = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const { data } = await saApi.get('/logs/activity');
            setLogs(data?.logs || []);
        } catch {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchLogs(); }, []);

    return (
        <div className="space-y-6">
            <Toaster position="top-center" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <ScrollText className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Audit & Security Logs</h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Platform-wide administrative activity trail and infrastructure event ledger.
                    </p>
                </div>

                <button
                    onClick={() => fetchLogs(true)}
                    disabled={refreshing}
                    className="p-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2 text-xs font-bold shadow-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh Logs</span>
                </button>
            </div>

            {/* Log Table */}
            <div className="table-wrapper">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Actor / Superadmin</th>
                            <th>Action Executed</th>
                            <th>Target Resource</th>
                            <th>IP Address</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                                    <td className="p-4">
                                        <Skeleton className="h-4 w-28 rounded mb-1" />
                                        <Skeleton className="h-3 w-36 rounded" />
                                    </td>
                                    <td className="p-4"><Skeleton className="h-4 w-32 rounded font-mono" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-24 rounded" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-20 rounded font-mono" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-28 rounded" /></td>
                                </tr>
                            ))
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-16 text-slate-400">
                                    <ScrollText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                    <p className="text-base font-bold text-slate-900 dark:text-white">No audit logs recorded</p>
                                    <p className="text-xs text-slate-500 mt-1">Activity will automatically appear as administrative actions occur.</p>
                                </td>
                            </tr>
                        ) : (
                            logs.map((log, idx) => (
                                <tr key={log.id || log._id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                    <td>
                                        <span className={`text-[11px] font-bold ${log.success ? 'badge-emerald' : 'badge-rose'}`}>
                                            {log.success ? 'Success' : 'Failed'}
                                        </span>
                                    </td>
                                    <td>
                                        <p className="font-bold text-slate-900 dark:text-white text-xs">{log.superAdminId?.name || 'System Auto'}</p>
                                        {log.superAdminId?.email && (
                                            <p className="text-[11px] text-slate-400">{log.superAdminId.email}</p>
                                        )}
                                    </td>
                                    <td>
                                        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="text-slate-600 dark:text-slate-300 text-xs font-medium">
                                        {log.resource || '—'}
                                    </td>
                                    <td className="text-slate-400 dark:text-slate-500 text-xs font-mono">
                                        {log.ipAddress || '127.0.0.1'}
                                    </td>
                                    <td className="text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

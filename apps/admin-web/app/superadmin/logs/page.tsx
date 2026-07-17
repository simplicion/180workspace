'use client';

import { LogoLoader } from "@workspace/ui";
import { useEffect, useState } from 'react';
import { ScrollText, RefreshCw, AlertCircle, CheckCircle, Info } from 'lucide-react';
import saApi from '@/lib/superadmin-api';
import toast, { Toaster } from 'react-hot-toast';

interface AuditLog {
    _id: string;
    id?: string;
    superAdminId?: { name: string; email: string };
    action: string;
    resource?: string;
    success: boolean;
    ipAddress?: string;
    createdAt: string;
}

const statusIcon = (success: boolean) => {
    return success ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />;
};

const statusBadge = (success: boolean) => {
    return (
        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {success ? 'Success' : 'Failure'}
        </span>
    );
};

export default function SuperAdminLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLogs = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const { data } = await saApi.get('/logs/activity');
            setLogs(data.logs || []);
        } catch {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchLogs(); }, []);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <Toaster position="top-center" />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Audit Logs</h1>
                    <p className="text-slate-500 font-medium mt-1 uppercase tracking-wider text-[10px]">Platform-wide activity and system event trail</p>
                </div>
                <button
                    onClick={() => fetchLogs(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors shadow-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Log Table */}
            <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <ScrollText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">System Event Log</h2>
                        <p className="text-xs text-slate-500">{logs.length} records loaded</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <LogoLoader className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <ScrollText className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm font-medium">No log entries found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actor</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Resource</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">IP</th>
                                    <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {statusIcon(log.success)}
                                                {statusBadge(log.success)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-800">{log.superAdminId?.name || 'System'}</p>
                                            {log.superAdminId?.email && <p className="text-xs text-slate-400">{log.superAdminId?.email}</p>}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-indigo-600 font-semibold">{log.action}</td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">{log.resource || '—'}</td>
                                        <td className="px-6 py-4 text-slate-400 text-xs font-mono">{log.ipAddress || '—'}</td>
                                        <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}


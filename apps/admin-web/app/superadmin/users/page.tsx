'use client';

import { useEffect, useState } from 'react';
import { Search, Trash2, UserX, Users, Shield, CheckCircle2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../lib/superadmin-api';
import { useModal } from '../../../lib/modal-context';
import { Skeleton } from '@workspace/ui';

export default function UsersPage() {
    const modal = useModal();
    const [users, setUsers] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await saApi.get('/users', { params: { search, limit: 30 } });
            setUsers(data?.users || []);
            setTotal(data?.total || 0);
        } catch {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [search]);

    const suspend = async (id: string, companyId?: string) => {
        const ok = await modal.confirm({
            title: 'Suspend User',
            message: 'Are you sure you want to suspend this user? They will lose access to the platform immediately.',
            confirmText: 'Suspend',
            variant: 'warning'
        });
        if (!ok) return;

        try {
            await saApi.put(`/users/${id}/suspend`, null, { params: { companyId } });
            toast.success('User suspended');
            load();
        } catch {
            toast.error('Failed to suspend user');
        }
    };

    const del = async (id: string, companyId?: string) => {
        const ok = await modal.confirm({
            title: 'Delete User Permanently?',
            message: 'Are you sure you want to delete this user? All their direct settings and session access will be removed.',
            confirmText: 'Delete User',
            variant: 'danger'
        });
        if (!ok) return;

        try {
            await saApi.delete(`/users/${id}`, { params: { companyId } });
            toast.success('User deleted');
            load();
        } catch {
            toast.error('Failed to delete user');
        }
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-center" />
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Users className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Platform Users</h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {total} total active identities registered across all tenant workspaces.
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="glass-card p-4">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        placeholder="Search by user name or email address..."
                        aria-label="Search users"
                        className="input pl-10 w-full text-xs sm:text-sm" 
                    />
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table className="table">
                    <thead>
                        <tr>
                            <th>User Name</th>
                            <th>Email</th>
                            <th>Workspace / Company</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-9 w-9 rounded-xl" />
                                            <Skeleton className="h-4 w-32 rounded" />
                                        </div>
                                    </td>
                                    <td className="p-4"><Skeleton className="h-4 w-44 rounded" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-32 rounded" /></td>
                                    <td className="p-4"><Skeleton className="h-5 w-16 rounded-md" /></td>
                                    <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                                    <td className="p-4 text-right"><Skeleton className="h-8 w-16 rounded-lg ml-auto" /></td>
                                </tr>
                            ))
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-16 text-slate-400">
                                    <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                    <p className="text-base font-bold text-slate-900 dark:text-white">No users found</p>
                                    <p className="text-xs text-slate-500 mt-1">Try adjusting your search query</p>
                                </td>
                            </tr>
                        ) : (
                            users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                                                {u.name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="text-slate-600 dark:text-slate-300 text-xs font-medium">{u.email}</td>
                                    <td className="text-slate-600 dark:text-slate-400 text-xs font-semibold">{u.companyName || 'System Platform'}</td>
                                    <td>
                                        <span className={`text-[11px] font-bold ${
                                            u.role === 'superadmin' || u.role === 'super_admin' 
                                                ? 'badge-violet' 
                                                : u.role === 'admin' 
                                                ? 'badge-indigo' 
                                                : 'badge-slate'
                                        }`}>
                                            {u.role || 'Member'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`text-[11px] font-bold ${u.isActive !== false ? 'badge-emerald' : 'badge-rose'}`}>
                                            {u.isActive !== false ? 'Active' : 'Suspended'}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex gap-1 justify-end">
                                            <button 
                                                onClick={() => suspend(u.id, u.companyId)} 
                                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-all" 
                                                title="Suspend User" 
                                                aria-label="Suspend User"
                                            >
                                                <UserX className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => del(u.id, u.companyId)} 
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all" 
                                                title="Delete User" 
                                                aria-label="Delete User"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
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

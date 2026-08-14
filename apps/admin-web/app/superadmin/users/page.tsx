'use client';

import { useEffect, useState } from 'react';
import { Search, Trash2, UserX } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../lib/superadmin-api';
import { useModal } from '../../../lib/modal-context';

export default function UsersPage() {
    const modal = useModal();
    const [users, setUsers] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const { data } = await saApi.get('/users', { params: { search, limit: 30 } });
        setUsers(data.users); setTotal(data.total);
        setLoading(false);
    };

    useEffect(() => { load(); }, [search]);

    const suspend = async (id: string, companyId?: string) => {
        if (!await modal.confirm({
            title: 'Suspend User',
            message: 'Are you sure you want to suspend this user? They will lose access immediately.',
            confirmText: 'Suspend',
            variant: 'warning'
        })) return;
        await saApi.put(`/users/${id}/suspend`, null, { params: { companyId } });
        toast.success('User suspended');
        load();
    };

    const del = async (id: string, companyId?: string) => {
        if (!await modal.confirm({
            title: 'Delete User',
            message: 'Are you sure you want to delete this user permanently? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'danger'
        })) return;
        await saApi.delete(`/users/${id}`, { params: { companyId } });
        toast.success('User deleted');
        load();
    };

    return (
        <div className="space-y-5">
            <Toaster position="top-center" />
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-slate-900">All Users</h1><p className="text-slate-500 text-sm mt-1">{total} users across all companies</p></div>
            </div>
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                <input 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    placeholder="Search by name or email..."
                    aria-label="Search users"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm shadow-sm" 
                />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50/50 border-b border-slate-200">{['User', 'Email', 'Company', 'Role', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-5 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? [...Array(5)].map((_, i) => <tr key={i}><td colSpan={6}><div className="h-10 bg-slate-100 rounded animate-pulse mx-5 my-2" /></td></tr>) : users.map(u => (
                            <tr key={u.id} className="hover:bg-sky-50/30 transition-colors group">
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 text-sm font-bold group-hover:bg-sky-100 transition-colors">{u.name?.[0]?.toUpperCase()}</div>
                                        <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-slate-500 text-xs font-medium">{u.email}</td>
                                <td className="px-5 py-4 text-slate-500 text-xs font-semibold">{u.companyName || 'System Platform'}</td>
                                <td className="px-5 py-4"><span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200">{u.role}</span></td>
                                <td className="px-5 py-4"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${u.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{u.isActive !== false ? 'Active' : 'Suspended'}</span></td>
                                <td className="px-5 py-4"><div className="flex gap-1 justify-end">
                                    <button onClick={() => suspend(u.id, u.companyId)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Suspend User" aria-label="Suspend User"><UserX className="w-4 h-4" /></button>
                                    <button onClick={() => del(u.id, u.companyId)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete User" aria-label="Delete User"><Trash2 className="w-4 h-4" /></button>
                                </div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


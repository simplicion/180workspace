'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Building2, BadgeCheck, Ban, Trash2, KeyRound, Eye, Sparkles } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../lib/superadmin-api';
import { useModal } from '../../../lib/modal-context';
import { Skeleton } from '@workspace/ui';

const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'active':
            return 'badge-emerald';
        case 'trial':
            return 'badge-amber';
        case 'suspended':
            return 'badge-rose';
        case 'expired':
            return 'badge-amber';
        default:
            return 'badge-slate';
    }
};

export default function CompaniesPage() {
    const router = useRouter();
    const modal = useModal();
    const [companies, setCompanies] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await saApi.get('/companies', { params: { page, limit: 20, search } });
            setCompanies(data.companies || []);
            setTotal(data.total || 0);
            setSelectedIds([]);
        } catch { 
            toast.error('Failed to load companies'); 
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [page, search]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleAll = () => {
        if (selectedIds.length === companies.length) setSelectedIds([]);
        else setSelectedIds(companies.map(c => c.id));
    };

    const bulkDelete = async () => {
        if (selectedIds.length === 0) return;
        
        const input = await modal.prompt({
            title: `Delete ${selectedIds.length} Companies?`,
            message: `You are about to PERMANENTLY delete ${selectedIds.length} selected companies and all their associated data. This action is irreversible. Type DELETE to confirm.`,
            placeholder: 'Type DELETE here',
            confirmText: 'Bulk Delete Permanently',
            variant: 'danger'
        });

        if (input !== 'DELETE') {
            if (input !== null) toast.error('Incorrect confirmation text');
            return;
        }

        const t = toast.loading(`Deleting ${selectedIds.length} companies...`);
        try {
            const { data } = await saApi.post('/companies/bulk-delete', { 
                companyIds: selectedIds, 
                confirm: 'DELETE' 
            }, { timeout: 300000 });
            
            const { results } = data;
            if (results && results.failed && results.failed.length > 0) {
                toast.error(`Deleted ${results.success.length} but ${results.failed.length} failed`, { id: t, duration: 5000 });
            } else {
                toast.success(`Successfully deleted all ${results?.success?.length || selectedIds.length} companies`, { id: t, duration: 4000 });
            }
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Bulk delete failed. Refreshing...', { id: t, duration: 5000 });
            load();
        }
    };

    const suspend = async (id: string, isSuspended: boolean) => {
        if (!isSuspended) {
            const reason = await modal.prompt({
                title: 'Deactivate / Suspend Company',
                message: 'Provide a reason for deactivating this company. They will lose access to all platform features instantly.',
                placeholder: 'e.g. Violation of terms, Overdue payment',
                confirmText: 'Deactivate Company',
                variant: 'danger'
            });
            if (!reason) return;
            const t = toast.loading('Deactivating company...');
            try {
                await saApi.put(`/companies/${id}/suspend`, { reason });
                toast.success('Company deactivated successfully', { id: t, duration: 4000 });
                load();
            } catch (err: any) {
                toast.error(err.response?.data?.error || 'Failed to deactivate company', { id: t, duration: 4000 });
            }
        } else {
            const ok = await modal.confirm({
                title: 'Activate / Unsuspend Company?',
                message: 'Are you sure you want to restore full platform access for this company?',
                confirmText: 'Activate Company',
                variant: 'success'
            });
            if (!ok) return;
            const t = toast.loading('Activating company...');
            try {
                await saApi.put(`/companies/${id}/unsuspend`);
                toast.success('Company activated successfully', { id: t, duration: 4000 });
                load();
            } catch (err: any) {
                toast.error(err.response?.data?.error || 'Failed to activate company', { id: t, duration: 4000 });
            }
        }
    };

    const del = async (id: string, name: string) => {
        const input = await modal.prompt({
            title: 'Delete Company?',
            message: `This will PERMANENTLY delete "${name}" and all associated data. This cannot be undone. Type DELETE to confirm.`,
            placeholder: 'Type DELETE here',
            confirmText: 'Permanently Delete',
            variant: 'danger'
        });
        if (input !== 'DELETE') {
            if (input !== null) toast.error('Incorrect confirmation text');
            return;
        }
        const t = toast.loading(`Deleting "${name}" permanently...`);
        try {
            await saApi.delete(`/companies/${id}`, { data: { confirm: 'DELETE' } });
            toast.success(`Company "${name}" deleted permanently`, { id: t, duration: 4000 });
            load();
        } catch (err: any) { 
            toast.error(err.response?.data?.error || 'Delete failed', { id: t, duration: 4000 }); 
        }
    };

    return (
        <div className="space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Workspaces & Companies</h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {total} total tenant organizations registered across the platform.
                    </p>
                </div>
                
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                        <span className="badge-sky text-xs font-bold px-3 py-1.5">
                            {selectedIds.length} Selected
                        </span>
                        <button 
                            onClick={bulkDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-200 dark:shadow-rose-950/50 hover:bg-rose-700 transition-all active:scale-95"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Selected
                        </button>
                    </div>
                )}
            </div>

            {/* Search */}
            <div className="glass-card p-4">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input 
                        id="search-companies" 
                        value={search} 
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search by company name or admin email..." 
                        aria-label="Search Companies"
                        className="input pl-10 w-full text-xs sm:text-sm" 
                    />
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table className="table">
                    <thead>
                        <tr>
                            <th className="w-10">
                                <input 
                                    id="select-all-companies"
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                                    checked={companies.length > 0 && selectedIds.length === companies.length}
                                    onChange={toggleAll}
                                    aria-label="Select all companies"
                                />
                            </th>
                            <th>Company</th>
                            <th>Admin Email</th>
                            <th>Plan</th>
                            <th>Status</th>
                            <th>Autopay</th>
                            <th>Next Charge</th>
                            <th>Joined</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="p-4"><Skeleton className="h-4 w-4 rounded" /></td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-9 w-9 rounded-xl" />
                                            <div>
                                                <Skeleton className="h-4 w-32 rounded mb-1" />
                                                <Skeleton className="h-3 w-20 rounded" />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4"><Skeleton className="h-4 w-40 rounded" /></td>
                                    <td className="p-4"><Skeleton className="h-5 w-16 rounded-md" /></td>
                                    <td className="p-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                                    <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-24 rounded" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-20 rounded" /></td>
                                    <td className="p-4 text-right"><Skeleton className="h-8 w-24 rounded-lg ml-auto" /></td>
                                </tr>
                            ))
                        ) : companies.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center py-16 text-slate-400">
                                    <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                    <p className="text-base font-bold text-slate-900 dark:text-white">No companies found</p>
                                    <p className="text-xs text-slate-500 mt-1">Try adjusting your search query</p>
                                </td>
                            </tr>
                        ) : companies.map(c => (
                            <tr key={c.id} className={`transition-colors group ${selectedIds.includes(c.id) ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'}`}>
                                <td>
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                                        checked={selectedIds.includes(c.id)}
                                        onChange={() => toggleSelection(c.id)}
                                        aria-label={`Select company ${c.companyName}`}
                                    />
                                </td>
                                <td>
                                    <Link href={`/superadmin/companies/${c.id}`} className="flex items-center gap-3 group/company">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-black text-sm group-hover/company:scale-105 transition-transform">
                                            {c.companyName ? c.companyName.charAt(0).toUpperCase() : 'C'}
                                        </div>
                                        <div>
                                            <span className="font-bold text-slate-900 dark:text-white block text-sm group-hover/company:text-indigo-600 dark:group-hover/company:text-indigo-400 transition-colors">
                                                {c.companyName}
                                            </span>
                                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">ID: {c.id?.slice(0, 8)}...</span>
                                        </div>
                                    </Link>
                                </td>
                                <td className="text-slate-600 dark:text-slate-300 font-medium text-xs">{c.adminEmail}</td>
                                <td>
                                    <span className="badge-slate font-semibold text-[11px]">
                                        {c.subscriptionPlan?.planName || 'Free'}
                                    </span>
                                </td>
                                <td>
                                    <span className={`${getStatusBadge(c.subscriptionStatus)} font-bold text-[11px] capitalize`}>
                                        {c.subscriptionStatus}
                                    </span>
                                </td>
                                <td>
                                    <span className={`font-bold text-[11px] ${c.autopayEnabled ? 'badge-emerald' : 'badge-slate'}`}>
                                        {c.autopayEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </td>
                                <td className="text-slate-600 dark:text-slate-400 font-medium text-xs">
                                    {c.nextChargeDate ? new Date(c.nextChargeDate).toLocaleDateString() : '-'}
                                </td>
                                <td className="text-slate-400 dark:text-slate-500 text-xs font-medium">{new Date(c.createdAt).toLocaleDateString()}</td>
                                <td className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Link 
                                            href={`/superadmin/companies/${c.id}`} 
                                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-all" 
                                            title="View details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                        <button 
                                            onClick={() => suspend(c.id, c.isSuspended)} 
                                            className={`p-2 rounded-lg transition-all ${c.isSuspended ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40' : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'}`} 
                                            title={c.isSuspended ? 'Unsuspend' : 'Suspend'}
                                        >
                                            {c.isSuspended ? <BadgeCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                        </button>
                                        <button 
                                            onClick={() => del(c.id, c.companyName)} 
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all" 
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {total > 20 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">
                        Page {page} of {Math.ceil(total / 20)}
                    </p>
                    <div className="flex gap-2">
                        <button 
                            disabled={page === 1} 
                            onClick={() => setPage(p => p - 1)} 
                            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                            Prev
                        </button>
                        <button 
                            disabled={page >= Math.ceil(total / 20)} 
                            onClick={() => setPage(p => p + 1)} 
                            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { Search, Building2, BadgeCheck, Ban, Trash2, KeyRound, Eye } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../lib/superadmin-api';
import { useModal } from '../../../lib/modal-context';

const STATUS_COLORS: Record<string, string> = {
    active: 'text-emerald-600 bg-emerald-50',
    trial: 'text-amber-600 bg-amber-50',
    suspended: 'text-rose-600 bg-rose-50',
    cancelled: 'text-slate-500 bg-slate-100',
    expired: 'text-orange-600 bg-orange-50',
};

export default function CompaniesPage() {
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
            setCompanies(data.companies);
            setTotal(data.total);
            setSelectedIds([]);
        } catch { toast.error('Failed to load companies'); }
        setLoading(false);
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
            }, { timeout: 300000 }); // 5 minute timeout for bulk deletion
            
            const { results } = data;
            if (results.failed.length > 0) {
                toast.error(`Deleted ${results.success.length} but ${results.failed.length} failed`, { id: t, duration: 5000 });
            } else {
                toast.success(`Successfully deleted all ${results.success.length} companies`, { id: t });
            }
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Bulk delete failed. This may be due to a timeout, but some deletions might have processed. Refreshing...', { id: t });
            load(); // Reload anyway to see current state
        }
    };

    const suspend = async (id: string, isSuspended: boolean) => {
        if (!isSuspended) {
            const reason = await modal.prompt({
                title: 'Suspend Company',
                message: 'Provide a reason for suspending this company. They will lose access to all features instantly.',
                placeholder: 'e.g. Violation of terms, Overdue payment',
                confirmText: 'Suspend Now',
                variant: 'danger'
            });
            if (!reason) return;
            await saApi.put(`/companies/${id}/suspend`, { reason });
        } else {
            const ok = await modal.confirm({
                title: 'Unsuspend Company?',
                message: 'Are you sure you want to restore access for this company?',
                confirmText: 'Unsuspend',
                variant: 'success'
            });
            if (!ok) return;
            await saApi.put(`/companies/${id}/unsuspend`);
        }
        toast.success(isSuspended ? 'Company unsuspended' : 'Company suspended');
        load();
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
        try {
            await saApi.delete(`/companies/${id}`, { data: { confirm: 'DELETE' } });
            toast.success('Company deleted');
            load();
        } catch { toast.error('Delete failed'); }
    };

    return (
        <div className="space-y-5">
            <Toaster position="top-center" />
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
                    <p className="text-slate-500 text-sm mt-1">{total} total companies registered</p>
                </div>
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                        <span className="text-sm font-bold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-full border border-sky-100">
                            {selectedIds.length} Selected
                        </span>
                        <button 
                            onClick={bulkDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Selected
                        </button>
                    </div>
                )}
            </div>

            {/* Search */}
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                <input id="search-companies" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search by company name or email..." aria-label="Search Companies"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm shadow-sm" />
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                            <th className="px-5 py-3.5 w-10">
                                <input 
                                    id="select-all-companies"
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 transition-all cursor-pointer"
                                    checked={companies.length > 0 && selectedIds.length === companies.length}
                                    onChange={toggleAll}
                                    aria-label="Select all companies"
                                />
                            </th>
                            <th className="text-left px-5 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Company</th>
                            <th className="text-left px-5 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Admin Email</th>
                            <th className="text-left px-5 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Plan</th>
                            <th className="text-left px-5 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Status</th>
                            <th className="text-left px-5 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Autopay</th>
                            <th className="text-left px-5 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Next Charge</th>
                            <th className="text-left px-5 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Joined</th>
                            <th className="text-right px-5 py-3.5 text-slate-500 font-bold text-xs uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? [...Array(5)].map((_, i) => (
                            <tr key={i}><td colSpan={9} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                        )) : companies.length === 0 ? (
                            <tr><td colSpan={9} className="text-center py-12 text-slate-400">No companies found</td></tr>
                        ) : companies.map(c => (
                            <tr key={c.id} className={`transition-colors group ${selectedIds.includes(c.id) ? 'bg-sky-50/50' : 'hover:bg-sky-50/30'}`}>
                                <td className="px-5 py-4">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 transition-all cursor-pointer"
                                        checked={selectedIds.includes(c.id)}
                                        onChange={() => toggleSelection(c.id)}
                                        aria-label={`Select company ${c.companyName}`}
                                    />
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center border border-sky-100 transition-colors group-hover:bg-sky-100">
                                            <Building2 className="w-4 h-4 text-sky-600" />
                                        </div>
                                        <span className="font-bold text-slate-900">{c.companyName}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-slate-600 font-medium">{c.adminEmail}</td>
                                <td className="px-5 py-4">
                                    <span className="text-slate-700 font-semibold px-2 py-0.5 bg-slate-100 rounded-md text-[11px] uppercase tracking-wider border border-slate-200">{c.subscriptionPlan?.planName || 'Free'}</span>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${STATUS_COLORS[c.subscriptionStatus] || 'text-slate-500 bg-slate-100'}`}>
                                        {c.subscriptionStatus}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${c.autopayEnabled ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                                        {c.autopayEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-slate-600 font-medium text-[13px]">
                                    {c.nextChargeDate ? new Date(c.nextChargeDate).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-5 py-4 text-slate-400 text-xs font-medium">{new Date(c.createdAt).toLocaleDateString()}</td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => window.location.href = `/superadmin/companies/${c.id}`} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all" title="View"><Eye className="w-4 h-4" /></button>
                                        <button onClick={() => suspend(c.id, c.isSuspended)} className={`p-2 rounded-lg transition-all ${c.isSuspended ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`} title={c.isSuspended ? 'Unsuspend' : 'Suspend'}>
                                            {c.isSuspended ? <BadgeCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => del(c.id, c.companyName)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Page {page} of {Math.ceil(total / 20)}</p>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors">Prev</button>
                        <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors">Next</button>
                    </div>
                </div>
            )}
        </div>
    );
}

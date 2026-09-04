'use client';

import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { XCircle, RefreshCw, Undo, CreditCard, ShieldCheck } from 'lucide-react';
import saApi from '../../../lib/superadmin-api';
import { useModal } from '../../../lib/modal-context';
import { Skeleton } from '@workspace/ui';

const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'active':
            return 'badge-emerald';
        case 'trial':
            return 'badge-amber';
        case 'cancelled':
            return 'badge-rose';
        case 'past_due':
            return 'badge-amber';
        default:
            return 'badge-slate';
    }
};

export default function SubscriptionsPage() {
    const modal = useModal();
    const [subs, setSubs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await saApi.get('/subscriptions', { params: { status: filter || undefined, limit: 30 } });
            setSubs(data?.subscriptions || []);
            setTotal(data?.total || 0);
        } catch {
            toast.error('Failed to load subscriptions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [filter]);

    const cancel = async (id: string) => {
        const ok = await modal.confirm({
            title: 'Cancel Subscription',
            message: 'Are you sure you want to cancel this subscription? This will stop future billing immediately.',
            confirmText: 'Yes, Cancel',
            variant: 'danger'
        });
        if (!ok) return;

        try {
            await saApi.put(`/subscriptions/${id}/cancel`, { reason: 'Cancelled by super admin' });
            toast.success('Subscription cancelled');
            load();
        } catch {
            toast.error('Cancellation failed');
        }
    };

    const renew = async (id: string) => {
        const ok = await modal.confirm({
            title: 'Renew Subscription',
            message: 'Force renewal for this subscription? This will start a new billing cycle.',
            confirmText: 'Renew Now',
            variant: 'success'
        });
        if (!ok) return;

        try {
            await saApi.put(`/subscriptions/${id}/renew`);
            toast.success('Subscription renewed');
            load();
        } catch {
            toast.error('Renewal failed');
        }
    };

    const refund = async (id: string) => {
        const ok = await modal.confirm({
            title: 'Issue Refund',
            message: 'Are you sure you want to refund this payment? This action is irreversible.',
            confirmText: 'Refund',
            variant: 'warning'
        });
        if (!ok) return;

        try {
            await saApi.post(`/subscriptions/${id}/refund`, { reason: 'Manual refund via support' });
            toast.success('Payment refunded');
            load();
        } catch {
            toast.error('Refund processing failed');
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
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Subscriptions & Monetization</h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {total} total recurring subscriptions active across all organizations.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <select 
                        value={filter} 
                        onChange={e => setFilter(e.target.value)} 
                        aria-label="Filter Subscriptions by Status"
                        className="select text-xs font-bold"
                    >
                        <option value="">All Statuses</option>
                        {['active', 'trial', 'cancelled', 'past_due', 'expired'].map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Company</th>
                            <th>Plan</th>
                            <th>Status</th>
                            <th>Trial Period</th>
                            <th>Payment</th>
                            <th>Renewal Date</th>
                            <th>Amount</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="p-4">
                                        <Skeleton className="h-4 w-32 rounded mb-1" />
                                        <Skeleton className="h-3 w-16 rounded" />
                                    </td>
                                    <td className="p-4"><Skeleton className="h-5 w-20 rounded-md" /></td>
                                    <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-24 rounded" /></td>
                                    <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-20 rounded" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-16 rounded" /></td>
                                    <td className="p-4 text-right"><Skeleton className="h-8 w-20 rounded-lg ml-auto" /></td>
                                </tr>
                            ))
                        ) : subs.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-16 text-slate-400">
                                    <CreditCard className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                    <p className="text-base font-bold text-slate-900 dark:text-white">No subscriptions found</p>
                                    <p className="text-xs text-slate-500 mt-1">Try clearing or adjusting your status filter</p>
                                </td>
                            </tr>
                        ) : (
                            subs.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                                    <td>
                                        <div className="text-slate-900 dark:text-white font-bold text-sm tracking-tight">{s.companyName || s.companyId?.companyName || 'N/A'}</div>
                                        <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">ID: {s.id?.slice(-6).toUpperCase()}</div>
                                    </td>
                                    <td>
                                        <span className="badge-indigo text-[11px] font-bold">
                                            {s.planName || s.plan?.planName || s.planId?.planName || 'Plan Upgrade'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`${getStatusBadge(s.status)} text-[11px] font-bold capitalize`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td>
                                        {s.trialStartDate ? (
                                            <div className="space-y-0.5">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Starts: {new Date(s.trialStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                                                <div className="text-[10px] text-rose-500 font-bold">Ends: {new Date(s.trialEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-xs">—</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`text-[11px] font-bold ${s.paymentStatus === 'paid' ? 'badge-emerald' : s.paymentStatus === 'failed' ? 'badge-rose' : 'badge-amber'}`}>
                                            {s.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="text-slate-600 dark:text-slate-300 font-medium text-xs">
                                        {s.renewalDate ? new Date(s.renewalDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                    </td>
                                    <td>
                                        <div className="text-slate-900 dark:text-white font-black text-sm">₹ {(s.amount || 0).toLocaleString('en-IN')}</div>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => cancel(s.id)} 
                                                aria-label="Cancel Subscription" 
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all" 
                                                title="Cancel Subscription"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => renew(s.id)} 
                                                aria-label="Force Renewal Cycle" 
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all" 
                                                title="Force Renewal Cycle"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => refund(s.id)} 
                                                aria-label="Issue Full Refund" 
                                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-all" 
                                                title="Issue Full Refund"
                                            >
                                                <Undo className="w-4 h-4" />
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

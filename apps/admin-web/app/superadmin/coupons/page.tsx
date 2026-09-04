'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Power, Tag, Percent, X, Calendar, Hash } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../lib/superadmin-api';
import { useModal } from '../../../lib/modal-context';
import { Skeleton } from '@workspace/ui';

export default function CouponsPage() {
    const modal = useModal();
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [platformCurrency, setPlatformCurrency] = useState('USD');
    const [form, setForm] = useState({ 
        couponCode: '', 
        discountType: 'percentage', 
        discountValue: 10, 
        maxUses: '', 
        expiresAt: '', 
        description: '' 
    });

    const load = async () => {
        setLoading(true);
        try {
            const { data: cData } = await saApi.get('/coupons');
            setCoupons(cData?.coupons || []);

            try {
                const { data: sData } = await saApi.get('/settings');
                if (sData?.settings?.currency) setPlatformCurrency(sData.settings.currency);
            } catch (e) {
                console.error('Failed to load settings', e);
            }
        } catch {
            toast.error('Failed to load coupons');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await saApi.post('/coupons', { 
                couponCode: form.couponCode.trim().toUpperCase(),
                discountType: form.discountType,
                discountValue: Number(form.discountValue),
                maxUses: form.maxUses ? +form.maxUses : null, 
                expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null 
            });
            toast.success('Coupon created successfully');
            setShowCreate(false);
            setForm({ couponCode: '', discountType: 'percentage', discountValue: 10, maxUses: '', expiresAt: '', description: '' });
            load();
        } catch (err: any) { 
            toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to create coupon'); 
        }
    };

    const toggle = async (id: string) => { 
        try {
            await saApi.put(`/coupons/${id}/toggle`); 
            load(); 
        } catch {
            toast.error('Toggle failed');
        }
    };

    const del = async (id: string) => {
        const ok = await modal.confirm({
            title: 'Delete Coupon?',
            message: 'Are you sure you want to delete this coupon? Existing subscribers using this coupon will not be affected, but new redemptions will be blocked.',
            confirmText: 'Delete Coupon',
            variant: 'danger'
        });
        if (!ok) return;

        try {
            await saApi.delete(`/coupons/${id}`);
            toast.success('Coupon deleted');
            load();
        } catch {
            toast.error('Failed to delete coupon');
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
                            <Tag className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Coupons & Promotions</h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Manage platform-wide promotional discount codes and redemption caps.
                    </p>
                </div>

                <button 
                    onClick={() => setShowCreate(true)} 
                    aria-label="Create New Coupon" 
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    <span>Generate Coupon</span>
                </button>
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <form 
                        onSubmit={create} 
                        className="glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-6 animate-in zoom-in-95 duration-200"
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    <Tag className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white">Create New Coupon</h2>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setShowCreate(false)} 
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="form-label">Redemption Code</label>
                                <input 
                                    type="text" 
                                    value={form.couponCode} 
                                    onChange={e => setForm(p => ({ ...p, couponCode: e.target.value.toUpperCase() }))} 
                                    placeholder="e.g. SUMMER50" 
                                    required 
                                    className="input font-mono text-xs sm:text-sm uppercase font-bold" 
                                />
                            </div>

                            <div>
                                <label className="form-label">Discount Type</label>
                                <select 
                                    value={form.discountType} 
                                    onChange={e => setForm(p => ({ ...p, discountType: e.target.value }))} 
                                    className="select text-xs sm:text-sm w-full"
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount ({platformCurrency})</option>
                                </select>
                            </div>

                            <div>
                                <label className="form-label">Discount Value</label>
                                <input 
                                    type="number" 
                                    value={form.discountValue} 
                                    onChange={e => setForm(p => ({ ...p, discountValue: +e.target.value }))} 
                                    placeholder="10" 
                                    required 
                                    className="input text-xs sm:text-sm" 
                                />
                            </div>

                            <div>
                                <label className="form-label">Max Uses Limit</label>
                                <input 
                                    type="number" 
                                    value={form.maxUses} 
                                    onChange={e => setForm(p => ({ ...p, maxUses: e.target.value }))} 
                                    placeholder="Unlimited" 
                                    className="input text-xs sm:text-sm" 
                                />
                            </div>

                            <div>
                                <label className="form-label">Expiry Date</label>
                                <input 
                                    type="date" 
                                    value={form.expiresAt} 
                                    onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} 
                                    className="input text-xs sm:text-sm" 
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="form-label">Description</label>
                                <input 
                                    type="text" 
                                    value={form.description} 
                                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
                                    placeholder="e.g. Special launch discount promotion" 
                                    className="input text-xs sm:text-sm" 
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                type="button" 
                                onClick={() => setShowCreate(false)} 
                                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="flex-1 btn-primary text-xs"
                            >
                                Activate Coupon
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Coupons Table */}
            <div className="table-wrapper">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Promotion Code</th>
                            <th>Type</th>
                            <th>Reward Value</th>
                            <th>Redemptions</th>
                            <th>Valid Until</th>
                            <th>Status</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-8 w-8 rounded-lg" />
                                            <Skeleton className="h-4 w-24 rounded" />
                                        </div>
                                    </td>
                                    <td className="p-4"><Skeleton className="h-4 w-16 rounded" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-14 rounded" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-20 rounded" /></td>
                                    <td className="p-4"><Skeleton className="h-4 w-20 rounded" /></td>
                                    <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                                    <td className="p-4 text-right"><Skeleton className="h-8 w-16 rounded-lg ml-auto" /></td>
                                </tr>
                            ))
                        ) : coupons.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-16 text-slate-400">
                                    <Tag className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                    <p className="text-base font-bold text-slate-900 dark:text-white">No promotional coupons created</p>
                                    <p className="text-xs text-slate-500 mt-1">Click "Generate Coupon" to create promotional discounts.</p>
                                </td>
                            </tr>
                        ) : (
                            coupons.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                                                <Tag className="w-4 h-4" />
                                            </div>
                                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm tracking-wide">
                                                {c.couponCode}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge-slate text-[11px] font-bold uppercase">
                                            {c.discountType}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                                            {c.discountType === 'percentage' ? `${c.discountValue}%` : `${platformCurrency} ${c.discountValue}`}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-slate-900 dark:text-white font-bold text-xs">
                                                {c.usedCount} <span className="text-slate-400 font-normal">/ {c.maxUses ?? '∞'}</span>
                                            </span>
                                            <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                                                    style={{ width: `${c.maxUses ? Math.min((c.usedCount / c.maxUses) * 100, 100) : 0}%` }} 
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-slate-600 dark:text-slate-400 font-medium text-xs">
                                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-GB') : 'Perpetual'}
                                    </td>
                                    <td>
                                        <span className={`text-[11px] font-bold ${c.isActive ? 'badge-emerald' : 'badge-slate'}`}>
                                            {c.isActive ? 'Active' : 'Archived'}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex items-center gap-1 justify-end">
                                            <button 
                                                onClick={() => toggle(c.id)} 
                                                aria-label="Toggle Coupon Status" 
                                                className={`p-2 rounded-lg transition-all ${
                                                    c.isActive 
                                                        ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40' 
                                                        : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                                }`} 
                                                title={c.isActive ? 'Deactivate' : 'Reactivate'}
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => del(c.id)} 
                                                aria-label="Delete Coupon" 
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                                                title="Delete coupon"
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

'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Power, Check, Shield, Sparkles, Layers, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import saApi from '../../../lib/superadmin-api';
import { useModal } from '../../../lib/modal-context';
import { Skeleton } from '@workspace/ui';

const FEATURES = [
    'Unlimited Users', 
    'Priority Support', 
    'AI Features', 
    'Advanced Analytics', 
    'Custom Branding', 
    'API Access', 
    'Google Drive Integration', 
    'Cloudinary Integration', 
    'Unlimited Drive Storage'
];

function PlanModal({ plan, onClose, onSave }: any) {
    const [form, setForm] = useState(plan || { 
        planName: '', 
        price: 0, 
        currency: 'INR', 
        billingCycle: 'monthly', 
        maxUsers: 10, 
        maxProjects: 5, 
        maxStorageGB: 5, 
        features: [], 
        isActive: true, 
        isPopular: false, 
        trialDays: 0 
    });

    const toggle = (f: string) => setForm((p: any) => ({ 
        ...p, 
        features: p.features.includes(f) ? p.features.filter((x: string) => x !== f) : [...p.features, f] 
    }));

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (plan?.id) await saApi.put(`/plans/${plan.id}`, form);
            else await saApi.post('/plans', form);
            toast.success(plan?.id ? 'Plan updated' : 'Plan created');
            onSave();
        } catch (err: any) { 
            toast.error(err?.response?.data?.error || 'Save failed'); 
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <form 
                onSubmit={save} 
                className="glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200"
            >
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Layers className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">{plan?.id ? 'Edit Plan' : 'Create Pricing Tier'}</h2>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        aria-label="Close modal" 
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <label className="form-label">Plan Name</label>
                        <input 
                            type="text" 
                            value={form.planName} 
                            onChange={e => setForm((p: any) => ({ ...p, planName: e.target.value }))} 
                            required
                            placeholder="e.g. Enterprise Tier"
                            className="input text-xs sm:text-sm" 
                        />
                    </div>
                    <div>
                        <label className="form-label">Price</label>
                        <input 
                            type="number" 
                            value={form.price} 
                            onChange={e => setForm((p: any) => ({ ...p, price: +e.target.value }))} 
                            required
                            className="input text-xs sm:text-sm" 
                        />
                    </div>
                    <div>
                        <label className="form-label">Trial Days</label>
                        <input 
                            type="number" 
                            value={form.trialDays} 
                            onChange={e => setForm((p: any) => ({ ...p, trialDays: +e.target.value }))} 
                            className="input text-xs sm:text-sm" 
                        />
                    </div>
                    <div>
                        <label className="form-label">Max Users</label>
                        <input 
                            type="number" 
                            value={form.maxUsers} 
                            onChange={e => setForm((p: any) => ({ ...p, maxUsers: +e.target.value }))} 
                            required
                            className="input text-xs sm:text-sm" 
                        />
                    </div>
                    <div>
                        <label className="form-label">Max Projects</label>
                        <input 
                            type="number" 
                            value={form.maxProjects} 
                            onChange={e => setForm((p: any) => ({ ...p, maxProjects: +e.target.value }))} 
                            required
                            className="input text-xs sm:text-sm" 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="form-label">Currency</label>
                        <select 
                            value={form.currency} 
                            onChange={e => setForm((p: any) => ({ ...p, currency: e.target.value }))}
                            className="select text-xs sm:text-sm w-full"
                        >
                            {['INR', 'USD', 'EUR', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Billing Cycle</label>
                        <select 
                            value={form.billingCycle} 
                            onChange={e => setForm((p: any) => ({ ...p, billingCycle: e.target.value }))}
                            className="select text-xs sm:text-sm w-full"
                        >
                            {['monthly', 'yearly', 'lifetime'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="form-label mb-2">Entitled Features</label>
                    <div className="grid grid-cols-2 gap-2">
                        {FEATURES.map(f => (
                            <label key={f} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={form.features.includes(f)} 
                                    onChange={() => toggle(f)} 
                                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500" 
                                />
                                <span className="truncate">{f}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <label className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={form.isPopular} 
                            onChange={e => setForm((p: any) => ({ ...p, isPopular: e.target.checked }))} 
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500" 
                        /> 
                        Mark as Featured / Most Popular Plan
                    </label>
                </div>

                <div className="flex gap-3 pt-2">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="flex-1 btn-primary text-xs"
                    >
                        Save Plan
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function PlansPage() {
    const modal = useModal();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalConfig, setModalConfig] = useState<any>(null);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await saApi.get('/plans');
            setPlans(data?.plans || []);
        } catch {
            toast.error('Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const del = async (id: string) => {
        const ok = await modal.confirm({
            title: 'Delete Plan',
            message: 'Are you sure you want to delete this subscription plan? This will not affect existing subscribers but new companies will not be able to choose it.',
            confirmText: 'Delete Plan',
            variant: 'danger'
        });
        if (!ok) return;

        try {
            await saApi.delete(`/plans/${id}`);
            toast.success('Plan deleted');
            load();
        } catch {
            toast.error('Delete failed');
        }
    };

    const toggleActive = async (id: string) => {
        try {
            await saApi.put(`/plans/${id}/toggle`);
            load();
        } catch {
            toast.error('Failed to toggle plan');
        }
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-center" />
            {modalConfig !== null && (
                <PlanModal 
                    plan={modalConfig.id ? modalConfig : null} 
                    onClose={() => setModalConfig(null)} 
                    onSave={() => { setModalConfig(null); load(); }} 
                />
            )}
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Layers className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Subscription Plans</h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Configure pricing tiers, user capacities, and feature entitlements.
                    </p>
                </div>

                <button 
                    onClick={() => setModalConfig({})} 
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> 
                    <span>New Plan</span>
                </button>
            </div>

            {/* Plans Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="glass-card p-8 space-y-4">
                            <Skeleton className="h-6 w-32 rounded-lg" />
                            <Skeleton className="h-10 w-24 rounded-lg" />
                            <div className="space-y-2 pt-4">
                                <Skeleton className="h-4 w-full rounded" />
                                <Skeleton className="h-4 w-4/5 rounded" />
                                <Skeleton className="h-4 w-3/4 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : plans.length === 0 ? (
                <div className="glass-card text-center py-20 text-slate-400">
                    <Layers className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-base font-bold text-slate-900 dark:text-white">No plans created yet</p>
                    <p className="text-xs text-slate-500 mt-1">Click "New Plan" to define your first subscription tier.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {plans.map(p => (
                        <div 
                            key={p.id} 
                            className={`glass-card stat-card-glow p-6 sm:p-8 flex flex-col relative transition-all group ${
                                p.isActive ? '' : 'opacity-60'
                            }`}
                        >
                            {p.isPopular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-indigo-500/30 flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3" /> Most Popular
                                </div>
                            )}
                            
                            <div className="mb-6">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {p.planName}
                                </h3>
                                <div className="flex items-baseline gap-1.5 mt-2">
                                    <span className="text-xs font-bold text-slate-400">{p.currency}</span>
                                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{p.price.toLocaleString()}</span>
                                    <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">/{p.billingCycle}</span>
                                </div>
                            </div>

                            <div className="space-y-3 flex-1 mb-6">
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider mb-2">Entitlements</p>
                                {[
                                    { text: `${p.maxUsers} Active Seats`, accent: true },
                                    { text: `${p.maxProjects} Active Projects`, accent: true },
                                    { text: p.features?.includes('Unlimited Drive Storage') ? 'Unlimited Drive Storage' : `${p.maxStorageGB}GB Managed Storage`, accent: true },
                                    ...(p.trialDays > 0 ? [{ text: `${p.trialDays} Day Free Trial`, accent: false }] : [])
                                ].map(l => (
                                    <div key={l.text} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${l.accent ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'}`}>
                                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                                        </div>
                                        <span>{l.text}</span>
                                    </div>
                                ))}
                                {p.features?.map((f: string) => (
                                    <div key={f} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                                        <div className="w-4 h-4 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                                        </div>
                                        <span>{f}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button 
                                    onClick={() => setModalConfig(p)} 
                                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                                >
                                    <Pencil className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Edit
                                </button>
                                <button 
                                    onClick={() => toggleActive(p.id)} 
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                        p.isActive 
                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 hover:bg-amber-100' 
                                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100'
                                    }`}
                                >
                                    <Power className="w-3.5 h-3.5" /> {p.isActive ? 'Suspend' : 'Resume'}
                                </button>
                                <button 
                                    onClick={() => del(p.id)} 
                                    aria-label="Delete plan" 
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { 
    Flag, 
    Search, 
    Plus, 
    Trash2, 
    CheckCircle2, 
    XCircle, 
    Layers, 
    ShieldCheck, 
    Sparkles, 
    Zap,
    Sliders,
    RefreshCw,
    Info,
    Check,
    X
} from 'lucide-react';
import saApi from '@/lib/superadmin-api';
import { useModal } from '@/lib/modal-context';
import { Skeleton } from '@workspace/ui';

interface FeatureFlag {
    id: string;
    name: string;
    description?: string;
    isEnabled: boolean;
    rules?: any;
    createdAt?: string;
    updatedAt?: string;
}

export default function FeatureFlagsPage() {
    const modal = useModal();
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
    const [isCreating, setIsCreating] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Form state
    const [newFlagName, setNewFlagName] = useState('');
    const [newFlagDescription, setNewFlagDescription] = useState('');
    const [newFlagEnabled, setNewFlagEnabled] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const fetchFlags = async () => {
        try {
            setLoading(true);
            const res = await saApi.get('/feature-flags');
            setFlags(res.data.flags || []);
        } catch (err: any) {
            console.error('Failed to fetch feature flags', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFlags();
    }, []);

    const handleToggle = async (flag: FeatureFlag) => {
        setTogglingId(flag.id);
        const originalState = flag.isEnabled;
        
        // Optimistic update
        setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, isEnabled: !f.isEnabled } : f));

        try {
            await saApi.put(`/feature-flags/${flag.id}/toggle`);
        } catch (err: any) {
            console.error('Toggle failed', err);
            // Revert on error
            setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, isEnabled: originalState } : f));
            await modal.alert({
                title: 'Operation Failed',
                message: 'Failed to update feature flag status. Please check your network and try again.',
                variant: 'danger',
            });
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (flag: FeatureFlag) => {
        const ok = await modal.confirm({
            title: `Delete Flag: ${flag.name}?`,
            message: 'Are you sure you want to permanently delete this feature flag? Applications relying on it will immediately fallback to default behavior.',
            confirmText: 'Delete Flag',
            variant: 'danger'
        });

        if (!ok) return;

        try {
            await saApi.delete(`/feature-flags/${flag.id}`);
            setFlags(prev => prev.filter(f => f.id !== flag.id));
        } catch (err: any) {
            console.error('Delete failed', err);
            await modal.alert({
                title: 'Delete Failed',
                message: 'Failed to delete feature flag. Please try again.',
                variant: 'danger',
            });
        }
    };

    const handleCreateFlag = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (!newFlagName.trim()) {
            setFormError('Flag name/key is required');
            return;
        }

        const formattedName = newFlagName.trim().toLowerCase().replace(/\s+/g, '_');

        try {
            setCreateLoading(true);
            const res = await saApi.post('/feature-flags', {
                name: formattedName,
                description: newFlagDescription.trim(),
                isEnabled: newFlagEnabled
            });

            if (res.data?.flag) {
                setFlags(prev => [res.data.flag, ...prev]);
            } else {
                fetchFlags();
            }

            // Reset form
            setNewFlagName('');
            setNewFlagDescription('');
            setNewFlagEnabled(false);
            setIsCreating(false);
        } catch (err: any) {
            console.error('Create flag failed', err);
            setFormError(err.response?.data?.message || 'Failed to create feature flag');
        } finally {
            setCreateLoading(false);
        }
    };

    // Filtered flags
    const filteredFlags = flags.filter(flag => {
        const matchesSearch = 
            flag.name.toLowerCase().includes(search.toLowerCase()) || 
            (flag.description && flag.description.toLowerCase().includes(search.toLowerCase()));
        
        if (!matchesSearch) return false;
        if (filter === 'enabled') return flag.isEnabled;
        if (filter === 'disabled') return !flag.isEnabled;
        return true;
    });

    const activeCount = flags.filter(f => f.isEnabled).length;
    const inactiveCount = flags.length - activeCount;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            <Sliders className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Feature Flags Console</h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Dynamically control platform modules, beta rollouts, and multi-tenant capabilities in real time.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchFlags}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        title="Refresh flags"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Flag</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card stat-card-glow p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Flags</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{flags.length}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Platform runtime switches</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Flag className="w-6 h-6" />
                    </div>
                </div>

                <div className="glass-card stat-card-glow p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Active / Enabled</p>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {flags.length > 0 ? `${Math.round((activeCount / flags.length) * 100)}% of platform online` : '0%'}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="glass-card stat-card-glow p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Disabled / Offline</p>
                        <h3 className="text-2xl font-black text-slate-600 dark:text-slate-400 mt-1">{inactiveCount}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gated or dark deployed</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <XCircle className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search flag key or description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input pl-10 w-full text-xs sm:text-sm"
                    />
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {(['all', 'enabled', 'disabled'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setFilter(mode)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                                filter === mode
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            {/* Flags Table / Cards */}
            <div className="table-wrapper">
                <table className="table">
                    <thead>
                        <tr>
                            <th className="w-1/3">Flag Identifier & Metadata</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th className="text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="p-4">
                                        <Skeleton className="h-5 w-44 rounded-md mb-1.5" />
                                        <Skeleton className="h-3 w-28 rounded-md" />
                                    </td>
                                    <td className="p-4">
                                        <Skeleton className="h-4 w-60 rounded-md" />
                                    </td>
                                    <td className="p-4">
                                        <Skeleton className="h-5 w-20 rounded-full" />
                                    </td>
                                    <td className="p-4">
                                        <Skeleton className="h-6 w-12 rounded-full" />
                                    </td>
                                    <td className="p-4 text-right">
                                        <Skeleton className="h-8 w-8 rounded-lg ml-auto" />
                                    </td>
                                </tr>
                            ))
                        ) : filteredFlags.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-16 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 mx-auto mb-3">
                                        <Flag className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">No feature flags found</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                        {search ? 'No flags matched your search query. Try clearing filters.' : 'Click "Create Flag" above to define your first runtime feature toggle.'}
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            filteredFlags.map((flag) => {
                                const category = flag.name.includes('_ai') 
                                    ? 'AI & ML' 
                                    : flag.name.includes('_storage') || flag.name.includes('_drive') || flag.name.includes('_cloudinary')
                                    ? 'Storage'
                                    : flag.name.includes('_pay') || flag.name.includes('_billing')
                                    ? 'Monetization'
                                    : flag.name.includes('_chat') || flag.name.includes('_ticket')
                                    ? 'Workspace'
                                    : 'Core Platform';

                                return (
                                    <tr key={flag.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl border ${
                                                    flag.isEnabled 
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' 
                                                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                                }`}>
                                                    <Zap className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                        {flag.name}
                                                    </span>
                                                    {flag.updatedAt && (
                                                        <p className="text-[11px] text-slate-400 mt-1">
                                                            Updated {new Date(flag.updatedAt).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md font-medium">
                                                {flag.description || <span className="text-slate-400 italic">No description provided</span>}
                                            </p>
                                        </td>
                                        <td>
                                            <span className="badge-slate font-semibold text-[11px]">
                                                {category}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleToggle(flag)}
                                                disabled={togglingId === flag.id}
                                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                                    flag.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                                                }`}
                                                role="switch"
                                                aria-checked={flag.isEnabled}
                                            >
                                                <span
                                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                        flag.isEnabled ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                                />
                                            </button>
                                        </td>
                                        <td className="text-right">
                                            <button
                                                onClick={() => handleDelete(flag)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                                                title="Delete flag"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Feature Flag Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="glass-card w-full max-w-md p-6 bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-3xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">Create Feature Flag</h3>
                            </div>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateFlag} className="space-y-4 pt-4">
                            {formError && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="form-label">Flag Identifier Key</label>
                                <input
                                    type="text"
                                    placeholder="e.g. enable_beta_analytics"
                                    value={newFlagName}
                                    onChange={(e) => setNewFlagName(e.target.value)}
                                    className="input font-mono text-xs"
                                    required
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Use snake_case or lowercase keys (e.g. `enable_new_feature`).
                                </p>
                            </div>

                            <div>
                                <label className="form-label">Description</label>
                                <textarea
                                    placeholder="Explain what capability this flag toggles..."
                                    value={newFlagDescription}
                                    onChange={(e) => setNewFlagDescription(e.target.value)}
                                    rows={3}
                                    className="input text-xs resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                <div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Initial Status</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Enable this flag immediately upon creation</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setNewFlagEnabled(!newFlagEnabled)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                        newFlagEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            newFlagEnabled ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="btn-primary text-xs"
                                >
                                    {createLoading ? 'Creating...' : 'Deploy Flag'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

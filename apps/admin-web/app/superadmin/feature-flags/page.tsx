'use client';

import { useState, useEffect, useMemo } from 'react';
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
    X,
    Globe,
    GitFork,
    Megaphone,
    LayoutGrid,
    Smartphone,
    Landmark,
    MessageSquare,
    FolderOpen,
    Share2,
    PhoneCall,
    Film,
    Construction,
    RotateCcw
} from 'lucide-react';
import saApi from '@/lib/superadmin-api';
import { useModal } from '@/lib/modal-context';
import { Skeleton } from '@workspace/ui';
import toast from 'react-hot-toast';

interface FeatureFlag {
    id: string;
    name: string;
    description?: string;
    isEnabled: boolean;
    rules?: any;
    createdAt?: string;
    updatedAt?: string;
}

const APP_METADATA: Record<string, { label: string; category: string; icon: any; color: string }> = {
    crm:                  { label: 'CRM & Sales',              category: 'Business',      icon: Globe,         color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800' },
    'traffic-director':   { label: 'Traffic Director',         category: 'Marketing',     icon: GitFork,       color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800' },
    advertising:          { label: 'Advertising',              category: 'Marketing',     icon: Megaphone,     color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/50 border-pink-200 dark:border-pink-800' },
    projects:             { label: 'Projects & Tasks',         category: 'Productivity',  icon: LayoutGrid,    color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800' },
    hr:                   { label: 'Human Resources',          category: 'HR',            icon: Smartphone,    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' },
    finance:              { label: 'Finance & Analytics',      category: 'Business',      icon: Landmark,      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800' },
    communications:       { label: 'Communications',           category: 'Communication', icon: MessageSquare, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800' },
    'workspace-tools':    { label: 'Workspace Tools',          category: 'Productivity',  icon: FolderOpen,    color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800' },
    'social-media':       { label: 'Social Media Management',  category: 'Marketing',     icon: Share2,        color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800' },
    voiceforce:           { label: '180 Voiceforce',           category: 'Operations',    icon: PhoneCall,     color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800' },
    'media-editor':       { label: '180 Media Studio',         category: 'Productivity',  icon: Film,          color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800' },
};

function getAppInfo(flagName: string, rules?: any) {
    const rawAppId = rules?.appId || flagName.replace(/^app_/, '').replace(/_/g, '-');
    const meta = APP_METADATA[rawAppId] || {
        label: rules?.label || flagName.replace(/^app_/, '').replace(/_/g, ' ').toUpperCase(),
        category: rules?.category || 'Platform App',
        icon: Zap,
        color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800'
    };
    return { appId: rawAppId, ...meta };
}

export default function FeatureFlagsPage() {
    const modal = useModal();
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
    const [isCreating, setIsCreating] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Form state
    const [newFlagName, setNewFlagName] = useState('');
    const [newFlagDescription, setNewFlagDescription] = useState('');
    const [newFlagEnabled, setNewFlagEnabled] = useState(true);
    const [createLoading, setCreateLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const fetchFlags = async () => {
        try {
            setLoading(true);
            const res = await saApi.get('/feature-flags');
            setFlags(res.data.flags || []);
        } catch (err: any) {
            console.error('Failed to fetch feature flags', err);
            toast.error('Failed to fetch platform app flags');
        } finally {
            setLoading(false);
        }
    };

    const handleSyncPlatformApps = async () => {
        try {
            setSyncing(true);
            const res = await saApi.post('/feature-flags/sync');
            setFlags(res.data.flags || []);
            toast.success('Synchronized all 11 platform apps and cleaned up legacy flags!');
        } catch (err: any) {
            console.error('Sync failed', err);
            toast.error('Failed to synchronize app flags');
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchFlags();
    }, []);

    const handleToggle = async (flag: FeatureFlag) => {
        const info = getAppInfo(flag.name, flag.rules);
        setTogglingId(flag.id);
        const originalState = flag.isEnabled;
        const nextState = !originalState;
        
        // Optimistic update
        setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, isEnabled: nextState } : f));

        try {
            await saApi.put(`/feature-flags/${flag.id}/toggle`);
            if (nextState) {
                toast.success(`${info.label} is now Live & Available to all companies!`);
            } else {
                toast(`🚧 ${info.label} disabled — now showing 'In Development' watermark and blocked for users.`, {
                    duration: 4000,
                    icon: '🔒'
                });
            }
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
        const info = getAppInfo(flag.name, flag.rules);
        const ok = await modal.confirm({
            title: `Delete App Flag: ${info.label}?`,
            message: `Are you sure you want to delete the flag for "${info.label}" (${flag.name})? You can always restore all default platform apps by clicking "Sync Apps".`,
            confirmText: 'Delete Flag',
            variant: 'danger'
        });

        if (!ok) return;

        try {
            await saApi.delete(`/feature-flags/${flag.id}`);
            setFlags(prev => prev.filter(f => f.id !== flag.id));
            toast.success(`Removed flag ${flag.name}`);
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
            setFormError('App flag key is required');
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
                toast.success('App feature flag created');
            } else {
                fetchFlags();
            }

            // Reset form
            setNewFlagName('');
            setNewFlagDescription('');
            setNewFlagEnabled(true);
            setIsCreating(false);
        } catch (err: any) {
            console.error('Create flag failed', err);
            setFormError(err.response?.data?.message || 'Failed to create feature flag');
        } finally {
            setCreateLoading(false);
        }
    };

    // Filtered flags
    const filteredFlags = useMemo(() => {
        return flags.filter(flag => {
            const info = getAppInfo(flag.name, flag.rules);
            const matchesSearch = 
                flag.name.toLowerCase().includes(search.toLowerCase()) || 
                info.label.toLowerCase().includes(search.toLowerCase()) ||
                info.category.toLowerCase().includes(search.toLowerCase()) ||
                (flag.description && flag.description.toLowerCase().includes(search.toLowerCase()));
            
            if (!matchesSearch) return false;
            if (filter === 'enabled') return flag.isEnabled;
            if (filter === 'disabled') return !flag.isEnabled;
            return true;
        });
    }, [flags, search, filter]);

    const activeCount = flags.filter(f => f.isEnabled).length;
    const inactiveCount = flags.length - activeCount;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Sliders className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Platform Apps & Feature Flags
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-3xl">
                        Control enabling and disabling platform apps in real-time. Disabling an app places it into <strong className="text-amber-500">&quot;In Development&quot;</strong> upcoming feature mode, shows the gray watermark UI, locks its toggle, and blocks company user access.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleSyncPlatformApps}
                        disabled={syncing}
                        className="p-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2 text-xs font-bold"
                        title="Sync all default 11 platform apps and clean up legacy flags"
                    >
                        <RotateCcw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                        <span>Sync Apps</span>
                    </button>
                    <button
                        onClick={fetchFlags}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        title="Refresh flags"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="btn-primary flex items-center gap-2 text-xs font-bold"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add App Flag</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card stat-card-glow p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Apps</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{flags.length}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Platform runtime modules</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Layers className="w-6 h-6" />
                    </div>
                </div>

                <div className="glass-card stat-card-glow p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Live / Active</p>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {flags.length > 0 ? `${Math.round((activeCount / flags.length) * 100)}% online for users` : '0%'}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="glass-card stat-card-glow p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">In Development (Upcoming)</p>
                        <h3 className="text-2xl font-black text-amber-500 mt-1">{inactiveCount}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gray UI & Watermarked</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-500">
                        <Construction className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search app name, flag key, or category..."
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
                            {mode === 'all' ? 'All Apps' : mode === 'enabled' ? 'Live Apps' : 'In Development'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Flags Table / Cards */}
            <div className="table-wrapper">
                <table className="table">
                    <thead>
                        <tr>
                            <th className="w-1/3">App Name & Flag Identifier</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Status & User Access</th>
                            <th className="text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
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
                                        <Skeleton className="h-6 w-24 rounded-full" />
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
                                        <Layers className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">No apps found</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                        {search ? 'No apps matched your search query. Try clearing filters.' : 'Click "Sync Apps" above to initialize all 11 default platform apps.'}
                                    </p>
                                    <button
                                        onClick={handleSyncPlatformApps}
                                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all shadow-sm"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Sync Platform Apps Now</span>
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            filteredFlags.map((flag) => {
                                const info = getAppInfo(flag.name, flag.rules);
                                const IconComponent = info.icon;

                                return (
                                    <tr key={flag.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-2xl border ${info.color}`}>
                                                    <IconComponent className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                                                            {info.label}
                                                        </span>
                                                        <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                            {flag.name}
                                                        </span>
                                                    </div>
                                                    {flag.updatedAt && (
                                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                                            Updated {new Date(flag.updatedAt).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md font-medium leading-relaxed">
                                                {flag.description || <span className="text-slate-400 italic">No description provided</span>}
                                            </p>
                                        </td>
                                        <td>
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                {info.category}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
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

                                                {flag.isEnabled ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        Live / Accessible
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                                                        <Construction className="w-3 h-3 text-amber-600" />
                                                        In Development
                                                    </span>
                                                )}
                                            </div>
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
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">Add App Feature Flag</h3>
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
                                    placeholder="e.g. app_marketing_suite"
                                    value={newFlagName}
                                    onChange={(e) => setNewFlagName(e.target.value)}
                                    className="input font-mono text-xs"
                                    required
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Use snake_case with prefix (e.g. `app_new_module`).
                                </p>
                            </div>

                            <div>
                                <label className="form-label">Description</label>
                                <textarea
                                    placeholder="Explain what module or tool this flag toggles..."
                                    value={newFlagDescription}
                                    onChange={(e) => setNewFlagDescription(e.target.value)}
                                    rows={3}
                                    className="input text-xs resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                <div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Initial Status</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Enable this app immediately upon creation</p>
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
                                    className="btn-primary text-xs font-bold"
                                >
                                    {createLoading ? 'Deploying...' : 'Deploy App Flag'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Sparkles, Plus, ArrowRight, LayoutGrid, CheckCircle2, 
    Star, Plug2, ShieldCheck, Zap, Clock, Headphones, Lock, Shield
} from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import { useSubscription } from '@/lib/useSubscription';
import { APPS_CONFIG, AppTag } from '@/lib/module-map';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

// Core default apps that are ALWAYS active across all tiers and cannot be disabled
const DEFAULT_CORE_APPS = ['projects', 'workspace-tools', 'communications'];

// Apps that strictly require 180 Limitless tier ($20/mo)
const LIMITLESS_EXCLUSIVE_APPS = ['hr', 'advertising'];

// ─── Color Mapping per App ───
const APP_COLORS: Record<string, { bg: string; text: string; light: string; tagBg: string; tagText: string }> = {
    crm:               { bg: 'bg-blue-600',    text: 'text-blue-600',    light: 'bg-blue-50',    tagBg: 'bg-blue-50',    tagText: 'text-blue-700' },
    advertising:       { bg: 'bg-pink-600',    text: 'text-pink-600',    light: 'bg-pink-50',    tagBg: 'bg-pink-50',    tagText: 'text-pink-700' },
    projects:          { bg: 'bg-indigo-600',  text: 'text-indigo-600',  light: 'bg-indigo-50',  tagBg: 'bg-indigo-50',  tagText: 'text-indigo-700' },
    hr:                { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50', tagBg: 'bg-emerald-50', tagText: 'text-emerald-700' },
    finance:           { bg: 'bg-amber-500',   text: 'text-amber-600',   light: 'bg-amber-50',   tagBg: 'bg-amber-50',   tagText: 'text-amber-700' },
    insights:          { bg: 'bg-rose-600',    text: 'text-rose-600',    light: 'bg-rose-50',    tagBg: 'bg-rose-50',    tagText: 'text-rose-700' },
    'workspace-tools': { bg: 'bg-violet-600',  text: 'text-violet-600',  light: 'bg-violet-50',  tagBg: 'bg-violet-50',  tagText: 'text-violet-700' },
    communications:    { bg: 'bg-cyan-600',    text: 'text-cyan-600',    light: 'bg-cyan-50',    tagBg: 'bg-cyan-50',    tagText: 'text-cyan-700' },
    voiceforce:        { bg: 'bg-purple-600',  text: 'text-purple-600',  light: 'bg-purple-50',  tagBg: 'bg-purple-50',  tagText: 'text-purple-700' },
};

// ─── Filter Tab Definitions ───
const FILTER_TABS: { label: string; value: AppTag | 'all' }[] = [
    { label: 'All Apps', value: 'all' },
    { label: 'Business', value: 'Business' },
    { label: 'Productivity', value: 'Productivity' },
    { label: 'Analytics', value: 'Analytics' },
    { label: 'Communication', value: 'Communication' },
    { label: 'HR', value: 'HR' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Operations', value: 'Operations' },
    { label: 'Custom', value: 'Custom' },
];

// ─── Trust Footer Items ───
const TRUST_ITEMS = [
    { icon: ShieldCheck, title: 'Secure & Reliable', desc: 'Enterprise-grade security' },
    { icon: Zap,         title: 'Easy Integration', desc: 'Connect in minutes' },
    { icon: Headphones,  title: '24/7 Support', desc: "We're here to help" },
    { icon: Clock,       title: 'Scalable Solutions', desc: 'Grow with your business' },
];

// ─── Animation ───
const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } },
};
const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export default function AppsManagementPage() {
    const router = useRouter();
    const { company, refreshSettings, isAppDisabledByAdmin } = useSettings();
    const { isPaidPlan, isTrialing, plan, daysLeft } = useSubscription();

    const isPaidOrTrial = Boolean(isPaidPlan || isTrialing);
    const planName = (plan?.planName || '').toLowerCase();
    const isMomentum = planName.includes('momentum');

    const [search, setSearch] = useState('');
    const [enabledApps, setEnabledApps] = useState<string[]>(DEFAULT_CORE_APPS);
    const [enabledModules, setEnabledModules] = useState<string[]>([]);
    const [activeFilter, setActiveFilter] = useState<AppTag | 'all'>('all');
    const [installingAppId, setInstallingAppId] = useState<string | null>(null);

    const handleToggleApp = async (e: React.MouseEvent, appId: string, isEnabled: boolean) => {
        e.preventDefault();
        e.stopPropagation();

        // 1. Core Default Apps can never be turned off
        if (DEFAULT_CORE_APPS.includes(appId)) {
            toast('Projects, Workspace Tools, and Communications are core workspace apps.', {
                icon: '🛡️',
            });
            return;
        }

        // 2. Free Starter Plan check: Non-default apps require upgrade
        if (!isPaidOrTrial) {
            toast.error('This application requires a paid plan. Upgrade to 180 Momentum or Limitless to unlock it.');
            router.push('/settings/platform-billing');
            return;
        }

        // 3. Momentum tier restriction check
        if (isMomentum && LIMITLESS_EXCLUSIVE_APPS.includes(appId)) {
            toast.error(`This app requires the 180 Limitless plan ($20/mo). Upgrade to unlock all platform applications.`);
            router.push('/settings/platform-billing');
            return;
        }

        if (isAppDisabledByAdmin(appId)) {
            toast.error('This app is in development and cannot be enabled.');
            return;
        }

        try {
            setInstallingAppId(appId);
            const moduleIds = APPS_CONFIG.find(a => a.id === appId)?.modules.map(m => m.id) || [];
            
            // Core default apps are always preserved
            const baseApps = isEnabled 
                ? enabledApps.filter(id => id !== appId)
                : [...enabledApps, appId];
            const newApps = Array.from(new Set([...baseApps, ...DEFAULT_CORE_APPS]));
            
            let newModules = [...enabledModules];
            if (!isEnabled) {
                newModules = Array.from(new Set([...newModules, ...moduleIds]));
            } else {
                newModules = newModules.filter(id => !moduleIds.includes(id));
            }
            
            // Optimistic UI update
            setEnabledApps(newApps);
            setEnabledModules(newModules);
            
            await Promise.all([
                api.patch('/api/company-config/apps', { apps: newApps }),
                api.patch('/api/company-config/modules', { modules: newModules })
            ]);
            await refreshSettings(true);
            toast.success(isEnabled ? 'App uninstalled successfully' : 'App installed successfully');
        } catch (error: any) {
            // Revert optimistic update on failure
            setEnabledApps(Array.from(new Set([...(company?.enabledApps || []), ...DEFAULT_CORE_APPS])));
            setEnabledModules(company?.enabledModules || []);
            const errMsg = error?.response?.data?.error || error?.response?.data?.message || (isEnabled ? 'Failed to uninstall app' : 'Failed to install app');
            toast.error(errMsg);
            console.error('Toggle error:', error);
        } finally {
            setInstallingAppId(null);
        }
    };

    useEffect(() => {
        if (company) {
            const current = Array.isArray(company.enabledApps) ? company.enabledApps : [];
            setEnabledApps(Array.from(new Set([...current, ...DEFAULT_CORE_APPS])));
            setEnabledModules(company.enabledModules || []);
        } else {
            setEnabledApps(DEFAULT_CORE_APPS);
        }
    }, [company]);

    // ─── Derived Stats ───
    const totalApps = APPS_CONFIG.length;
    const activeApps = enabledApps.filter(appId => 
        APPS_CONFIG.some(config => config.id === appId) && !isAppDisabledByAdmin(appId)
    ).length;
    const customIntegrations = enabledApps.includes('integrations') ? 1 : 0;

    // ─── Filtered Apps ───
    const filteredApps = useMemo(() => {
        return APPS_CONFIG.filter(app => {
            const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase()) ||
                                  app.description.toLowerCase().includes(search.toLowerCase());
            const matchesFilter = activeFilter === 'all' || app.tag === activeFilter;
            return matchesSearch && matchesFilter;
        });
    }, [search, activeFilter]);

    // ─── Tab Counts ───
    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = { all: APPS_CONFIG.length };
        APPS_CONFIG.forEach(app => {
            counts[app.tag] = (counts[app.tag] || 0) + 1;
        });
        return counts;
    }, []);

    return (
        <div className="h-full flex flex-col overflow-hidden bg-[#FAFBFF] dark:bg-[#09090b]">
            {/* ─── Header ─── */}
            <div className="px-6 lg:px-8 pt-6 pb-4 flex-shrink-0">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">App Registry</h1>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                                <Shield className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                {isTrialing ? `15-Day Free Trial (${Math.max(0, daysLeft)}d)` : (isPaidPlan ? (plan?.planName || 'Paid Plan') : 'Free Starter')}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">
                            Discover and manage all applications available in your 180workspace environment.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search apps, tools, or modules..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-14 py-2.5 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-[12px] font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-blue-400 dark:focus:border-blue-600 w-64 shadow-xs transition-all"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded-md text-[10px] font-bold text-gray-400 dark:text-zinc-500">
                                ⌘ K
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Scrollable Content ─── */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-10 custom-scrollbar">
                <div className="max-w-[1440px] mx-auto space-y-6">
                    {/* ─── Free Tier Guidance Notice ─── */}
                    {!isPaidOrTrial && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/90 via-blue-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:via-blue-950/30 dark:to-purple-950/30 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">Free Starter Workspace</h4>
                                    <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80 font-medium mt-0.5">
                                        Default apps (Projects, Communications, Workspace Tools) are included in your workspace. Upgrade to Momentum ($17) or Limitless ($20) to turn on CRM, Finance, Website Builder, Voice Force, HR & Advertising.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => router.push('/settings/platform-billing')}
                                className="shrink-0 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
                            >
                                Upgrade Workspace Tier
                            </button>
                        </div>
                    )}

                    {/* ─── Stats Row ─── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Total Applications */}
                        <div className="flex items-center gap-3 p-3.5 bg-white dark:bg-zinc-900/90 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-xs">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                                <LayoutGrid className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider truncate">Total Apps</p>
                                <p className="text-xl font-black text-gray-900 dark:text-white leading-none mt-1">{totalApps}</p>
                            </div>
                        </div>

                        {/* Active Applications */}
                        <div className="flex items-center gap-3 p-3.5 bg-white dark:bg-zinc-900/90 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-xs">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider truncate">Active Apps</p>
                                <p className="text-xl font-black text-gray-900 dark:text-white leading-none mt-1">{activeApps}</p>
                            </div>
                        </div>

                        {/* Premium Apps */}
                        <div className="flex items-center gap-3 p-3.5 bg-white dark:bg-zinc-900/90 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-xs">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center shrink-0">
                                <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider truncate">Workspace Plan</p>
                                <p className="text-xs font-black text-purple-700 dark:text-purple-300 leading-none mt-1">
                                    {isTrialing ? '15-Day Trial' : (isPaidPlan ? (plan?.planName || 'Paid') : 'Free Starter')}
                                </p>
                            </div>
                        </div>

                        {/* Custom Integrations */}
                        <div className="flex items-center gap-3 p-3.5 bg-white dark:bg-zinc-900/90 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-xs">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center shrink-0">
                                <Plug2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider truncate">Custom Integration</p>
                                <p className="text-xl font-black text-gray-900 dark:text-white leading-none mt-1">{customIntegrations}</p>
                            </div>
                        </div>
                    </div>

                    {/* ─── Filter Tabs ─── */}
                    <div className="flex items-center gap-2 overflow-x-auto flex-nowrap w-full pb-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                        {FILTER_TABS.map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => setActiveFilter(tab.value)}
                                className={clsx(
                                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all duration-200 border cursor-pointer",
                                    activeFilter === tab.value
                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                        : "bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400"
                                )}
                            >
                                {tab.label}
                                <span className={clsx(
                                    "px-1.5 py-0.5 rounded-md text-[10px] font-black",
                                    activeFilter === tab.value
                                        ? "bg-white/20 text-white"
                                        : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                                    )}
                                >
                                    {tabCounts[tab.value] || 0}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* ─── App Cards Grid ─── */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        key={activeFilter + search}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredApps.map((app) => {
                                const isBlocked = isAppDisabledByAdmin(app.id);
                                const isCoreApp = DEFAULT_CORE_APPS.includes(app.id);
                                const isEnabled = !isBlocked && (isCoreApp || enabledApps.includes(app.id));
                                const colors = APP_COLORS[app.id] || { bg: 'bg-gray-600', text: 'text-gray-600', light: 'bg-gray-50', tagBg: 'bg-gray-100', tagText: 'text-gray-700' };

                                // Tier-based lock conditions:
                                const isLockedByPlan = !isCoreApp && !isPaidOrTrial;
                                const requiresLimitless = !isCoreApp && isPaidOrTrial && isMomentum && LIMITLESS_EXCLUSIVE_APPS.includes(app.id);

                                return (
                                    <motion.div
                                        key={app.id}
                                        variants={cardVariants}
                                        layout
                                        onClick={() => {
                                            if (isBlocked) {
                                                toast(`🚧 ${app.name} is currently in development and not yet available.`, {
                                                    id: `blocked-${app.id}`,
                                                    icon: '🛠️'
                                                });
                                                return;
                                            }
                                            if (isLockedByPlan) {
                                                toast('Upgrade to 180 Momentum or Limitless to unlock this application.', {
                                                    icon: '🔒'
                                                });
                                                router.push('/settings/platform-billing');
                                                return;
                                            }
                                            if (requiresLimitless) {
                                                toast('This app requires the 180 Limitless plan ($20/mo). Upgrade to unlock.', {
                                                    icon: '⚡'
                                                });
                                                router.push('/settings/platform-billing');
                                                return;
                                            }
                                            router.push(`/settings/apps/${app.id}/config`);
                                        }}
                                        className={clsx(
                                            "group relative flex flex-col p-3 rounded-2xl border transition-all duration-300",
                                            isBlocked
                                                ? "bg-slate-100/90 dark:bg-zinc-900/60 border-slate-300/80 dark:border-zinc-800 shadow-none cursor-not-allowed grayscale select-none"
                                                : isLockedByPlan
                                                    ? "bg-white/80 dark:bg-zinc-900/80 border-gray-200/90 dark:border-zinc-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md cursor-pointer"
                                                    : isEnabled 
                                                        ? "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 shadow-xs hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-0.5 hover:border-blue-100 dark:hover:border-zinc-700 cursor-pointer" 
                                                        : "bg-white/80 dark:bg-zinc-900/80 border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 shadow-xs cursor-pointer"
                                        )}
                                    >
                                        {/* Top: Icon + Action */}
                                        <div className="flex items-start justify-between mb-1.5">
                                            <div className={clsx(
                                                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                                                isBlocked
                                                    ? "bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700"
                                                    : isEnabled 
                                                        ? [colors.bg, "shadow-md"] 
                                                        : "bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700"
                                            )}>
                                                <app.icon className={clsx(
                                                    "w-4 h-4",
                                                    isBlocked ? "text-slate-400" : isEnabled ? "text-white" : "text-gray-500 dark:text-zinc-400"
                                                )} />
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className={clsx(
                                                    "text-[9px] font-bold",
                                                    isBlocked ? "text-slate-400" : "text-gray-400 dark:text-zinc-500"
                                                )}>
                                                    {app.modules.length} {app.modules.length === 1 ? 'Feature' : 'Features'}
                                                </p>

                                                {/* Action Slot: Core App (No toggle) vs Free Tier Locked vs Limitless Locked vs Paid Active Toggle */}
                                                {isCoreApp ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
                                                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                                        Active
                                                    </span>
                                                ) : isLockedByPlan ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            toast('Upgrade to 180 Momentum or Limitless to unlock this application.', {
                                                                icon: '🔒'
                                                            });
                                                            router.push('/settings/platform-billing');
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-xs cursor-pointer"
                                                    >
                                                        <Lock className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                                                        Upgrade
                                                    </button>
                                                ) : requiresLimitless ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            toast('This app requires 180 Limitless ($20/mo). Upgrade to unlock.', {
                                                                icon: '⚡'
                                                            });
                                                            router.push('/settings/platform-billing');
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/70 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors shadow-xs cursor-pointer"
                                                    >
                                                        <Lock className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                                                        Limitless
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            if (isBlocked) {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                toast.error(`${app.name} is in development and cannot be toggled.`);
                                                                return;
                                                            }
                                                            handleToggleApp(e, app.id, isEnabled);
                                                        }}
                                                        disabled={isBlocked || installingAppId === app.id}
                                                        className={clsx(
                                                            "relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                                            isBlocked
                                                                ? "bg-slate-300 dark:bg-zinc-700 cursor-not-allowed opacity-60"
                                                                : isEnabled ? colors.bg : "bg-gray-200 dark:bg-zinc-700",
                                                            !isBlocked && "cursor-pointer",
                                                            installingAppId === app.id ? "opacity-50 cursor-not-allowed" : ""
                                                        )}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className={clsx(
                                                                "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                                isEnabled && !isBlocked ? "translate-x-3" : "translate-x-0"
                                                            )}
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Title + Description */}
                                        <h3 className={clsx(
                                            "text-[13px] font-bold tracking-tight mb-0.5",
                                            isBlocked ? "text-slate-600 dark:text-zinc-400" : isEnabled ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-zinc-200"
                                        )}>
                                            {app.name}
                                        </h3>
                                        <p className={clsx(
                                            "text-[10px] leading-relaxed line-clamp-2",
                                            isBlocked ? "text-slate-400 dark:text-zinc-500" : isEnabled ? "text-gray-400 dark:text-zinc-400" : "text-gray-500 dark:text-zinc-400"
                                        )}>
                                            {app.description}
                                        </p>

                                        {/* Watermark overlay when blocked */}
                                        {isBlocked && (
                                            <>
                                                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl flex items-center justify-center z-10 select-none">
                                                    <span className="rotate-[-18deg] text-[10px] font-black uppercase tracking-wider text-slate-500/40 dark:text-zinc-400/40 bg-white/70 dark:bg-zinc-800/70 px-2 py-0.5 rounded border border-slate-300/60 dark:border-zinc-700/60 shadow-xs">
                                                        Upcoming Feature
                                                    </span>
                                                </div>
                                                <div className="mt-2 pt-1 border-t border-slate-200/70 dark:border-zinc-800 flex items-center justify-between">
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 text-[8px] font-black uppercase tracking-wide">
                                                        <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                                                        In Development
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                                        Locked by Admin
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        {/* Subtle dot pattern overlay for inactive non-blocked */}
                                        {!isEnabled && !isBlocked && (
                                            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] rounded-2xl" />
                                        )}
                                    </motion.div>
                                );
                            })}

                            {/* Request More Apps Card */}
                            <motion.div variants={cardVariants} layout>
                                <div className="group flex flex-col items-start p-3.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/40 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all duration-300 h-full cursor-pointer">
                                    <div className="flex items-start justify-between w-full mb-2">
                                        <div className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center group-hover:border-blue-200 dark:group-hover:border-blue-700 transition-colors shrink-0">
                                            <Plus className="w-4 h-4 text-gray-400 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                                        </div>
                                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-widest group-hover:translate-x-0.5 transition-transform mt-1">
                                            Request <ArrowRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                    <h3 className="text-[13px] font-bold text-gray-700 dark:text-zinc-200 mb-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        Request More Apps
                                    </h3>
                                    <p className="text-[10px] text-gray-400 dark:text-zinc-400 leading-relaxed mb-3">
                                        Can&apos;t find what you need? Let us build it for you.
                                    </p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>

                    {/* ─── Bottom Banner ─── */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 lg:p-10 flex items-center justify-between shadow-xl shadow-blue-200/30">
                        {/* Left content */}
                        <div className="relative z-10 flex-1">
                            <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                                Supercharge Your Workflow
                            </h2>
                            <p className="text-sm text-blue-100/80 font-medium max-w-md">
                                Connect all your favorite tools and automate your business processes in one unified workspace.
                            </p>
                        </div>

                        {/* Decorative elements */}
                        <div className="absolute -left-8 -bottom-8 w-48 h-48 bg-white/5 rounded-full" />
                        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/5 rounded-full" />
                        <div className="absolute left-1/4 -bottom-4 w-20 h-20 bg-white/5 rounded-full" />
                    </div>

                    {/* ─── Trust Footer ─── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-zinc-800/80">
                        {TRUST_ITEMS.map((item) => (
                            <div key={item.title} className="flex items-center gap-3 p-3">
                                <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex items-center justify-center shrink-0">
                                    <item.icon className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                                </div>
                                <div>
                                    <p className="text-[12px] font-bold text-gray-800 dark:text-zinc-200">{item.title}</p>
                                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

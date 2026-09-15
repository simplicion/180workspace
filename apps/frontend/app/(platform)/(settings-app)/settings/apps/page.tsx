'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Search, Settings, Sparkles, Plus, ArrowRight, Activity, Bell, Filter, LayoutGrid, CheckCircle2, Star, Plug2, ShieldCheck, Zap, Clock, Headphones } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import { APPS_CONFIG, AppTag } from '@/lib/module-map';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

// ─── Color Mapping per App ───
const APP_COLORS: Record<string, { bg: string; text: string; light: string; tagBg: string; tagText: string }> = {
    crm:           { bg: 'bg-blue-600',    text: 'text-blue-600',    light: 'bg-blue-50',    tagBg: 'bg-blue-50',    tagText: 'text-blue-700' },
    advertising:   { bg: 'bg-pink-600',    text: 'text-pink-600',    light: 'bg-pink-50',    tagBg: 'bg-pink-50',    tagText: 'text-pink-700' },
    projects:      { bg: 'bg-indigo-600',  text: 'text-indigo-600',  light: 'bg-indigo-50',  tagBg: 'bg-indigo-50',  tagText: 'text-indigo-700' },
    hr:            { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50', tagBg: 'bg-emerald-50', tagText: 'text-emerald-700' },
    finance:       { bg: 'bg-amber-500',   text: 'text-amber-600',   light: 'bg-amber-50',   tagBg: 'bg-amber-50',   tagText: 'text-amber-700' },
    insights:          { bg: 'bg-rose-600',    text: 'text-rose-600',    light: 'bg-rose-50',    tagBg: 'bg-rose-50',    tagText: 'text-rose-700' },
    'workspace-tools': { bg: 'bg-violet-600',  text: 'text-violet-600',  light: 'bg-violet-50',  tagBg: 'bg-violet-50',  tagText: 'text-violet-700' },
    communications:    { bg: 'bg-cyan-600',    text: 'text-cyan-600',    light: 'bg-cyan-50',    tagBg: 'bg-cyan-50',    tagText: 'text-cyan-700' },
    'social-media':    { bg: 'bg-teal-600',    text: 'text-teal-600',    light: 'bg-teal-50',    tagBg: 'bg-teal-50',    tagText: 'text-teal-700' },
    'traffic-director':{ bg: 'bg-indigo-600',  text: 'text-indigo-600',  light: 'bg-indigo-50',  tagBg: 'bg-indigo-50',  tagText: 'text-indigo-700' },
    voiceforce:        { bg: 'bg-purple-600',  text: 'text-purple-600',  light: 'bg-purple-50',  tagBg: 'bg-purple-50',  tagText: 'text-purple-700' },
    'media-editor':    { bg: 'bg-violet-600',  text: 'text-violet-600',  light: 'bg-violet-50',  tagBg: 'bg-violet-50',  tagText: 'text-violet-700' },
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
    const { company, refreshSettings } = useSettings();
    const [search, setSearch] = useState('');
    const [enabledApps, setEnabledApps] = useState<string[]>([]);
    const [enabledModules, setEnabledModules] = useState<string[]>([]);
    const [activeFilter, setActiveFilter] = useState<AppTag | 'all'>('all');
    const [installingAppId, setInstallingAppId] = useState<string | null>(null);

    const handleToggleApp = async (e: React.MouseEvent, appId: string, isEnabled: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            setInstallingAppId(appId);
            const moduleIds = APPS_CONFIG.find(a => a.id === appId)?.modules.map(m => m.id) || [];
            const newApps = isEnabled 
                ? enabledApps.filter(id => id !== appId)
                : [...enabledApps, appId];
            
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
        } catch (error) {
            // Revert optimistic update on failure
            setEnabledApps(company?.enabledApps || []);
            setEnabledModules(company?.enabledModules || []);
            toast.error(isEnabled ? 'Failed to uninstall app' : 'Failed to install app');
            console.error('Toggle error:', error);
        } finally {
            setInstallingAppId(null);
        }
    };

    useEffect(() => {
        if (company) {
            setEnabledApps(company.enabledApps || []);
            setEnabledModules(company.enabledModules || []);
        }
    }, [company]);

    // ─── Derived Stats ───
    const totalApps = APPS_CONFIG.length;
    const activeApps = enabledApps.filter(appId => APPS_CONFIG.some(config => config.id === appId)).length;
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
        <div className="h-full flex flex-col overflow-hidden bg-[#FAFBFF]">
            {/* ─── Header ─── */}
            <div className="px-6 lg:px-8 pt-6 pb-4 flex-shrink-0">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center mb-1">
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">App Registry</h1>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">
                            Discover and manage all the tools your team uses to work smarter.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search apps, tools, or modules..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-14 py-2.5 border border-gray-200 bg-white rounded-xl text-[12px] font-bold text-gray-900 focus:outline-none focus:border-blue-300 w-64 shadow-sm transition-all"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 rounded-md text-[10px] font-bold text-gray-400">
                                ⌘ K
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Scrollable Content ─── */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-10 custom-scrollbar">
                <div className="max-w-[1440px] mx-auto space-y-6">
                    {/* ─── Stats Row ─── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Total Applications */}
                        <div className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                <LayoutGrid className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">Total Apps</p>
                                <p className="text-xl font-black text-gray-900 leading-none mt-1">{totalApps}</p>
                            </div>
                        </div>

                        {/* Active Applications */}
                        <div className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">Active Apps</p>
                                <p className="text-xl font-black text-gray-900 leading-none mt-1">{activeApps}</p>
                            </div>
                        </div>

                        {/* Premium Apps */}
                        <div className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                                <Star className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">Premium Apps</p>
                                <div className="mt-1">
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[8px] font-black uppercase tracking-wider rounded-md">
                                        Coming Soon
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Custom Integrations */}
                        <div className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                <Plug2 className="w-4 h-4 text-orange-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">Custom Integration</p>
                                <p className="text-xl font-black text-gray-900 leading-none mt-1">{customIntegrations}</p>
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
                                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all duration-200 border",
                                    activeFilter === tab.value
                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-200 hover:text-blue-600"
                                )}
                            >
                                {tab.label}
                                <span className={clsx(
                                    "px-1.5 py-0.5 rounded-md text-[10px] font-black",
                                    activeFilter === tab.value
                                        ? "bg-white/20 text-white"
                                        : "bg-gray-100 text-gray-500"
                                )}>
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
                                const isEnabled = enabledApps.includes(app.id);
                                const activeModuleCount = app.modules.filter(m => enabledModules.includes(m.id)).length;
                                const colors = APP_COLORS[app.id] || { bg: 'bg-gray-600', text: 'text-gray-600', light: 'bg-gray-50', tagBg: 'bg-gray-100', tagText: 'text-gray-700' };
                                
                                return (
                                    <motion.div
                                        key={app.id}
                                        variants={cardVariants}
                                        layout
                                        onClick={() => router.push(`/settings/apps/${app.id}/config`)}
                                        className={clsx(
                                            "group relative flex flex-col p-2.5 rounded-2xl border transition-all duration-300 cursor-pointer",
                                            isEnabled 
                                                ? "bg-white border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-0.5 hover:border-blue-100" 
                                                : "bg-white/80 border-gray-200 hover:border-gray-300 shadow-sm"
                                        )}
                                    >
                                        {/* Top: Icon + Action */}
                                        <div className="flex items-start justify-between mb-1.5">
                                            <div className={clsx(
                                                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                                                isEnabled 
                                                    ? [colors.bg, "shadow-md"] 
                                                    : "bg-gray-100 border border-gray-200"
                                            )}>
                                                <app.icon className={clsx(
                                                    "w-4 h-4",
                                                    isEnabled ? "text-white" : "text-gray-500"
                                                )} />
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[9px] text-gray-400 font-bold">
                                                    {app.modules.length} {app.modules.length === 1 ? 'Feature' : 'Features'}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleToggleApp(e, app.id, isEnabled)}
                                                    disabled={installingAppId === app.id}
                                                    className={clsx(
                                                        "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                                        isEnabled ? colors.bg : "bg-gray-200",
                                                        installingAppId === app.id ? "opacity-50 cursor-not-allowed" : "opacity-100"
                                                    )}
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        className={clsx(
                                                            "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                            isEnabled ? "translate-x-3" : "translate-x-0"
                                                        )}
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Title + Description */}
                                        <h3 className={clsx(
                                            "text-[13px] font-bold tracking-tight mb-0.5",
                                            isEnabled ? "text-gray-900" : "text-gray-700"
                                        )}>
                                            {app.name}
                                        </h3>
                                        <p className={clsx(
                                            "text-[10px] leading-relaxed line-clamp-2",
                                            isEnabled ? "text-gray-400" : "text-gray-500"
                                        )}>
                                            {app.description}
                                        </p>



                                        {/* Subtle dot pattern overlay for inactive */}
                                        {!isEnabled && (
                                            <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px] rounded-2xl" />
                                        )}
                                    </motion.div>
                                );
                            })}

                            {/* Request More Apps Card */}
                            <motion.div variants={cardVariants} layout>
                                <div className="group flex flex-col items-start p-3.5 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-300 h-full cursor-pointer">
                                    <div className="flex items-start justify-between w-full mb-2">
                                        <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center group-hover:border-blue-200 transition-colors shrink-0">
                                            <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                        </div>
                                        <div className="flex items-center gap-1 text-blue-600 text-[9px] font-black uppercase tracking-widest group-hover:translate-x-0.5 transition-transform mt-1">
                                            Request <ArrowRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                    <h3 className="text-[13px] font-bold text-gray-700 mb-0.5 group-hover:text-blue-600 transition-colors">
                                        Request More Apps
                                    </h3>
                                    <p className="text-[10px] text-gray-400 leading-relaxed mb-3">
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
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                        {TRUST_ITEMS.map((item) => (
                            <div key={item.title} className="flex items-center gap-3 p-3">
                                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                    <item.icon className="w-4 h-4 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-[12px] font-bold text-gray-800">{item.title}</p>
                                    <p className="text-[10px] text-gray-400 font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

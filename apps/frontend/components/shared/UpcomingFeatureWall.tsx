'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    Construction, 
    ArrowLeft, 
    Sparkles, 
    Layers, 
    Clock, 
    ShieldAlert, 
    LayoutGrid, 
    Compass,
    CheckCircle2
} from 'lucide-react';
import { APPS_CONFIG } from '@/lib/module-map';

interface UpcomingFeatureWallProps {
    appId?: string | null;
    isConfigView?: boolean;
}

export default function UpcomingFeatureWall({ appId, isConfigView = false }: UpcomingFeatureWallProps) {
    const router = useRouter();
    const app = APPS_CONFIG.find(a => a.id === appId);
    const appName = app?.name || (appId ? appId.replace(/-/g, ' ').toUpperCase() : 'Application');
    const appDescription = app?.description || 'This workspace module is currently under active engineering and rollout preparation.';

    return (
        <div className="relative min-h-[82vh] w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl select-none">
            {/* ─── Angled Watermark Background Pattern ─── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.04] flex flex-col justify-around rotate-[-18deg] scale-125 select-none">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="whitespace-nowrap text-4xl sm:text-6xl font-black text-white tracking-[0.3em]">
                        IN DEVELOPMENT • UPCOMING FEATURE • IN DEVELOPMENT • UPCOMING FEATURE • IN DEVELOPMENT • UPCOMING FEATURE
                    </div>
                ))}
            </div>

            {/* Ambient Background Glows */}
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* ─── Main Modal Content ─── */}
            <div className="relative z-10 max-w-xl w-full text-center space-y-6 bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 sm:p-10 shadow-2xl">
                {/* Status Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider shadow-inner">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span>Upcoming Feature • In Development</span>
                </div>

                {/* Big Center Icon Badge with Watermark Badge */}
                <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600/60 flex items-center justify-center shadow-xl group">
                    <div className="absolute inset-0 rounded-3xl bg-amber-500/10 blur-xl opacity-60" />
                    <Construction className="w-11 h-11 text-amber-400 relative z-10 animate-bounce duration-1000" />
                    <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-600 text-[10px] font-black text-amber-400 tracking-wider">
                        BETA
                    </div>
                </div>

                {/* Headings */}
                <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {appName} is in Development
                    </h1>
                    <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-md mx-auto">
                        This app has been set to <span className="text-amber-400 font-semibold">&quot;In Development&quot;</span> by platform administration.
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-lg mx-auto">
                        {appDescription}
                    </p>
                </div>

                {/* Feature Highlights Preview Box */}
                {app?.modules && app.modules.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-left space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                Planned Capabilities
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                {app.modules.length} Features
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            {app.modules.slice(0, 4).map((mod) => (
                                <div key={mod.id} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 p-2 rounded-xl border border-slate-800/40">
                                    <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span className="truncate font-medium">{mod.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Admin Notice */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/40 text-xs text-slate-400 text-left">
                    <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>
                        Administrators can enable or toggle access to this application in the <strong className="text-slate-200">Superadmin Feature Flags Console</strong>.
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                        onClick={() => router.back()}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Go Back</span>
                    </button>

                    <Link
                        href="/settings/apps"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 active:scale-95"
                    >
                        <LayoutGrid className="w-4 h-4" />
                        <span>View App Registry</span>
                    </Link>

                    <Link
                        href="/"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800/70 text-xs font-semibold transition-all"
                    >
                        <Compass className="w-4 h-4" />
                        <span>Dashboard</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

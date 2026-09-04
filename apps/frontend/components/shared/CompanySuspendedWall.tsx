'use client';

import { useState } from 'react';
import { ShieldAlert, LifeBuoy, LogOut, Lock, ArrowRight, MessageSquare, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { QuickSupportDrawer } from '@workspace/ui';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function CompanySuspendedWall() {
    const { user, company, logout } = useAuth();
    const { platform, settings } = useSettings();
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const router = useRouter();

    const effectiveCompanyName = company?.name || company?.companyName || 'this company workspace';
    const effectiveSupportEmail = settings?.supportEmail || platform?.supportEmail || 'support@180workspace.com';
    const suspendedReason = (company?.metadata as any)?.suspendedReason || 'Administrative suspension or policy hold.';

    const handleLogout = async () => {
        try {
            await signOut({ redirect: false });
        } catch {}
        if (logout) logout();
        router.push('/login');
    };

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[9999] p-4 font-sans">
            <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden text-center p-8 sm:p-10 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
                {/* Shield Alert Icon */}
                <div className="relative mx-auto w-20 h-20">
                    <div className="absolute inset-0 rounded-3xl bg-rose-500/20 animate-ping opacity-60" />
                    <div className="relative w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-lg shadow-rose-500/10">
                        <ShieldAlert className="w-10 h-10" />
                    </div>
                </div>

                {/* Main Titles */}
                <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider mb-3">
                        <Lock className="w-3.5 h-3.5" /> Workspace Inactive
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Company Account Suspended
                    </h1>
                    <p className="text-slate-500 text-sm mt-2 leading-relaxed px-2 font-medium">
                        Access to <strong className="text-slate-800">{effectiveCompanyName}</strong> has been deactivated by platform administration.
                    </p>
                </div>

                {/* Suspension Info Banner */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-left space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span>Suspension Notice</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-mono bg-white p-2.5 rounded-xl border border-slate-200">
                        {suspendedReason}
                    </p>
                    <p className="text-[11px] text-slate-400">
                        All workspace tools, projects, and data are securely preserved and will become accessible upon account reinstatement.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                    <button
                        onClick={() => setIsSupportOpen(true)}
                        className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                    >
                        <LifeBuoy className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        <span>Contact Customer Support</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <div className="flex items-center justify-between gap-4 pt-1">
                        <a
                            href={`mailto:${effectiveSupportEmail}?subject=Reactivation Inquiry - ${encodeURIComponent(effectiveCompanyName)}`}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1.5"
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Email: {effectiveSupportEmail}</span>
                        </a>

                        <button
                            onClick={handleLogout}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Support Drawer Accessible Even While Suspended */}
            <QuickSupportDrawer 
                isOpen={isSupportOpen}
                onClose={() => setIsSupportOpen(false)}
            />
        </div>
    );
}

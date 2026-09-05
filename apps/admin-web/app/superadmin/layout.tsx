// Live Support Desk Active
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard, Building2, Users, CreditCard, Tag, Receipt,
    Settings, FileText, Megaphone, LifeBuoy, Database, Bug,
    LogOut, Bell, Shield, ChevronRight, Rocket, Globe, ToggleRight, Sparkles, Menu, X, ArrowLeft,
    CheckCircle2, Activity, ExternalLink, Newspaper, PhoneCall
} from 'lucide-react';
import { SuperAdminProvider, useSuperAdmin } from '../../lib/superadmin-context';
import { useSettings } from '../../lib/settings-context';
import { LogoLoader } from '@workspace/ui';

interface NavSection {
    title: string;
    items: {
        href: string;
        label: string;
        icon: any;
        badge?: string;
    }[];
}

const NAV_SECTIONS: NavSection[] = [
    {
        title: 'Command',
        items: [
            { href: '/superadmin', label: 'Platform Intelligence', icon: LayoutDashboard },
        ]
    },
    {
        title: 'Ecosystem & Workspaces',
        items: [
            { href: '/superadmin/companies', label: 'Companies', icon: Building2 },
        ]
    },
    {
        title: 'Billing & Monetization',
        items: [
            { href: '/superadmin/subscriptions', label: 'Subscriptions', icon: Receipt },
            { href: '/superadmin/plans', label: 'Plans & Pricing', icon: CreditCard },
            { href: '/superadmin/coupons', label: 'Discount Coupons', icon: Tag },
        ]
    },
    {
        title: 'Governance & Community',
        items: [
            { href: '/superadmin/blogs', label: 'Marketing Blog CMS', icon: Newspaper, badge: 'SEO' },
            { href: '/superadmin/tickets', label: 'Support & Issue Desk', icon: LifeBuoy, badge: 'Live' },
            { href: '/superadmin/feature-flags', label: 'Feature Flags', icon: ToggleRight },
            { href: '/superadmin/release-notes', label: 'Release Notes', icon: Rocket },
        ]
    },
    {
        title: 'Infrastructure & Ops',
        items: [
            { href: '/superadmin/voiceforce', label: '180 Voiceforce SFU', icon: PhoneCall, badge: 'Live' },
            { href: '/superadmin/logs', label: 'Audit Logs', icon: FileText },
            { href: '/superadmin/settings', label: 'Platform Settings', icon: Settings },
        ]
    },
];

function SuperAdminLayoutInner({ children }: { children: React.ReactNode }) {
    const { superAdmin, loading, logout } = useSuperAdmin();
    const { platform } = useSettings();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        // Enforce pure light mode across Super Admin Portal
        if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('dark');
        }
        try {
            localStorage.removeItem('sa_theme');
        } catch {}
    }, []);

    useEffect(() => {
        if (!loading && !superAdmin && pathname !== '/superadmin/login') {
            router.replace('/superadmin/login');
        }
    }, [superAdmin, loading, router, pathname]);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    if (pathname === '/superadmin/login') {
        return <>{children}</>;
    }

    if (loading && !superAdmin) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-50">
            <LogoLoader className="w-10 h-10 animate-spin text-sky-600" />
            <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">Authenticating Command Session...</p>
                <p className="text-[11px] text-slate-400">Verifying administrative security keys</p>
            </div>
            <Link 
                href="/superadmin/login" 
                className="text-xs font-bold text-sky-600 hover:text-sky-700 underline underline-offset-4 pt-1"
            >
                Go to Admin Login &rarr;
            </Link>
        </div>
    );
    if (!superAdmin) return null;

    return (
        <div className="min-h-screen bg-slate-50/70 flex text-slate-900 selection:bg-sky-500/20 font-sans">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden flex justify-center z-0">
                <div className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-sky-400/10 blur-[120px]" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[120px]" />
            </div>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col fixed inset-y-0 left-0 z-40 shadow-xl shadow-slate-200/40 dark:shadow-none transition-transform duration-300 lg:translate-x-0 select-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo & Mobile Close */}
                <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100 dark:border-slate-800 relative overflow-hidden shrink-0">
                    <div className="flex items-center gap-3 relative z-10">
                        {platform?.logo ? (
                            <img src={platform.logo} alt="Logo" className="w-9 h-9 rounded-xl object-contain bg-white shadow-sm p-1 border border-slate-200 dark:border-slate-700" />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 border border-sky-400/30 shrink-0">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">{platform?.platformName || '180workspace'}</p>
                            <p className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Super Admin
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Close Menu"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Categorized Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar text-xs">
                    {NAV_SECTIONS.map((section, sIdx) => (
                        <div key={section.title || sIdx} className="space-y-1">
                            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                                {section.title}
                            </p>
                            {section.items.map(item => {
                                const isActive = pathname === item.href || (item.href !== '/superadmin' && pathname.startsWith(item.href));
                                const Icon = item.icon;

                                return (
                                    <Link 
                                        key={item.href} 
                                        href={item.href} 
                                        prefetch={true}
                                        className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all font-semibold group ${
                                            isActive
                                                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shadow-2xs border border-sky-100 dark:border-sky-900/50'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                                                isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400'
                                            }`} />
                                            <span className="truncate">{item.label}</span>
                                        </div>
                                        {item.badge && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Profile Widget */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
                    <div 
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500 transition-all group cursor-pointer shadow-2xs"
                        onClick={() => router.push('/superadmin/settings')}
                    >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {superAdmin.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{superAdmin.name || 'Administrator'}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{superAdmin.email}</p>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); logout(); }} 
                            title="Logout" 
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shrink-0"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen relative z-10 w-full lg:w-[calc(100%-16rem)] overflow-x-hidden transition-all duration-300">
                {/* Top Glass Header */}
                <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-sky-600 transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
                            <Shield className="w-3.5 h-3.5 text-sky-500" />
                            <span className="text-sky-600 dark:text-sky-400 font-bold">Platform Admin</span>
                            <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                            <span className="text-slate-600 dark:text-slate-300 font-medium">Cloud Command</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Live Microservices Status Indicator */}
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 rounded-full text-[11px] font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                            <span>Microservices Operational</span>
                        </div>

                        {/* Direct Quick Link to Main Platform */}
                        <a 
                            href="http://localhost:3000"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-colors"
                            title="Open Tenant Platform"
                        >
                            <span>Open Platform</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>

                        {/* Notifications */}
                        <button 
                            aria-label="Notifications" 
                            className="relative p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-sky-600 hover:bg-white transition-all shadow-2xs cursor-pointer"
                        >
                            <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-white" />
                            <Bell className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {/* Page Content Injection */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar relative">
                    <div className="relative z-10 max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <SuperAdminProvider>
            <SuperAdminLayoutInner>{children}</SuperAdminLayoutInner>
        </SuperAdminProvider>
    );
}



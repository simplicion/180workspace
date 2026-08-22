'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { ChevronDown, ChevronLeft, ChevronRight, Menu, Star, Clock, LogOut, Wrench, Bot, FileSignature, BarChart3, MessageSquare, FolderOpen, CalendarDays, Video, Sparkles, X, ArrowRight, Activity, Eye } from 'lucide-react';
import { navigation } from '@/lib/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PinnedItem from '@/app/dashboard/(dashboard)/_components/PinnedItem';
import RecentItem from '@/app/dashboard/(dashboard)/_components/RecentItem';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useSubscription } from '@/lib/useSubscription';
import clsx from 'clsx';
import { HelpIcon , LogoLoader } from "@workspace/ui";
import dynamic from 'next/dynamic';
import { signOut } from 'next-auth/react';
import { MeetingProvider, useMeeting } from '@/lib/meeting-context';
import FloatingMeetingPiP from '@/components/shared/FloatingMeetingPiP';

const safeImport = (importFn: () => Promise<any>) => {
    return importFn().catch((err) => {
        if (err.message.includes('ChunkLoadError') || err.message.includes('Loading chunk')) {
            if (typeof window !== 'undefined') {
                const hasReloaded = sessionStorage.getItem('chunkLoadReloaded');
                if (!hasReloaded) {
                    sessionStorage.setItem('chunkLoadReloaded', 'true');
                    window.location.reload();
                    return new Promise(() => { }); // never resolve while reloading to avoid error flashes
                }
                sessionStorage.removeItem('chunkLoadReloaded');
            }
        }
        throw err;
    });
};

import GlobalSearch from '@/components/shared/GlobalSearch';
import SystemSetupStatus from '@/app/dashboard/(dashboard)/_components/SystemSetupStatus';
import NotificationsPanel from '@/components/shared/NotificationsPanel';
import TrialBanner from '@/components/shared/TrialBanner';
import SubscriptionExpiredWall from '@/components/shared/SubscriptionExpiredWall';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { MODULE_MAP, APP_DEPENDENCIES } from '@/lib/module-map';


// navigation moved to ../../lib/navigation.ts

const TOOLS = [
    { name: 'AI Assistant', desc: 'Chat with your AI', href: '/dashboard/ai', icon: Bot, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-700' },
    { name: 'Analytics', desc: 'Reports & insights', href: '/dashboard/analytics', icon: BarChart3, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    { name: 'Chat', desc: 'Team messaging', href: '/dashboard/chat', icon: MessageSquare, color: 'from-sky-500 to-cyan-600', bg: 'bg-sky-50', text: 'text-sky-700' },
    { name: 'Documents', desc: 'Files & documents', href: '/dashboard/documents', icon: FolderOpen, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700' },
    { name: 'Content Calendar', desc: 'Plan your content', href: '/dashboard/content-calendar', icon: CalendarDays, color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50', text: 'text-rose-700' },
    { name: 'Meetings', desc: 'Schedule & join calls', href: '/dashboard/meeting', icon: Video, color: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-50', text: 'text-cyan-700' },
    { name: 'Work Logs', desc: 'Track & submit your work', href: '/dashboard/work-logs', icon: Clock, color: 'from-amber-600 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-700' },
];

function ToolsDropdown() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className={clsx(
                    'w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300',
                    open
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
                )}
                title="Tools"
                aria-label="Open Tools"
            >
                <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <Wrench className="w-4 h-4" />
                </motion.div>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.96, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 8, scale: 0.96, filter: 'blur(4px)' }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 top-12 w-[340px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-indigo-100 border border-gray-100/80 z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100/50 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
                            <div className="flex items-center gap-2">
                                <motion.div
                                    animate={{ rotate: [0, 15, -15, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                                >
                                    <Sparkles className="w-4 h-4 text-indigo-500" />
                                </motion.div>
                                <span className="font-bold text-sm text-gray-900">Quick Tools</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100/80 text-indigo-600 px-1.5 py-0.5 rounded-md">AI Powered</span>
                            </div>
                            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-200/50 transition-colors">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Tools Grid */}
                        <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50/30">
                            {TOOLS.map((tool, index) => {
                                const Icon = tool.icon;
                                return (
                                    <motion.div
                                        key={tool.name}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03, duration: 0.3, ease: 'easeOut' }}
                                    >
                                        <Link
                                            href={tool.href}
                                            prefetch={true}
                                            onClick={() => setOpen(false)}
                                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-sm transition-all group"
                                        >
                                            <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 group-active:scale-95', tool.color, 'shadow-sm')}>
                                                <Icon className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">{tool.name}</p>
                                                <p className="text-[10px] text-gray-400 truncate leading-tight mt-0.5 group-hover:text-gray-500">{tool.desc}</p>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="px-3 pb-3 pt-1 bg-gray-50/30">
                            <Link
                                href="/dashboard/ai"
                                onClick={() => setOpen(false)}
                                className="relative overflow-hidden w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition-all group"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-xl" />
                                <Bot className="w-4 h-4 relative z-10 group-hover:animate-bounce" />
                                <span className="relative z-10">Open AI Assistant</span>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ProfileDropdown() {
    const { user, company, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (!user) return null;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
            >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm overflow-hidden bg-white">
                    {(user?.photoUrl || company?.companyLogo || company?.logoUrl) ? (
                        <img src={user?.photoUrl || company?.companyLogo || company?.logoUrl} alt={user?.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <div className="w-full h-full rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
                            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                        </div>
                    )}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">{user?.name?.split(' ')[0] || 'User'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl shadow-gray-200/50 border border-gray-100 py-1.5 z-50 overflow-hidden"
                    >
                        <Link
                            href="/dashboard/profile/me"
                            onClick={() => setOpen(false)}
                            className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                        >
                            Profile Settings
                        </Link>
                        <div className="h-px bg-gray-100 my-1 mx-2" />
                        <button
                            onClick={() => { setOpen(false); logout(); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Log Out
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function RecentDropdown({ recentItems, isExpanded }: { recentItems: any[], isExpanded: boolean }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (recentItems.length === 0) return null;

    return (
        <div ref={ref} className="relative mb-6">
            <button
                onClick={() => setOpen(v => !v)}
                className={clsx(
                    "w-full flex items-center p-2 rounded-xl hover:bg-gray-50 transition-colors group border border-transparent",
                    open ? "bg-gray-50 border-gray-200/50" : "",
                    isExpanded ? "justify-between" : "justify-center"
                )}
            >
                <div className="flex items-center gap-2.5">
                    <div className={clsx(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                        open ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                    )}>
                        <Clock className="w-4 h-4" />
                    </div>
                    {isExpanded && (
                        <span className="text-sm font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">Recent Items</span>
                    )}
                </div>
                {isExpanded && (
                    <ChevronDown 
                        className={clsx(
                            "w-3.5 h-3.5 text-gray-400 transition-transform duration-200 group-hover:text-gray-600",
                            open ? "rotate-180" : ""
                        )}
                    />
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 8, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={clsx(
                            "absolute z-50 w-[260px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden py-2",
                            isExpanded ? "left-0 top-full" : "left-full top-0 ml-4"
                        )}
                    >
                        <div className="px-4 pb-2 mb-2 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                Recent Activity
                            </span>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto hidden-scrollbar px-2 space-y-1">
                            {recentItems.slice(0, 5).map((item) => (
                                <RecentItem
                                    key={`${item.recordId}-${item.type}`}
                                    {...item}
                                    isExpanded={true}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (v: boolean) => void;
    isHovered: boolean;
    setIsHovered: (v: boolean) => void;
}

function Sidebar({ isCollapsed, setIsCollapsed, isHovered, setIsHovered }: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams?.get('tab');
    const router = useRouter();

    const handleLinkClick = () => {
        if (window.innerWidth < 1024) {
            setIsCollapsed(true);
        }
    };

    // Handle active detection for both plain paths and ?tab= query-param hrefs
    function isHrefActive(href: string, exact?: boolean): boolean {
        if (!href) return false;
        if (href.includes('?')) {
            const [hrefPath, hrefQuery] = href.split('?');
            const hrefParams = new URLSearchParams(hrefQuery);
            return pathname === hrefPath && currentTab === hrefParams.get('tab');
        }
        if (exact) return pathname === href;
        return pathname === href || !!pathname?.startsWith(href + '/');
    }
    const { user, logout } = useAuth();
    const { company, settings, platform, refreshSettings } = useSettings();
    const { isExpired, isTrialing, daysLeft, plan, status } = useSubscription();

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [favorites, setFavorites] = useState<any[]>([]);
    const [recentItems, setRecentItems] = useState<any[]>([]);
    const [isRecentOpen, setIsRecentOpen] = useState(true);
    const [isLoadingFavs, setIsLoadingFavs] = useState(true);


    const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchPreferences = async (forceFetch = false) => {
        if (!user) return;

        if (!forceFetch) {
            try {
                const stored = sessionStorage.getItem('platform_init_data');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.preferences) {
                        setFavorites((parsed.preferences.favorites || []).filter((f: any) => f.type?.toLowerCase() !== 'user'));
                        setRecentItems((parsed.preferences.recentItems || []).filter((r: any) => r.type?.toLowerCase() !== 'user'));
                        setIsLoadingFavs(false);
                        return; // Skip the network request since we have it from init
                    }
                }
            } catch (e) { }
        }

        // Debounce protection: Clear existing timer
        if (fetchTimerRef.current) {
            clearTimeout(fetchTimerRef.current);
        }

        fetchTimerRef.current = setTimeout(async () => {
            try {
                const res = await api.get('/api/bootstrap');
                if (res.data?.preferences) {
                    sessionStorage.setItem('platform_init_data', JSON.stringify(res.data));
                    setFavorites((res.data.preferences.favorites || []).filter((f: any) => f.type?.toLowerCase() !== 'user'));
                    setRecentItems((res.data.preferences.recentItems || []).filter((r: any) => r.type?.toLowerCase() !== 'user'));
                }
            } catch (error) {
                try {
                    const res = await api.get('/api/user-preferences');
                    setFavorites((res.data.favorites || []).filter((f: any) => f.type?.toLowerCase() !== 'user'));
                    setRecentItems((res.data.recentItems || []).filter((r: any) => r.type?.toLowerCase() !== 'user'));
                } catch (err) {}
            } finally {
                setIsLoadingFavs(false);
            }
        }, 150);
    };

    const handleUnpin = async (recordId: string, type: string) => {
        try {
            await api.post('/api/user-preferences/favorites/toggle', { recordId, type });
            setFavorites(prev => prev.filter(f => !(f.recordId === recordId && f.type === type)));
            toast.success('Unpinned from sidebar');
        } catch (error) {
            toast.error('Failed to unpin');
        }
    };

    useEffect(() => {
        fetchPreferences();
        const handleUpdate = () => fetchPreferences(true);
        window.addEventListener('favoritesUpdated', handleUpdate);
        window.addEventListener('recentItemsUpdated', handleUpdate);
        return () => {
            window.removeEventListener('favoritesUpdated', handleUpdate);
            window.removeEventListener('recentItemsUpdated', handleUpdate);
        };
    }, [user]);

    const userRoles = useMemo(() => {
        const roles = Array.isArray(user?.roles) ? [...user.roles] : [user?.role];
        const normalizedRole = user?.role?.toLowerCase();
        if (roles.includes('admin') || normalizedRole === 'admin' || normalizedRole === 'ceo' || normalizedRole === 'superadmin' || normalizedRole === 'creator' || normalizedRole === 'owner' || normalizedRole === 'founder') {
            roles.push('admin');
        }
        return roles.filter((r): r is string => Boolean(r)).map(r => r.toLowerCase());
    }, [user]);

    const filteredNav = useMemo(() => {
        return navigation.map(item => {
            if ('group' in item) {
                // 1. App Level Toggling with Subscription Limits
                const defaultApps = ['projects', 'communications', 'workspace-tools'];
                const isDefaultApp = item.appId ? defaultApps.includes(item.appId) : false;
                const hasActivePlan = !isExpired && status !== 'expired' && status !== 'cancelled' && status !== 'No Active Plan';
                
                let isAppEnabled = false;
                if (!item.appId) {
                    isAppEnabled = true; // Settings, Dashboard, etc.
                } else if (hasActivePlan) {
                    // Check against the plan's max apps
                    const maxApps = plan?.maxApps || 3;
                    const companyEnabledApps = company?.enabledApps || [];
                    // We only allow up to maxApps from their enabled list.
                    // Assuming the array is ordered, the first `maxApps` are allowed.
                    // If the app is in this allowed subset, it's enabled.
                    const allowedSubset = companyEnabledApps.slice(0, maxApps);
                    
                    // Default apps are always available and don't count towards the limit, 
                    // OR they do count? Usually defaults are always allowed.
                    if (isDefaultApp) {
                        isAppEnabled = companyEnabledApps.includes(item.appId);
                    } else {
                        isAppEnabled = allowedSubset.includes(item.appId);
                    }
                } else {
                    // No active plan: only allow default apps if they are in enabledApps
                    isAppEnabled = isDefaultApp && (company?.enabledApps || []).includes(item.appId);
                }

                // 2. Filter individual modules within the group
                const filteredItems = (item.items || []).filter((subItem: any) => {
                    const hasGranularAccess = subItem.id && user?.permissions?.includes(subItem.id);
                    const roleMatch = userRoles.some(r => subItem.roles?.includes(r as string)) || hasGranularAccess;
                    if (!roleMatch) return false;

                    // Only check module enablement if this group belongs to a configurable app
                    if (item.appId && isAppEnabled && subItem.id && company?.enabledModules) {
                        return company.enabledModules.includes(subItem.id);
                    }
                    return isAppEnabled;
                });

                if (filteredItems.length === 0) return null;
                return { ...item, items: filteredItems };
            } else {
                // Handle single items (Dashboard, CEO Insights)
                if (userRoles.some(r => item.roles?.includes(r as string))) {
                    return item;
                }
                return null;
            }
        }).filter(Boolean) as any[];
    }, [userRoles, company?.enabledApps, company?.enabledModules, isExpired, status, plan]);

    useEffect(() => {
        const activeGroup = filteredNav.find(n =>
            'group' in n && n.items.some((i: any) => pathname === i.href || pathname?.startsWith(i.href + '/'))
        );
        if (activeGroup && 'group' in activeGroup) {
            setOpenGroups(prev => ({ ...prev, [activeGroup.group]: true }));
        }
    }, [pathname, filteredNav]);

    const toggleGroup = (groupName: string) => {
        setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    const isExpanded = !isCollapsed || isHovered;

    return (
        <aside
            onMouseEnter={() => isCollapsed && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={clsx(
                "h-full flex flex-col bg-white/80 backdrop-blur-xl border-r border-gray-200/50 overflow-y-auto fixed top-0 left-0 z-30 transition-all duration-300 ease-in-out shadow-sm overflow-x-hidden hidden-scrollbar select-none",
                isExpanded ? "w-[280px] translate-x-0" : "w-[280px] lg:w-[80px] -translate-x-full lg:translate-x-0"
            )}
        >
            {/* Back to PitchIn Button & Sidebar Toggle */}
            <div className="p-3 border-b border-gray-200/50 flex items-center justify-between gap-2 relative">
                <Link href="/" onClick={handleLinkClick} className={clsx(
                    "flex items-center gap-3 p-2.5 rounded-xl text-sm font-semibold transition-all group flex-1 overflow-hidden",
                    isExpanded
                        ? "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 hover:from-indigo-100 hover:to-violet-100 border border-indigo-100 shadow-sm"
                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 justify-center"
                )} title="Back to 180workspace">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white text-indigo-600 shadow-sm group-hover:scale-105 transition-transform">
                        <img src="/black%20icon.svg" alt="180workspace" className="w-5 h-5 object-contain" />
                    </div>
                    {isExpanded && <span className="font-bold tracking-tight text-lg text-indigo-900 whitespace-nowrap"><span className="text-blue-600">180</span>workspace</span>}
                </Link>

                {isExpanded && (
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:block p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                        aria-label="Collapse Sidebar"
                        title="Collapse Sidebar"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}
            </div>



            {/* Nav Area */}
            <nav className="flex-1 p-4 space-y-1.5 hidden-scrollbar overflow-y-auto overflow-x-hidden">
                {/* Favorites Section */}
                {favorites.length > 0 && (
                    <div className="mb-6 space-y-2">
                        {isExpanded && (
                            <div className="flex items-center justify-between px-1 mb-2">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    Favorites
                                </h3>
                            </div>
                        )}
                        {!isExpanded && (
                            <div className="h-px bg-gray-100/50 mx-2 mb-2" />
                        )}
                        <div className="space-y-1 animate-in fade-in slide-in-from-left-2 duration-500">
                            {favorites.map((fav) => (
                                <PinnedItem
                                    key={`${fav.recordId}-${fav.type}`}
                                    {...fav}
                                    isExpanded={isExpanded}
                                    onRemove={handleUnpin}
                                />
                            ))}
                        </div>
                        {isExpanded && <div className="h-px bg-gray-50/50 mx-1" />}
                    </div>
                )}

                {/* Recent Section */}
                <RecentDropdown recentItems={recentItems} isExpanded={isExpanded} />

                {filteredNav.map((item, idx) => {
                    if ('group' in item) {
                        const isOpen = openGroups[item.group];
                        const GroupIcon = item.icon;
                        const isAnyChildActive = item.items.some((i: any) => isHrefActive(i.href, i.exact));

                        return (
                            <div key={item.group} className="space-y-1">
                                <button
                                    onClick={() => toggleGroup(item.group)}
                                    className={clsx(
                                        "w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-semibold transition-all group",
                                        isAnyChildActive ? "text-indigo-600" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50/50 hover:backdrop-blur-sm"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                                            isAnyChildActive ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-600"
                                        )}>
                                            <GroupIcon className="w-4 h-4" />
                                        </div>
                                        {isExpanded && <span className="whitespace-nowrap">{item.group}</span>}
                                    </div>
                                    {isExpanded && (
                                        <ChevronDown className={clsx(
                                            "w-3.5 h-3.5 transition-transform duration-200",
                                            isOpen ? "rotate-180" : "opacity-40"
                                        )} />
                                    )}
                                </button>

                                <div className={clsx(
                                    "space-y-1 overflow-hidden transition-all duration-300",
                                    (isOpen && isExpanded) ? "max-h-[1000px] opacity-100 mt-1" : "max-h-0 opacity-0"
                                )}>
                                    {item.items.map((subItem: any) => {
                                        const SubIcon = subItem.icon;
                                        const isActive = isHrefActive(subItem.href, subItem.exact);
                                        return (
                                            <Link
                                                key={subItem.name}
                                                href={subItem.href || '#'}
                                                prefetch={true}
                                                onClick={handleLinkClick}
                                                className={clsx(
                                                    'flex items-center gap-3 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all relative overflow-hidden group/sub hover:bg-white/50',
                                                    isExpanded ? 'ml-12' : 'ml-0 justify-center',
                                                    isActive
                                                        ? 'bg-indigo-50/50 text-indigo-700 shadow-sm border border-indigo-100/50'
                                                        : 'text-gray-500 hover:text-gray-900 hover:backdrop-blur-sm'
                                                )}
                                                title={!isExpanded ? subItem.name : undefined}
                                            >
                                                {isActive && (
                                                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-full" />
                                                )}
                                                {isExpanded ? (
                                                    <span className={clsx(
                                                        "transition-transform duration-200",
                                                        !isActive && "group-hover/sub:translate-x-1"
                                                    )}>
                                                        {subItem.name}
                                                    </span>
                                                ) : (
                                                    SubIcon ? <SubIcon className="w-4 h-4" /> : <div className="w-4 h-4 bg-gray-200 rounded-full" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }

                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    return (
                        <Link key={item.name} href={item.href || '#'} prefetch={true} onClick={handleLinkClick}
                            className={clsx(
                                'flex items-center gap-2.5 p-2.5 rounded-xl text-sm font-semibold transition-all group border border-transparent',
                                isActive
                                    ? 'bg-indigo-600/90 backdrop-blur-md text-white shadow-md shadow-indigo-200 border-indigo-500/50'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50 hover:backdrop-blur-sm hover:border-gray-200/50',
                                !isExpanded && 'justify-center'
                            )}
                            title={!isExpanded ? item.name : undefined}
                        >
                            <div className={clsx(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                                isActive ? "bg-white/20 text-white" : "bg-gray-50 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-600"
                            )}>
                                {item.name === '180 View' ? (
                                    <div className="flex flex-col items-center justify-center -space-y-[1px]">
                                        <Eye className="w-3.5 h-3.5" />
                                        <span className="text-[8px] font-black tracking-tight leading-none">180</span>
                                    </div>
                                ) : (
                                    Icon ? <Icon className="w-4 h-4" /> : <div className="w-4 h-4 bg-gray-200 rounded-full" />
                                )}
                            </div>
                            {isExpanded && <span className="whitespace-nowrap">{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

function DashboardInner({ children }: { children: React.ReactNode }) {
    const { user, company, isLoading: authLoading } = useAuth();
    const pwa = usePWAInstall();
    const { isLoading: settingsLoading } = useSettings();
    const { isExpired, status, mandateStatus, paymentsEnabled, loading: subLoading } = useSubscription();
    const router = useRouter();
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const { meeting } = useMeeting();

    // Contextual Help Slug Determination
    const getHelpSlug = () => {
        if (pathname === '/dashboard') return 'dashboard';
        if (pathname?.includes('/projects')) return 'projects';
        if (pathname?.includes('/tasks')) return 'tasks';
        if (pathname?.includes('/sales/deals')) return 'crm-leads';
        if (pathname?.includes('/sales/contacts')) return 'crm-contacts';
        if (pathname?.includes('/sales/accounts')) return 'crm-accounts';
        if (pathname?.includes('/sales/leads-pipeline')) return 'crm-opportunities';
        if (pathname?.includes('/attendance')) return 'attendance';
        if (pathname?.includes('/leaves')) return 'leaves';
        if (pathname?.includes('/invoices')) return 'finance-invoices';
        if (pathname?.includes('/expenses')) return 'finance-expenses';
        if (pathname?.includes('/ai')) return 'ai-tools';
        if (pathname?.includes('/activity')) return 'activity-log';
        if (pathname?.includes('/help-support')) return 'help-support';
        return 'dashboard';
    };

    // Initialize state from localStorage (or default to collapsed)
    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved !== null) {
            // Respect saved preference but if never set, stay collapsed as requested
            setIsCollapsed(saved === 'true');
        } else {
            setIsCollapsed(true);
        }
    }, []);

    // Persist state
    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', String(isCollapsed));
    }, [isCollapsed]);

    const normalizedRole = user?.role?.toLowerCase() || '';
    const isAdmin = ['admin', 'ceo', 'superadmin', 'creator', 'owner', 'founder', 'accounting', 'finance_admin', 'hr_admin', 'manager'].includes(normalizedRole) ||
        user?.roles?.some(r => ['admin', 'ceo', 'superadmin', 'creator', 'owner', 'founder', 'accounting', 'finance_admin', 'hr_admin', 'manager'].includes(r?.toLowerCase() || '')) ||
        (user?.permissions && user.permissions.includes('can_manage_team'));
    
    const isBillingPath = pathname?.startsWith('/dashboard/settings/platform-billing') || pathname?.startsWith('/dashboard/billing') || false;
    
    // Check if the current path is allowed based on filteredNav and defaults
    const isPathAllowed = () => {
        if (!pathname) return true;
        
        // Define default/always allowed paths
        const alwaysAllowed = [
            '/dashboard', 
            '/dashboard/settings', 
            '/dashboard/profile', 
            '/dashboard/help-support', 
            '/dashboard/activity'
        ];
        if (alwaysAllowed.some(p => pathname === p || pathname.startsWith(p + '/'))) return true;

        // Default apps
        const defaultAppPaths = [
            '/dashboard/projects', '/dashboard/tasks', '/dashboard/work-logs', 
            '/dashboard/chat', '/dashboard/meeting', '/dashboard/emails', 
            '/dashboard/calendar', '/dashboard/documents', '/dashboard/assets', '/dashboard/ai'
        ];
        
        const isDefaultAppPath = defaultAppPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
        const hasActivePlan = !isExpired && status !== 'expired' && status !== 'cancelled' && status !== 'No Active Plan';

        if (!hasActivePlan) {
            // Only allow default apps and always allowed paths
            return isDefaultAppPath;
        }

        // Has active plan, but we need to check if the app is enabled (within their limit)
        // Since layout.tsx doesn't have the full routing map here, we approximate:
        // Actually, if we just rely on Sidebar hiding the links, we can be a bit lenient here.
        // But for strictness, we'd need to map paths to appIds.
        return true;
    };

    const showWall = !isPathAllowed() && !(isAdmin && isBillingPath);

    useEffect(() => {
        if (!authLoading && !user) {
            // Clear next-auth session to prevent middleware redirect loops
            signOut({ redirect: false }).then(() => {
                router.push('/login');
            });
            return;
        }

        if (!authLoading && user && company) {

            // Gate 3: Mandate setup required for admins
            if (isAdmin && paymentsEnabled && !subLoading) {
                if (status === 'mandate_pending' && mandateStatus === 'pending' && !isBillingPath) {
                    router.push('/dashboard/billing');
                }
            }
        }
    }, [user, authLoading, company, pathname, router, status, mandateStatus, isAdmin, paymentsEnabled, subLoading, isBillingPath]);

    useEffect(() => {
        if (!user) return;
        let socketInstance: any = null;
        let handleContractSigned: any = null;

        const initSocket = async () => {
            try {
                const { getSocket } = await import('@/lib/socket');
                socketInstance = getSocket();
                if (!socketInstance) return;
                
                handleContractSigned = (data: any) => {
                    toast((t) => (
                        <div className="flex flex-col gap-2 max-w-sm">
                            <div className="flex items-center gap-2 font-bold text-gray-900">
                                <span>📝</span> Contract Signed!
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                &quot;{data.title || 'A contract'}&quot; was just signed by {data.clientName || 'the client'}.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => {
                                    toast.dismiss(t.id);
                                    router.push('/dashboard/projects?new=true&contractId=' + (data.contractId || data.id || ''));
                                }} className="flex-1 bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                                    Convert to Project
                                </button>
                                <button onClick={() => toast.dismiss(t.id)} className="flex-1 bg-gray-100 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ), { duration: 15000 });
                };
                
                socketInstance.on('contract:signed', handleContractSigned);
            } catch (err) {
                console.error("Failed to initialize socket for DashboardInner:", err);
            }
        };
        initSocket();

        return () => {
            if (socketInstance && handleContractSigned) {
                socketInstance.off('contract:signed', handleContractSigned);
            }
        };
    }, [user, router]);

    if (authLoading || settingsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <LogoLoader className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">{authLoading ? 'Authenticating session...' : 'Loading workspace environment...'}</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    // Force collapse on Apps & Settings screen as requested for "only show icon" look
    const isAppsScreen = pathname === '/dashboard/settings/apps';
    const isMeetingFullscreen = meeting?.isActive && !meeting?.isMinimized;
    const effectiveIsCollapsed = isAppsScreen ? true : isCollapsed;

    console.log('DashboardInner Components:', {
        Sidebar: !!Sidebar,
        Menu: !!Menu,
        GlobalSearch: !!GlobalSearch,
        SystemSetupStatus: !!SystemSetupStatus,
        ToolsDropdown: !!ToolsDropdown,
        HelpIcon: !!HelpIcon,
        Link: !!Link,
        Activity: !!Activity,
        ProfileDropdown: !!ProfileDropdown,
        TrialBanner: !!TrialBanner,
        SubscriptionExpiredWall: !!SubscriptionExpiredWall,
        LogoLoader: !!LogoLoader
    });

    return (
        <div className={clsx("min-h-screen bg-gray-50", isMeetingFullscreen && "overflow-hidden")}>
            {/* Mobile Overlay */}
            {!isMeetingFullscreen && !effectiveIsCollapsed && (
                <div
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-20 lg:hidden"
                    onClick={() => setIsCollapsed(true)}
                />
            )}
            {!isMeetingFullscreen && (
                <Sidebar
                    isCollapsed={effectiveIsCollapsed}
                    setIsCollapsed={setIsCollapsed}
                    isHovered={isHovered}
                    setIsHovered={setIsHovered}
                />
            )}
            <main
                className={clsx(
                    "flex flex-col min-h-screen transition-all duration-300 ease-in-out w-full lg:w-auto",
                    isMeetingFullscreen ? "lg:ml-0" : (effectiveIsCollapsed ? "lg:ml-[80px]" : "lg:ml-[280px]")
                )}
            >
                {/* Top bar */}
                {!isMeetingFullscreen && (
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20 select-none">
                    <div className="flex items-center gap-3 flex-1 lg:flex-none">
                        <button
                            className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="hidden sm:block flex-1 max-w-md">
                            <GlobalSearch />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <SystemSetupStatus />
                        <ToolsDropdown />
                        {pwa.isInstallable && !pwa.isInstalled && (
                            <button
                                onClick={pwa.promptInstall}
                                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-600 bg-transparent text-indigo-600 hover:bg-indigo-50 transition-colors text-sm font-medium"
                                title="Open in app"
                            >
                                <div className="w-5 h-5 flex items-center justify-center text-indigo-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                </div>
                                Open in app
                            </button>
                        )}
                        <HelpIcon slug={getHelpSlug()} className="w-9 h-9" />
                        <Link
                            href="/dashboard/activity"
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            title="Activity Hub"
                        >
                            <Activity className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm font-medium">Activity Hub</span>
                        </Link>
                        <ProfileDropdown />
                    </div>
                </header>
                )}

                {!isMeetingFullscreen && <TrialBanner />}
                {!isMeetingFullscreen && showWall ? (
                    <SubscriptionExpiredWall />
                ) : (
                    <div className={clsx("flex-1 overflow-x-hidden", isMeetingFullscreen ? "p-0" : "py-4 lg:p-6")}>
                        {children}
                    </div>
                )}
            </main>
            <FloatingMeetingPiP />
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <MeetingProvider>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><LogoLoader className="w-8 h-8 animate-spin text-indigo-600" /></div>}>
                <DashboardInner>{children}</DashboardInner>
            </Suspense>
        </MeetingProvider>
    );
}


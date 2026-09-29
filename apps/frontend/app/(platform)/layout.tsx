'use client';

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { ChevronDown, ChevronLeft, ChevronRight, Menu, Star, Clock, LogOut, Wrench, Bot, FileSignature, BarChart3, MessageSquare, FolderOpen, CalendarDays, Video, Sparkles, X, ArrowRight, Activity, Eye, Laptop, Share2 } from 'lucide-react';
import { navigation } from '@/lib/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PinnedItem from '@/app/(platform)/(dashboard)/_components/PinnedItem';
import RecentItem from '@/app/(platform)/(dashboard)/_components/RecentItem';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useSubscription } from '@/lib/useSubscription';
import clsx from 'clsx';
import { LogoLoader, AICreditProgressWidget } from "@workspace/ui";
import dynamic from 'next/dynamic';
import { signOut } from 'next-auth/react';
import { MeetingProvider, useMeeting } from '@/lib/meeting-context';
import FloatingMeetingPiP from '@/components/shared/FloatingMeetingPiP';
import { AICopilotFloatingWidget } from './(workspace-tools-app)/ai/_components/AICopilotFloatingWidget';
import { QuickSupportFloatingWidget } from './_components/QuickSupportFloatingWidget';
import ThemeToggle from '@/components/shared/ThemeToggle';

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
import SystemSetupStatus from '@/app/(platform)/(dashboard)/_components/SystemSetupStatus';
import NotificationsPanel from '@/components/shared/NotificationsPanel';
import TrialBanner from '@/components/shared/TrialBanner';
import SubscriptionExpiredWall from '@/components/shared/SubscriptionExpiredWall';
import UpcomingFeatureWall from '@/components/shared/UpcomingFeatureWall';
import CompanySuspendedWall from '@/components/shared/CompanySuspendedWall';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import UploadQueueManager from '@/components/shared/UploadQueueManager';
import OfflineModuleGate from '@/components/shared/OfflineModuleGate';
import { MODULE_MAP } from '@/lib/module-map';


// navigation moved to ../../lib/navigation.ts



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
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer group"
            >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm overflow-hidden bg-white dark:bg-zinc-950">
                    {(user?.photoUrl || company?.companyLogo || company?.logoUrl) ? (
                        <img src={user?.photoUrl || company?.companyLogo || company?.logoUrl} alt={user?.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <div className="w-full h-full rounded-full bg-indigo-50 text-indigo-600 dark:bg-zinc-900 dark:text-zinc-200 flex items-center justify-center text-sm font-bold">
                            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                        </div>
                    )}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{user?.name?.split(' ')[0] || 'User'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-12 w-48 bg-white dark:bg-zinc-950 rounded-xl shadow-xl shadow-gray-200/50 dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-gray-100 dark:border-zinc-800 py-1.5 z-50 overflow-hidden"
                    >
                        <Link
                            href='/profile/me'
                            onClick={() => setOpen(false)}
                            className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                            Profile Settings
                        </Link>
                        <div className="h-px bg-gray-100 dark:bg-zinc-800 my-1 mx-2" />
                        <button
                            onClick={() => { setOpen(false); logout(); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
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
                    "w-full flex items-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors group border border-transparent",
                    open ? "bg-gray-50 dark:bg-zinc-900 border-gray-200/50 dark:border-zinc-800" : "",
                    isExpanded ? "justify-between" : "justify-center"
                )}
            >
                <div className="flex items-center gap-2.5">
                    <div className={clsx(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                        open ? "bg-indigo-50 text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400" : "bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-zinc-900 dark:text-zinc-500 dark:group-hover:bg-zinc-800 dark:group-hover:text-zinc-300"
                    )}>
                        <Clock className="w-4 h-4" />
                    </div>
                    {isExpanded && (
                        <span className="text-sm font-semibold text-gray-600 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-zinc-100 transition-colors">Recent Items</span>
                    )}
                </div>
                {isExpanded && (
                    <ChevronDown 
                        className={clsx(
                            "w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 transition-transform duration-200 group-hover:text-gray-600 dark:group-hover:text-zinc-300",
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
                            "absolute z-50 w-[260px] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-gray-100 dark:border-zinc-800 overflow-hidden py-2",
                            isExpanded ? "left-0 top-full" : "left-full top-0 ml-4"
                        )}
                    >
                        <div className="px-4 pb-2 mb-2 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
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
    const { company, settings, platform, refreshSettings, isAppDisabledByAdmin } = useSettings();
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
        if (roles.includes('admin') || normalizedRole === 'admin') {
            if (!roles.includes('admin')) roles.push('admin');
        }
        return roles.filter((r): r is string => Boolean(r)).map(r => r.toLowerCase());
    }, [user]);

    const filteredNav = useMemo(() => {
        return navigation.map(item => {
            if ('group' in item) {
                // 1. App Level Toggling with Subscription Limits & Admin Killswitch
                if (item.appId && isAppDisabledByAdmin(item.appId)) {
                    return null;
                }
                const defaultApps = ['projects', 'communications', 'workspace-tools', 'ai'];
                const isDefaultApp = item.appId ? defaultApps.includes(item.appId) : false;
                const hasActivePlan = !isExpired && status !== 'expired' && status !== 'cancelled' && status !== 'No Active Plan';
                
                let isAppEnabled = false;
                if (!item.appId) {
                    isAppEnabled = true; // Settings, Dashboard, etc.
                } else if (hasActivePlan) {
                    // Check against the plan's max apps
                    const maxApps = plan?.maxApps === -1 ? 999 : (plan?.maxApps || 50);
                    const companyEnabledApps = company?.enabledApps || [];
                    const validAppIds = ['projects', 'communications', 'workspace-tools', 'crm', 'hr', 'finance', 'insights', 'advertising', 'social-media', 'traffic-director', 'operations', 'voiceforce', 'media-editor', 'ai'];
                    
                    // Filter out system, settings, and default apps to get only custom installed apps
                    const customApps = companyEnabledApps.filter((a: string) => 
                        a !== 'system' && a !== 'settings' && validAppIds.includes(a) && !defaultApps.includes(a)
                    );
                    const allowedSubset = customApps.slice(0, maxApps);
                    
                    // Default apps are always available and don't count towards the limit
                    if (isDefaultApp) {
                        isAppEnabled = item.appId === 'ai' || companyEnabledApps.includes(item.appId);
                    } else {
                        isAppEnabled = allowedSubset.includes(item.appId) || 
                            (item.appId === 'traffic-director' && (allowedSubset.includes('operations') || companyEnabledApps.includes('traffic-director')));
                    }
                } else {
                    // No active plan: only allow default apps if they are in enabledApps
                    isAppEnabled = isDefaultApp && (item.appId === 'ai' || (company?.enabledApps || []).includes(item.appId));
                }

                // 2. Filter individual modules within the group
                const filteredItems = (item.items || []).filter((subItem: any) => {
                    const hasGranularAccess = subItem.id && user?.permissions?.includes(subItem.id);
                    const roleMatch = userRoles.some(r => subItem.roles?.includes(r as string)) || hasGranularAccess;
                    if (!roleMatch) return false;

                    // Only check module enablement if this group belongs to a configurable app
                    if (item.appId && isAppEnabled && subItem.id && company?.enabledModules) {
                        const isModOn = (item.appId === 'ai') ||
                            (item.appId === 'voiceforce') ||
                            (item.appId === 'media-editor') ||
                            (item.appId === 'social-media') ||
                            (subItem.id === 'orbit-copilot') ||
                            (subItem.id === 'agent-requests') ||
                            (subItem.id === 'company-hub') ||
                            (subItem.id === 'bills-and-expenses' && (company.enabledModules.includes('expenses') || company.enabledModules.includes('bills-and-expenses'))) ||
                            (subItem.id === 'expenses' && (company.enabledModules.includes('bills-and-expenses') || company.enabledModules.includes('expenses'))) ||
                            (subItem.id === 'finance-overview' && (company.enabledModules.includes('finance') || company.enabledModules.includes('finance-overview'))) ||
                            company.enabledModules.includes(subItem.id) ||
                            company.enabledModules.includes(`${item.appId}-${subItem.id}`) ||
                            company.enabledModules.includes(subItem.id.replace(`${item.appId}-`, '')) ||
                            (subItem.id === 'orbit-copilot' && company.enabledModules.includes('ai-assistant'));
                        return isModOn;
                    }
                    return isAppEnabled;
                });

                if (filteredItems.length === 0) return null;
                return { ...item, items: filteredItems };
            } else {
                // Handle single items (Dashboard, CEO Insights, 180 Media Studio)
                if (item.appId && isAppDisabledByAdmin(item.appId)) return null;
                if (userRoles.some(r => item.roles?.includes(r as string))) {
                    if (item.appId && company?.enabledApps && Array.isArray(company.enabledApps) && company.enabledApps.length > 0) {
                        const isAppEnabled =
                            company.enabledApps.includes(item.appId) ||
                            company.enabledApps.includes('media-editor') ||
                            company.enabledApps.includes('video-studio');
                        if (!isAppEnabled) return null;
                    }
                    return item;
                }
                return null;
            }
        }).filter(Boolean) as any[];
    }, [userRoles, company?.enabledApps, company?.enabledModules, isExpired, status, plan, isAppDisabledByAdmin]);

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
                "h-full flex flex-col bg-white/80 dark:bg-black/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-zinc-800/80 overflow-y-auto fixed top-0 left-0 z-30 transition-all duration-300 ease-in-out shadow-sm overflow-x-hidden hidden-scrollbar select-none",
                isExpanded ? "w-[280px] translate-x-0" : "w-[280px] lg:w-[80px] -translate-x-full lg:translate-x-0"
            )}
        >
            {/* Back to 180workspace Button & Sidebar Toggle */}
            <div className="p-3 border-b border-gray-200/50 dark:border-zinc-800/80 flex items-center justify-between gap-2 relative">
                <Link href="/" onClick={handleLinkClick} className={clsx(
                    "flex items-center gap-3 p-2.5 rounded-xl text-sm font-semibold transition-all group flex-1 overflow-hidden",
                    isExpanded
                        ? "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 hover:from-indigo-100 hover:to-violet-100 border border-indigo-100 shadow-sm dark:bg-zinc-900/90 dark:text-zinc-100 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:hover:bg-zinc-800"
                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-zinc-900 dark:text-zinc-100 justify-center"
                )} title="Back to 180workspace">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white dark:bg-zinc-950 text-indigo-600 shadow-sm dark:border dark:border-zinc-800 group-hover:scale-105 transition-transform">
                        <img src="/black%20icon.svg" alt="180workspace" className="w-5 h-5 object-contain dark:invert" />
                    </div>
                    {isExpanded && <span className="font-bold tracking-tight text-lg text-indigo-900 dark:text-zinc-100 whitespace-nowrap"><span className="text-blue-600">180</span>workspace</span>}
                </Link>

                {isExpanded && (
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:block p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-zinc-200 transition-colors flex-shrink-0"
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
                                        isAnyChildActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-50/50 dark:hover:bg-zinc-900/60 hover:backdrop-blur-sm"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                                            isAnyChildActive ? "bg-indigo-50 text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400" : "bg-gray-50 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-600 dark:bg-zinc-900 dark:text-zinc-500 dark:group-hover:bg-zinc-800 dark:group-hover:text-zinc-300"
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
                                                    'flex items-center gap-3 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all relative overflow-hidden group/sub hover:bg-white/50 dark:hover:bg-zinc-900/60',
                                                    isExpanded ? 'ml-12' : 'ml-0 justify-center',
                                                    isActive
                                                        ? 'bg-indigo-50/50 text-indigo-700 dark:bg-zinc-900/90 dark:text-white shadow-sm border border-indigo-100/50 dark:border-zinc-700'
                                                        : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:backdrop-blur-sm'
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
                    const is180View = item.name === '180 View';

                    return (
                        <React.Fragment key={item.name}>
                            {/* Blue highlight divider for 180 View removed */}
                            <Link href={item.href || '#'} prefetch={true} onClick={handleLinkClick}
                                className={clsx(
                                    'flex items-center gap-2.5 p-2.5 rounded-xl text-sm font-semibold transition-all group border',
                                    isActive
                                        ? 'bg-indigo-600/90 backdrop-blur-md text-white shadow-md shadow-indigo-200 border-indigo-500/50 dark:shadow-none dark:border-indigo-500/30'
                                        : is180View
                                            ? 'text-blue-700 bg-blue-50/70 border-blue-200/60 hover:bg-blue-100/80 hover:border-blue-300/70 hover:shadow-sm dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50'
                                            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-50/50 dark:hover:bg-zinc-900/80 hover:backdrop-blur-sm border-transparent hover:border-gray-200/50 dark:hover:border-zinc-800',
                                    !isExpanded && 'justify-center'
                                )}
                                title={!isExpanded ? item.name : undefined}
                            >
                                <div className={clsx(
                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                                    isActive
                                        ? "bg-white/20 text-white"
                                        : is180View
                                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 group-hover:text-blue-700"
                                            : "bg-gray-50 text-gray-400 dark:bg-zinc-900 dark:text-zinc-500 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800 group-hover:text-gray-600 dark:group-hover:text-zinc-300"
                                )}>
                                    {is180View ? (
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
                        </React.Fragment>
                    );
                })}
            </nav>
        </aside>
    );
}

function DashboardInner({ children }: { children: React.ReactNode }) {
    const { user, company, isLoading: authLoading } = useAuth();
    const pwa = usePWAInstall();
    const { isLoading: settingsLoading, isAppDisabledByAdmin } = useSettings();
    const { isExpired, status, mandateStatus, paymentsEnabled, loading: subLoading } = useSubscription();
    const router = useRouter();
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const { meeting } = useMeeting();



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
    const isAdmin = normalizedRole === 'admin' ||
        user?.roles?.some(r => (r?.toLowerCase() || '') === 'admin') ||
        (user?.permissions && user.permissions.includes('can_manage_team'));
    
    const isBillingPath = pathname?.startsWith('/settings/platform-billing') || pathname?.startsWith('/billing') || false;
    
    // Check if the current path is allowed based on filteredNav and defaults
    const isPathAllowed = () => {
        if (!pathname) return true;
        
        // Define default/always allowed paths
        const alwaysAllowed = [
            '/', 
            '/settings', 
            '/profile', 
            '/help-support', 
            '/activity'
        ];
        if (alwaysAllowed.some(p => pathname === p || pathname.startsWith(p + '/'))) return true;

        // Default apps
        const defaultAppPaths = [
            '/projects', '/tasks', '/work-logs', 
            '/chat', '/meeting', '/emails', 
            '/calendar', '/documents', '/assets', '/ai'
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

    const currentAppId = useMemo(() => {
        if (!pathname) return null;
        if (pathname === '/' || pathname.startsWith('/settings') || pathname.startsWith('/profile') || pathname.startsWith('/help-support') || pathname.startsWith('/activity')) {
            return null;
        }
        for (const [route, info] of Object.entries(MODULE_MAP)) {
            if (pathname === route || pathname.startsWith(route + '/')) {
                return info.appId;
            }
        }
        if (pathname.startsWith('/traffic-director')) return 'traffic-director';
        if (pathname.startsWith('/voiceforce')) return 'voiceforce';
        if (pathname.startsWith('/media-editor') || pathname.startsWith('/video-studio')) return 'media-editor';
        if (pathname.startsWith('/advertising')) return 'advertising';
        if (pathname.startsWith('/social-projects') || pathname.startsWith('/content-calendar') || pathname.startsWith('/social-media-assets') || pathname.startsWith('/inbox')) return 'social-media';
        return null;
    }, [pathname]);

    const isCurrentAppDisabled = Boolean(currentAppId && isAppDisabledByAdmin(currentAppId));

    const showWall = !isPathAllowed() && !(isAdmin && isBillingPath);

    useEffect(() => {
        if (!authLoading && !user) {
            // Check if there is an active localToken before signing out prematurely
            const localToken = typeof window !== 'undefined' ? localStorage.getItem('platform_auth_token') : null;
            if (!localToken) {
                // Clear next-auth session to prevent middleware redirect loops
                signOut({ redirect: false }).then(() => {
                    router.push('/login');
                });
            }
            return;
        }

        if (!authLoading && user) {
            // If user is authenticated but has not configured a workspace yet, route to setup
            if (!company && !(user as any).companyId) {
                router.push('/workspace-setup');
                return;
            }

            // Gate 3: Mandate setup required for admins
            if (isAdmin && paymentsEnabled && !subLoading) {
                if (status === 'mandate_pending' && mandateStatus === 'pending' && !isBillingPath) {
                    router.push('/settings/platform-billing');
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
                                    router.push('/projects?new=true&contractId=' + (data.contractId || data.id || ''));
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

    // Check for suspended company account
    if (company && (company.accountStatus === 'suspended' || company.subscriptionStatus === 'suspended')) {
        return <CompanySuspendedWall />;
    }

    // Force collapse on Apps & Settings screen as requested for "only show icon" look
    const isAppsScreen = pathname === '/settings/apps';
    const isMeetingFullscreen = meeting?.isActive && !meeting?.isMinimized;
    const effectiveIsCollapsed = isAppsScreen ? true : isCollapsed;

    console.log('DashboardInner Components:', {
        Sidebar: !!Sidebar,
        Menu: !!Menu,
        GlobalSearch: !!GlobalSearch,
        SystemSetupStatus: !!SystemSetupStatus,
        Link: !!Link,
        Activity: !!Activity,
        ProfileDropdown: !!ProfileDropdown,
        TrialBanner: !!TrialBanner,
        SubscriptionExpiredWall: !!SubscriptionExpiredWall,
        LogoLoader: !!LogoLoader
    });

    return (
        <div className={clsx("min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-zinc-100 transition-colors duration-300", isMeetingFullscreen && "overflow-hidden")}>
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
                <header className="h-16 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20 select-none transition-colors duration-300">
                    <div className="flex items-center gap-3 flex-1 lg:flex-none">
                        <button
                            className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="hidden sm:block flex-1 max-w-md">
                            <GlobalSearch />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <AICreditProgressWidget variant="nav" />
                        <SystemSetupStatus />
                        <ThemeToggle />
                        <Link
                            href='/activity'
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:border dark:border-zinc-800 transition-colors"
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
                ) : isCurrentAppDisabled ? (
                    <div className={clsx("flex-1 overflow-x-hidden", isMeetingFullscreen ? "p-0" : "py-4 lg:p-6")}>
                        <UpcomingFeatureWall appId={currentAppId} />
                    </div>
                ) : (
                    <div className={clsx("flex-1 overflow-x-hidden", isMeetingFullscreen ? "p-0" : "py-4 lg:p-6")}>
                        <OfflineModuleGate>{children}</OfflineModuleGate>
                    </div>
                )}
            </main>
            <FloatingMeetingPiP />
            <AICopilotFloatingWidget />
            <QuickSupportFloatingWidget />
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <MeetingProvider>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><LogoLoader className="w-8 h-8 animate-spin text-indigo-600" /></div>}>
                <DashboardInner>{children}</DashboardInner>
            </Suspense>
            <UploadQueueManager />
        </MeetingProvider>
    );
}


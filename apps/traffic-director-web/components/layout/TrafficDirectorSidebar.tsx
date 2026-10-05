'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Activity, 
  Link as LinkIcon, 
  BarChart3, 
  Layers, 
  Terminal, 
  ShieldCheck, 
  CreditCard, 
  User, 
  Sparkles, 
  ChevronLeft, 
  X, 
  LogOut 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuthToken, clearAuthTokens } from '@/lib/api';

export interface TrafficDirectorSidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  onExpandChange?: (expanded: boolean) => void;
}

interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export function TrafficDirectorSidebar({
  isMobileOpen,
  onMobileClose,
  onExpandChange,
}: TrafficDirectorSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Sidebar collapse & hover states (matching 180workspace and Developers platform behavior)
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [advertisingUrl, setAdvertisingUrl] = useState('http://localhost:3000/advertising');
  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    initial: string;
  }>({
    name: '180 Advertiser',
    email: 'advertiser@180workspace.com',
    initial: 'A',
  });

  // Initialize collapse preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('traffic_director_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      } else {
        setIsCollapsed(true);
      }
    } catch (_) {}

    const isLocal =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1');
    setAdvertisingUrl(
      isLocal
        ? 'http://localhost:3000/advertising'
        : 'https://app.180workspace.com/advertising'
    );

    // Read user profile info
    const token = getAuthToken();
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const json = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(json);

          let cachedUser: any = {};
          try {
            const raw = localStorage.getItem('user');
            if (raw) cachedUser = JSON.parse(raw);
          } catch (_) {}

          const name =
            payload.name ||
            cachedUser.name ||
            payload.email?.split('@')[0] ||
            '180 Advertiser';
          const email =
            payload.email ||
            cachedUser.email ||
            'advertiser@180workspace.com';
          const initial = (name[0] || email[0] || 'A').toUpperCase();

          setUserProfile({ name, email, initial });
        }
      } catch (_) {}
    }
  }, []);

  const isExpanded = !isCollapsed || isHovered;

  // Notify parent container of expansion change to synchronize viewport margin
  useEffect(() => {
    onExpandChange?.(isExpanded);
  }, [isExpanded, onExpandChange]);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('traffic_director_sidebar_collapsed', String(next));
    } catch (_) {}
  };

  const handleSignOut = () => {
    clearAuthTokens();
    toast.success('Logged out successfully');
    window.location.href = '/';
  };

  const navItems: NavItem[] = [
    { id: 'overview', name: 'Overview', href: '/traffic-director', icon: Activity },
    { id: 'links', name: 'Smart Links', href: '/traffic-director/links', icon: LinkIcon },
    { id: 'analytics', name: 'Analytics', href: '/traffic-director/analytics', icon: BarChart3 },
    { id: 'logs', name: 'Traffic Logs', href: '/traffic-director/logs', icon: Layers },
    { id: 'simulator', name: 'Edge Simulator', href: '/traffic-director/simulator', icon: Terminal },
    { id: 'threats', name: 'Threat Intelligence', href: '/traffic-director/threats', icon: ShieldCheck },
    { id: 'subscription', name: 'Subscriptions', href: '/traffic-director/subscription', icon: CreditCard },
    { id: 'profile', name: 'Profile', href: '/traffic-director/profile', icon: User },
  ];

  const sidebarContent = (
    <div
      className={`flex flex-col h-full bg-white/95 dark:bg-[#101012] backdrop-blur-xl border-r border-zinc-200/80 dark:border-white/10 select-none overflow-x-hidden ${
        isExpanded ? 'w-[280px]' : 'w-[80px]'
      }`}
    >
      {/* 1. Header with Official 180 Logo & Expand/Collapse Toggle */}
      <div className="px-3 py-3 border-b border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-1.5 shrink-0 min-h-[64px]">
        {isExpanded ? (
          <>
            <Link
              href="/traffic-director"
              onClick={onMobileClose}
              className="flex items-center gap-2.5 p-1 rounded-xl group transition-all min-h-[44px] min-w-0"
            >
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <img
                  src="/black-icon.svg"
                  alt="180 Traffic Director"
                  className="w-5 h-5 object-contain dark:invert"
                />
              </div>
              <div className="min-w-0 flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-zinc-950 dark:text-white whitespace-nowrap block">
                    <span className="text-blue-600 dark:text-blue-500">180</span> Traffic Director
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50 shrink-0">
                    EDGE
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium tracking-wide flex items-center gap-1 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Sovereign Edge Network
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
              title={isCollapsed ? 'Pin Sidebar Expanded' : 'Collapse Sidebar'}
              aria-label="Toggle Sidebar Collapse"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <Link
            href="/traffic-director"
            onClick={onMobileClose}
            className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center mx-auto hover:scale-105 transition-all shadow-xs"
            title="180 Traffic Director"
          >
            <img
              src="/black-icon.svg"
              alt="180 Traffic Director"
              className="w-5 h-5 object-contain dark:invert"
            />
          </Link>
        )}

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onMobileClose}
          className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          title="Close Navigation"
          aria-label="Close Navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-4 text-xs hidden-scrollbar">
        {/* Navigation Section */}
        <div className="space-y-1">
          {isExpanded ? (
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
              Navigation
            </p>
          ) : (
            <div className="h-px bg-zinc-200/60 dark:bg-white/5 mx-2 my-1" />
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/traffic-director'
                ? pathname === '/traffic-director'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`flex items-center gap-3 rounded-xl font-semibold transition-all duration-200 min-h-[42px] group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-900 border border-transparent'
                } ${isExpanded ? 'px-3 py-2' : 'justify-center p-2'}`}
                title={!isExpanded ? item.name : undefined}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {isExpanded && <span className="text-xs font-semibold whitespace-nowrap">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        {/* AI Tools Section */}
        <div className="space-y-1 pt-2">
          {isExpanded ? (
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
              AI Tools
            </p>
          ) : (
            <div className="h-px bg-zinc-200/60 dark:bg-white/5 mx-2 my-2" />
          )}

          <a
            href={advertisingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onMobileClose}
            className={`flex items-center rounded-xl font-semibold transition-all duration-200 min-h-[42px] text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 border border-transparent hover:border-indigo-200/50 dark:hover:border-indigo-800/40 group ${
              isExpanded ? 'justify-between px-3 py-2' : 'justify-center p-2'
            }`}
            title="Generate AI White Page with 180 Visual Website & Landing Page Builder"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              {isExpanded && <span className="text-xs font-semibold whitespace-nowrap">AI White Pages</span>}
            </div>

            {isExpanded && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
                Builder ↗
              </span>
            )}
          </a>
        </div>
      </nav>

      {/* 3. Account / Profile Widget */}
      <div className="p-3 border-t border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-950/50 shrink-0">
        {isExpanded ? (
          <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-white/10 shadow-xs">
            <Link
              href="/traffic-director/profile"
              onClick={onMobileClose}
              className="flex items-center gap-2.5 min-w-0 flex-1 group"
              title="View Profile"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border border-zinc-700/50 dark:border-white/20 group-hover:scale-105 transition-transform">
                {userProfile.initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-zinc-950 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {userProfile.name}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate font-mono">
                  {userProfile.email}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-xl text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/traffic-director/profile"
            onClick={onMobileClose}
            title={`Profile: ${userProfile.name}`}
            className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs mx-auto shadow-xs border border-zinc-700/50 dark:border-white/20 hover:scale-105 transition-all cursor-pointer"
          >
            {userProfile.initial}
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar with Hover Expand (matching 180workspace and Developers platform) */}
      <aside
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 shadow-sm transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'w-[280px] shadow-2xl shadow-black/10 dark:shadow-black/60'
            : 'w-[80px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300"
          onClick={onMobileClose}
        >
          <div
            className="w-72 max-w-[85vw] h-full shadow-2xl transition-transform duration-300 animate-in slide-in-from-left"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

export default TrafficDirectorSidebar;

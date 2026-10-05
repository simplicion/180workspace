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
  User, 
  Plus, 
  Sun, 
  Moon, 
  ShieldCheck, 
  ChevronRight, 
  CreditCard,
  Menu
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuthToken, clearAuthTokens } from '@/lib/api';
import { TrialBanner } from '@/components/shared/TrialBanner';
import { TrafficDirectorSidebar } from '@/components/layout/TrafficDirectorSidebar';

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDark, setIsDark] = useState<boolean>(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  useEffect(() => {
    // Read theme
    const storedTheme = localStorage.getItem('180_theme');
    const isDarkMode = storedTheme ? storedTheme === 'dark' : document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);

    const token = getAuthToken();
    if (!token) {
      router.replace('/');
      return;
    }

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
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          clearAuthTokens();
          toast.error('Your session has expired. Please sign in again.');
          router.replace('/');
          return;
        }
      }
    } catch (_) {}
  }, [router]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('180_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('180_theme', 'light');
    }
  };

  const navItems = [
    { name: 'Overview', href: '/traffic-director', icon: Activity },
    { name: 'Smart Links', href: '/traffic-director/links', icon: LinkIcon },
    { name: 'Analytics', href: '/traffic-director/analytics', icon: BarChart3 },
    { name: 'Traffic Logs', href: '/traffic-director/logs', icon: Layers },
    { name: 'Edge Simulator', href: '/traffic-director/simulator', icon: Terminal },
    { name: 'Threat Intelligence', href: '/traffic-director/threats', icon: ShieldCheck },
    { name: 'Subscriptions', href: '/traffic-director/subscription', icon: CreditCard },
    { name: 'Profile', href: '/traffic-director/profile', icon: User },
  ];

  const currentNav = navItems.find((n) => 
    n.href === '/traffic-director' ? pathname === '/traffic-director' : pathname.startsWith(n.href)
  ) || { name: 'Dashboard' };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-black text-gray-900 dark:text-zinc-100 transition-colors duration-200">
      {/* 180 Workspace & Developers Platform Standard Sidebar with Hover Expand/Collapse */}
      <TrafficDirectorSidebar
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
        onExpandChange={setIsSidebarExpanded}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 ${
          isSidebarExpanded
            ? 'lg:ml-[280px] lg:w-[calc(100%-280px)]'
            : 'lg:ml-[80px] lg:w-[calc(100%-80px)]'
        } flex flex-col min-w-0 min-h-screen overflow-y-auto transition-all duration-300 ease-in-out`}
      >
        {/* Top Header conforming to 180 Workspace design */}
        <header className="h-16 border-b border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">180 Traffic Director</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
            <span className="text-xs font-bold text-gray-900 dark:text-white">{currentNav.name}</span>
            <div className="hidden sm:flex items-center gap-1.5 ml-4 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Anycast Live</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Dark / Light Mode Switcher in Header */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 transition-all shadow-sm cursor-pointer"
              title={isDark ? "Switch to Clean Light Mode" : "Switch to Obsidian Dark Mode"}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-zinc-400" />}
            </button>

            <Link
              href="/traffic-director/subscription"
              className="hidden sm:inline-flex items-center space-x-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-gray-200 dark:border-white/10 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-300 transition-all cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5 text-blue-500" />
              <span>Plans & Billing</span>
            </Link>

            <Link
              href="/traffic-director/links"
              className="inline-flex items-center space-x-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Smart Link</span>
            </Link>
          </div>
        </header>

        {/* Global Trial & Subscription Status Banner */}
        <TrialBanner />

        {/* Page Body */}
        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  GitFork, Link as LinkIcon, Activity, BarChart3, 
  Layers, Terminal, User, Plus, Sun, Moon,
  ExternalLink, ShieldCheck, ChevronRight, Sparkles, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuthToken } from '@/lib/api';
import { TrialBanner } from '@/components/shared/TrialBanner';

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDark, setIsDark] = useState<boolean>(true);
  const [advertisingUrl, setAdvertisingUrl] = useState<string>('http://localhost:3000/advertising');

  useEffect(() => {
    // Read theme
    const storedTheme = localStorage.getItem('180_theme');
    const isDarkMode = storedTheme ? storedTheme === 'dark' : document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);

    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    setAdvertisingUrl(isLocal ? 'http://localhost:3000/advertising' : 'https://app.180workspace.com/advertising');

    const token = getAuthToken();
    if (!token) {
      router.replace('/');
      return;
    }

    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('platform_auth_token');
          document.cookie = 'platform_auth_token=; path=/; max-age=0;';
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
      {/* 180 Workspace Standard Sidebar */}
      <aside className="w-64 border-r border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Logo & 180 Workspace Branding */}
          <div className="p-5 border-b border-gray-200/60 dark:border-white/10">
            <Link href="/traffic-director" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white dark:bg-zinc-900 shadow-sm border border-gray-200/70 dark:border-white/10 group-hover:scale-105 transition-transform">
                <img src="/black-icon.svg" alt="180workspace" className="w-5 h-5 object-contain dark:hidden" />
                <img src="/white-icon.svg" alt="180workspace" className="w-5 h-5 object-contain hidden dark:block" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold tracking-tight text-sm text-gray-900 dark:text-white whitespace-nowrap">
                    <span className="text-blue-600">180</span> Traffic Director
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                    EDGE
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">Sovereign Edge Network</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Navigation
            </div>
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
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <div className="pt-3 px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              AI Tools
            </div>
            <a
              href={advertisingUrl}
              suppressHydrationWarning
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 transition-all border border-transparent hover:border-indigo-200/50 dark:hover:border-indigo-800/40 group"
              title="Generate AI White Page with 180 Visual Website & Landing Page Builder"
            >
              <div className="flex items-center space-x-3">
                <Sparkles className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                <span>AI White Pages</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                Builder ↗
              </span>
            </a>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header conforming to 180 Workspace design */}
        <header className="h-16 border-b border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
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


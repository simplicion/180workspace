'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  PhoneCall, 
  Menu, 
  Sun, 
  Moon, 
  ExternalLink,
  Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuthToken, clearAuthTokens, api } from '@/lib/api';
import { AuthProvider } from '@/lib/auth-context';
import { VoiceforceSidebar } from '@/components/layout/VoiceforceSidebar';

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

  const navNames: Record<string, string> = {
    '/voiceforce': 'Central Operations Radar',
    '/voiceforce/agents': 'AI Voice Employees',
    '/voiceforce/numbers': 'Phone Numbers & DIDs',
    '/voiceforce/forwarding': 'Call Forwarding & Queues',
    '/voiceforce/campaigns': 'High-Throughput Campaigns',
    '/voiceforce/calls': 'Call Logs & Transcripts',
    '/voiceforce/templates': 'Prompt Templates',
    '/voiceforce/test-bench': 'WebRTC Test Bench',
    '/voiceforce/wallet': 'Prepaid Telephony Wallet & Invoicing',
  };

  const currentTitle = navNames[pathname] || 'Voiceforce Platform';

  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-slate-50 dark:bg-black text-gray-900 dark:text-zinc-100 transition-colors duration-200">
        {/* 1. Standalone Sidebar */}
        <VoiceforceSidebar
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
          onExpandChange={(expanded) => setIsSidebarExpanded(expanded)}
        />

        {/* 2. Main Viewport Container */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
            isSidebarExpanded ? 'lg:pl-[280px]' : 'lg:pl-[80px]'
          }`}
        >
          {/* Top Header */}
          <header className="sticky top-0 z-30 h-16 border-b border-zinc-200/80 dark:border-white/10 bg-white/80 dark:bg-[#090a0f]/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate">
                {currentTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/voiceforce/wallet"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 text-xs font-bold hover:bg-cyan-500/20 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Telephony Wallet</span>
              </Link>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Toggle Theme"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
              </button>
            </div>
          </header>

          {/* Platform Content Body */}
          <main className="flex-1 w-full min-w-0 pb-12">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}

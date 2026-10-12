'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  PhoneCall, 
  Bot, 
  Smartphone, 
  PhoneForwarded, 
  Megaphone, 
  FileText, 
  Mic, 
  Headphones, 
  Wallet, 
  CreditCard, 
  User, 
  Sparkles, 
  ChevronLeft, 
  X, 
  LogOut,
  ExternalLink,
  Lock,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuthToken, clearAuthTokens, api } from '@/lib/api';

export interface VoiceforceSidebarProps {
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

export function VoiceforceSidebar({
  isMobileOpen,
  onMobileClose,
  onExpandChange,
}: VoiceforceSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState<string>('₹');
  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    initial: string;
  }>({
    name: 'Voiceforce Admin',
    email: 'admin@180workspace.com',
    initial: 'V',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('voiceforce_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      } else {
        setIsCollapsed(true);
      }
    } catch (_) {}

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
            'Voiceforce Admin';
          const email =
            payload.email ||
            cachedUser.email ||
            'admin@180workspace.com';
          const initial = (name[0] || email[0] || 'V').toUpperCase();

          setUserProfile({ name, email, initial });
        }
      } catch (_) {}
    }

    // Fetch quick wallet balance
    const fetchBalance = async () => {
      try {
        const res = await api.get('/api/v1/wallet');
        if (res.data?.data) {
          setWalletBalance(res.data.data.balanceInr ?? 0);
          if (res.data.data.currencySymbol) {
            setCurrencySymbol(res.data.data.currencySymbol);
          }
        }
      } catch (_) {}
    };

    fetchBalance();
  }, []);

  const isExpanded = !isCollapsed || isHovered;

  useEffect(() => {
    onExpandChange?.(isExpanded);
  }, [isExpanded, onExpandChange]);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('voiceforce_sidebar_collapsed', String(next));
    } catch (_) {}
  };

  const handleSignOut = () => {
    clearAuthTokens();
    toast.success('Logged out successfully');
    window.location.href = '/';
  };

  const navItems: NavItem[] = [
    { id: 'overview', name: 'Overview Radar', href: '/voiceforce', icon: PhoneCall },
    { id: 'agents', name: 'AI Voice Employees', href: '/voiceforce/agents', icon: Bot },
    { id: 'numbers', name: 'Phone Numbers & DIDs', href: '/voiceforce/numbers', icon: Smartphone },
    { id: 'forwarding', name: 'Forwarding & Queues', href: '/voiceforce/forwarding', icon: PhoneForwarded },
    { id: 'campaigns', name: 'Call Campaigns', href: '/voiceforce/campaigns', icon: Megaphone },
    { id: 'calls', name: 'Call Logs & Transcripts', href: '/voiceforce/calls', icon: Headphones },
    { id: 'templates', name: 'Prompt Templates', href: '/voiceforce/templates', icon: FileText },
    { id: 'test-bench', name: 'WebRTC Test Bench', href: '/voiceforce/test-bench', icon: Mic },
    { id: 'wallet', name: 'Prepaid Wallet & Invoices', href: '/voiceforce/wallet', icon: Wallet },
  ];

  const sidebarContent = (
    <div
      className={`flex flex-col h-full bg-white/95 dark:bg-[#0c0d12] backdrop-blur-xl border-r border-zinc-200/80 dark:border-white/10 select-none overflow-x-hidden ${
        isExpanded ? 'w-[280px]' : 'w-[80px]'
      }`}
    >
      {/* 1. Header with Logo & Collapse Toggle */}
      <div className="px-3 py-3 border-b border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-1.5 shrink-0 min-h-[64px]">
        {isExpanded ? (
          <>
            <Link
              href="/voiceforce"
              onClick={onMobileClose}
              className="flex items-center gap-2.5 p-1 rounded-xl group transition-all min-h-[44px] min-w-0"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-xs text-white group-hover:scale-105 transition-transform">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-zinc-950 dark:text-white whitespace-nowrap block">
                    <span className="text-cyan-600 dark:text-cyan-400">180</span> Voiceforce
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-800/50 shrink-0">
                    VOICE
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium tracking-wide flex items-center gap-1 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Telephony Engine Active
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
            href="/voiceforce"
            onClick={onMobileClose}
            className="w-full flex items-center justify-center py-1 rounded-xl"
            title="180 Voiceforce"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <PhoneCall className="w-4 h-4" />
            </div>
          </Link>
        )}
      </div>

      {/* 2. Navigation Items */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/voiceforce'
              ? pathname === '/voiceforce'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onMobileClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-bold border border-cyan-500/20 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title={!isExpanded ? item.name : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'
                }`}
              />
              {isExpanded && <span className="truncate">{item.name}</span>}
              {isExpanded && item.id === 'wallet' && walletBalance !== null && (
                <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                  {currencySymbol}{walletBalance.toFixed(0)}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* 3. Quick Prepaid Wallet Footer Pill */}
      {isExpanded && (
        <div className="px-3 pb-3">
          <Link
            href="/voiceforce/wallet"
            onClick={onMobileClose}
            className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent border border-cyan-500/20 hover:border-cyan-500/40 transition-all block group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3 h-3 text-cyan-500" />
                Prepaid Telephony
              </span>
              <span className="text-[9px] font-extrabold text-cyan-600 dark:text-cyan-400 group-hover:underline">
                Recharge &rarr;
              </span>
            </div>
            <div className="text-base font-black text-zinc-900 dark:text-white">
              {walletBalance !== null ? `${currencySymbol}${walletBalance.toFixed(2)}` : 'Loading...'}
            </div>
          </Link>
        </div>
      )}

      {/* 4. User Profile & Sign Out Footer */}
      <div className="p-3 border-t border-zinc-200/80 dark:border-white/10 shrink-0">
        {isExpanded ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {userProfile.initial}
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {userProfile.name}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  {userProfile.email}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="hidden lg:block fixed top-0 bottom-0 left-0 z-40 transition-all duration-300 ease-in-out"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onMobileClose}
          />
          <div className="relative flex-1 flex flex-col max-w-[280px] w-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

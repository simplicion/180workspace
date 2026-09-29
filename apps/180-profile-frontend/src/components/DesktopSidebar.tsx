'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Grid,
  Receipt,
  AppWindow,
  User,
  Wallet,
  ShieldCheck,
  CreditCard,
  ExternalLink,
  LogOut,
  ChevronRight,
  Plus,
  Sparkles,
  Code2,
} from 'lucide-react';
import { AILogoIcon } from '@workspace/ui';
import toast from 'react-hot-toast';
import { UserProfile } from '../types';

interface DesktopSidebarProps {
  user: UserProfile | null;
  balance: number | null;
}

export function DesktopSidebar({ user, balance }: DesktopSidebarProps) {
  const pathname = usePathname();

  const handleSignOut = () => {
    localStorage.removeItem('platform_auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    toast.success('Signed out of 180 Profile');
    window.location.href = '/';
  };

  const navItems = [
    { label: 'Overview', href: '/', icon: Grid, description: 'Profile & Passport' },
    {
      label: 'Wallet & Balance',
      href: '/wallet',
      icon: Wallet,
      description: 'Prepaid Sovereign Ledger',
      badge: balance !== null ? `₹${balance.toFixed(2)}` : '₹0.00',
    },
    { label: 'Transactions', href: '/transactions', icon: Receipt, description: 'History & Invoices' },
    { label: 'Connected Apps', href: '/connected-apps', icon: AppWindow, description: 'OAuth 2.0 Clients' },
    { label: 'Profile & Security', href: '/profile', icon: User, description: 'Identity & Keys' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r border-slate-200/80 bg-white/95 backdrop-blur-xl h-screen sticky top-0 z-30 select-none">
      {/* 1. Brand Header */}
      <div className="p-5 border-b border-slate-200/70 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group min-h-[44px]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[1.5px] shadow-sm shrink-0 overflow-hidden">
            <div className="w-full h-full bg-white rounded-xl flex items-center justify-center p-1.5 overflow-hidden">
              <AILogoIcon className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform duration-300 shrink-0" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
              180 Profile
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                Universal
              </span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Sovereign Identity Protocol</span>
          </div>
        </Link>
      </div>

      {/* 2. User Passport Mini Card */}
      {user && (
        <div className="p-4 mx-3 mt-3 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/70 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[1.5px] shadow-xs shrink-0 overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name || 'User'} className="w-full h-full rounded-2xl object-cover bg-white" />
              ) : (
                <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center text-blue-700 font-extrabold text-sm">
                  {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs text-slate-900 truncate">{user.name || 'Sovereign User'}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 font-mono truncate">
                @{user.username || (user.email ? user.email.split('@')[0] : 'user')}
              </p>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/80">
              Verified Sovereign ID
            </span>
            <span className="text-slate-500 font-mono text-[10px]">OAuth 2.0</span>
          </div>
        </div>
      )}

      {/* 3. Main Navigation Items */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Platform Menu
        </div>
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href ||
                (item.href === '/transactions' && pathname === '/wallet') ||
                (item.href === '/wallet' && pathname === '/wallet') ||
                (item.href === '/profile' && pathname === '/settings');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="leading-tight">{item.label}</div>
                </div>
              </div>

              {item.badge ? (
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200/70'
                  }`}
                >
                  {item.badge}
                </span>
              ) : (
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${
                    isActive ? 'text-white/70' : 'text-slate-400'
                  }`}
                />
              )}
            </Link>
          );
        })}

        {/* 4. Quick Balance & Top-Up Card */}
        <div className="pt-4 px-1">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-blue-400" />
                <span>Prepaid Balance</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                1-Click Ready
              </span>
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-white">
                ₹{balance !== null ? balance.toFixed(2) : '0.00'}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Sovereign wallet shared across 180 ecosystem</p>
            </div>
            <Link
              href="/wallet"
              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Top Up Balance</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Footer & Sign Out */}
      <div className="p-3 border-t border-slate-200/70 space-y-1">
        <a
          href="https://developers.180workspace.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-purple-600" />
            <span>Developer API Portal</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>

        {user && (
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}

export default DesktopSidebar;

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Grid,
  Receipt,
  AppWindow,
  User,
  CreditCard,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { AILogoIcon, HelpIcon } from '@workspace/ui';
import { UserProfile } from '../types';

interface HeaderProps {
  balance: number | null;
  user: UserProfile | null;
}

export function Header({ balance, user }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { label: 'Overview', href: '/', icon: Grid },
    { label: 'Transactions', href: '/transactions', icon: Receipt },
    { label: 'Connected Apps', href: '/connected-apps', icon: AppWindow },
    { label: 'Profile & Security', href: '/profile', icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-6 lg:gap-8">
          {/* Logo & Platform Name */}
          <Link href="/" className="flex items-center gap-3 group min-h-[44px] shrink-0">
            <div className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-[1px] shadow-xs shrink-0 overflow-hidden">
              <div className="w-full h-full bg-white rounded-xl flex items-center justify-center p-1.5 overflow-hidden">
                <AILogoIcon className="w-5 h-5 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] text-purple-600 group-hover:scale-110 transition-transform duration-300 shrink-0" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                180 Profile
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-md">
                  Universal
                </span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Identity & Sovereign Wallet</span>
            </div>
          </Link>

          {/* Desktop 4 Main Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            {navItems.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href ||
                    (item.href === '/transactions' && pathname === '/wallet') ||
                    (item.href === '/profile' && pathname === '/settings');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Balance Pill */}
          <Link
            href="/transactions"
            className="flex items-center gap-2 px-3.5 py-1.5 min-h-[38px] rounded-xl bg-white border border-slate-200 shadow-xs hover:border-purple-300 hover:bg-purple-50/40 transition-all text-xs group cursor-pointer"
            title="View Transactions & Recharge"
          >
            <div className="w-5 h-5 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="w-3 h-3" />
            </div>
            <span className="text-slate-500 hidden sm:inline font-medium">Balance:</span>
            <span className="font-bold text-slate-900">
              ₹{balance !== null ? balance.toFixed(2) : '1,000.00'}
            </span>
            <span className="text-purple-600 text-xs font-bold group-hover:translate-x-0.5 transition-transform hidden sm:inline">
              +
            </span>
          </Link>

          {/* Centralized Help Icon */}
          <HelpIcon slug="180-profile" helpText="180 Profile Docs & Security" className="hidden sm:flex min-h-[38px] min-w-[38px]" />

          {/* Developer Portal Link */}
          <a
            href="https://developers.180workspace.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] text-xs font-semibold text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-all border border-transparent hover:border-purple-200"
          >
            <span>Developer Portal</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>

          {/* User Avatar */}
          <Link
            href="/profile"
            className="w-9 h-9 min-h-[36px] rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 p-[1.5px] shadow-sm hover:ring-2 hover:ring-purple-300 transition-all cursor-pointer shrink-0"
            title="Sovereign Profile & Security"
          >
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-slate-900 font-bold text-xs hover:bg-purple-50">
              {user?.name ? user.name.slice(0, 1).toUpperCase() : 'S'}
            </div>
          </Link>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-200">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href ||
                  (item.href === '/transactions' && pathname === '/wallet') ||
                  (item.href === '/profile' && pathname === '/settings');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4 text-purple-600" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-200">
            <a
              href="https://developers.180workspace.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-colors"
            >
              <span>Developer Portal</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

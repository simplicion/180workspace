'use strict';
'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { AILogoIcon, HelpIcon } from '@workspace/ui';
import toast from 'react-hot-toast';
import { UserProfile } from '../types';

interface HeaderProps {
  balance: number | null;
  user: UserProfile | null;
}

export function Header({ balance, user }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown and drawer on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  const handleSignOut = () => {
    localStorage.removeItem('platform_auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    toast.success('Signed out of 180 Profile');
    setDropdownOpen(false);
    window.location.href = '/';
  };

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
            <div className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[1px] shadow-xs shrink-0 overflow-hidden">
              <div className="w-full h-full bg-white rounded-xl flex items-center justify-center p-1.5 overflow-hidden">
                <AILogoIcon className="w-5 h-5 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] text-blue-600 group-hover:scale-110 transition-transform duration-300 shrink-0" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                180 Profile
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                  Universal
                </span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Identity & Sovereign Wallet</span>
            </div>
          </Link>

          {/* Desktop 4 Main Navigation Tabs: ONLY VISIBLE WHEN LOGGED IN */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 animate-in fade-in duration-200">
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
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* Quick Balance Pill */}
              <Link
                href="/transactions"
                className="flex items-center gap-2 px-3.5 py-1.5 min-h-[38px] rounded-xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 hover:bg-blue-50/40 transition-all text-xs group cursor-pointer"
                title="View Transactions & Wallet"
              >
                <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CreditCard className="w-3 h-3" />
                </div>
                <span className="text-slate-500 hidden sm:inline font-medium">Balance:</span>
                <span className="font-bold text-slate-900">
                  ₹{balance !== null ? balance.toFixed(2) : '0.00'}
                </span>
                <span className="text-blue-600 text-xs font-bold group-hover:translate-x-0.5 transition-transform hidden sm:inline">
                  +
                </span>
              </Link>

              {/* Centralized Help Icon */}
              <HelpIcon slug="180-profile" helpText="180 Profile Docs & Security" className="hidden sm:flex min-h-[38px] min-w-[38px]" />

              {/* User Avatar with Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-blue-400/50 transition-all cursor-pointer focus:outline-none"
                  aria-expanded={dropdownOpen}
                  aria-label="User Profile Menu"
                  title="Account & Settings"
                >
                  <div className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-[1.5px] shadow-sm overflow-hidden shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name || 'User'}
                        className="w-full h-full rounded-full object-cover bg-white"
                      />
                    ) : (
                      <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-blue-700 font-bold text-xs hover:bg-blue-50">
                        {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 hidden sm:block ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-slate-200/90 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* User Header */}
                    <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-100 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-[1.5px] shadow-xs shrink-0 overflow-hidden">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name || 'User'}
                            className="w-full h-full rounded-full object-cover bg-white"
                          />
                        ) : (
                          <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                            {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {user.name || 'Sovereign User'}
                          </span>
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {user.email || (user.username ? `@${user.username}` : user.phone || '180 Identity')}
                        </p>
                      </div>
                    </div>

                    {/* Balance Preview Badge */}
                    <div className="mx-1 my-2 px-3 py-2 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center">
                          <CreditCard className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-slate-600">Prepaid Wallet</span>
                      </div>
                      <span className="text-xs font-bold text-blue-950">
                        ₹{balance !== null ? balance.toFixed(2) : '0.00'}
                      </span>
                    </div>

                    <div className="h-px bg-slate-100 my-1" />

                    {/* Navigation Items */}
                    <div className="space-y-0.5">
                      <Link
                        href="/"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/60 transition-colors"
                      >
                        <Grid className="w-4 h-4 text-blue-600" />
                        <div className="flex flex-col">
                          <span>Dashboard Overview</span>
                          <span className="text-[10px] font-normal text-slate-400">View activity & quick actions</span>
                        </div>
                      </Link>

                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/60 transition-colors"
                      >
                        <User className="w-4 h-4 text-blue-600" />
                        <div className="flex flex-col">
                          <span>Profile & Security</span>
                          <span className="text-[10px] font-normal text-slate-400">Manage identity, QR & contact info</span>
                        </div>
                      </Link>

                      <Link
                        href="/transactions"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/60 transition-colors"
                      >
                        <Receipt className="w-4 h-4 text-blue-600" />
                        <div className="flex flex-col">
                          <span>Transactions & Wallet</span>
                          <span className="text-[10px] font-normal text-slate-400">Recharge & ledger records</span>
                        </div>
                      </Link>

                      <Link
                        href="/connected-apps"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/60 transition-colors"
                      >
                        <AppWindow className="w-4 h-4 text-blue-600" />
                        <div className="flex flex-col">
                          <span>Connected Apps</span>
                          <span className="text-[10px] font-normal text-slate-400">OAuth permissions & sessions</span>
                        </div>
                      </Link>
                    </div>

                    <div className="h-px bg-slate-100 my-1.5" />

                    {/* Developer Portal External Link */}
                    <a
                      href="https://developers.180workspace.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-blue-700 hover:bg-blue-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Developer Platform</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>

                    <div className="h-px bg-slate-100 my-1" />

                    {/* Sign Out Button */}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <div className="flex flex-col">
                        <span>Sign Out</span>
                        <span className="text-[10px] font-normal text-slate-400">End sovereign session</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-4 py-2 min-h-[38px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
              >
                Sign In with 180
              </Link>
            </div>
          )}

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
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          {user ? (
            <>
              {/* User Mini Card */}
              <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-[1.5px] overflow-hidden shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover bg-white" />
                    ) : (
                      <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                        {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900">{user.name || 'User'}</div>
                    <div className="text-[11px] text-slate-500">{user.email || user.phone || 'Sovereign Account'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-medium">Balance</div>
                  <div className="font-bold text-xs text-blue-950">₹{balance !== null ? balance.toFixed(2) : '0.00'}</div>
                </div>
              </div>

              {/* Nav Items */}
              <div className="space-y-1">
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
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-blue-600" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Sign Out */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                href="/auth/login"
                className="w-full flex items-center justify-center py-3 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20"
              >
                Sign In with 180
              </Link>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <a
              href="https://developers.180workspace.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <span>Developer Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Terminal,
  Code2,
  ExternalLink,
  Menu,
  X,
  ArrowUpRight,
  Shield,
  CreditCard,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AILogoIcon, HelpIcon } from '@workspace/ui';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsDropdownOpen, setProductsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProductsDropdownOpen(false);
  }, [pathname]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProductsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isProductsActive =
    pathname.startsWith('/products') ||
    pathname === '/identity' ||
    pathname === '/pay';

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 dark:border-white/10 bg-white/90 dark:bg-black/85 backdrop-blur-xl transition-colors duration-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-4 lg:gap-6 shrink-0">
          <Link href="/" className="flex items-center gap-3 group min-h-[44px] shrink-0">
            <div className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-[1px] shadow-xs group-hover:scale-105 transition-all duration-300 shrink-0">
              <div className="w-full h-full bg-white dark:bg-[#101012] rounded-xl flex items-center justify-center p-1.5">
                <AILogoIcon className="w-5 h-5 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300 shrink-0" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-zinc-950 dark:text-white flex items-center">
                180<span className="text-purple-600 dark:text-purple-400 font-semibold ml-0.5">Developers</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 rounded-full tracking-wider uppercase">
                v1.0
              </span>
            </div>
          </Link>

          {/* Desktop Segmented Navigation Bar */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-100/90 dark:bg-zinc-900/90 p-1 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-xs">
            {/* 1. Applications Link */}
            <Link
              href="/"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 min-h-[34px] cursor-pointer ${
                pathname === '/'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs border border-zinc-200/60 dark:border-white/10 font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              <Terminal className={`w-3.5 h-3.5 ${pathname === '/' ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-500 dark:text-zinc-400'}`} />
              <span>Applications</span>
            </Link>

            {/* 2. Products Dropdown Trigger */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProductsDropdownOpen(!productsDropdownOpen)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 min-h-[34px] cursor-pointer ${
                  isProductsActive || productsDropdownOpen
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs border border-zinc-200/60 dark:border-white/10 font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                <Layers className={`w-3.5 h-3.5 ${isProductsActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'}`} />
                <span>Products</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${productsDropdownOpen ? 'rotate-180 text-zinc-950 dark:text-white' : 'opacity-60'}`} />
              </button>

              {/* Products Floating Menu Dropdown */}
              {productsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 shadow-2xl p-2 space-y-1 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                  <Link
                    href="/products/identity"
                    onClick={() => setProductsDropdownOpen(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-zinc-950 dark:text-white flex items-center gap-1.5">
                        <span>180 Identity</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                          Auth
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        Universal SSO, WhatsApp OTP & asymmetric RS256 JWKS tokens.
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/products/pay"
                    onClick={() => setProductsDropdownOpen(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-zinc-950 dark:text-white flex items-center gap-1.5">
                        <span>180 Pay</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">
                          Payments
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        1-Click checkout popups & 2-way signed verification webhooks.
                      </p>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* 3. Docs & SDKs Link */}
            <Link
              href="/docs"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 min-h-[34px] cursor-pointer ${
                pathname === '/docs'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs border border-zinc-200/60 dark:border-white/10 font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              <Code2 className={`w-3.5 h-3.5 ${pathname === '/docs' ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-500 dark:text-zinc-400'}`} />
              <span>Docs & SDKs</span>
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live System Indicator */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>180 Core Live</span>
          </div>

          {/* OIDC Discovery Link */}
          <a
            href="https://auth.180workspace.com/.well-known/openid-configuration"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 border border-zinc-200/70 dark:border-white/10 transition-all"
            title="Open Standard OIDC Discovery JSON"
          >
            <span>Discovery</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
          </a>

          {/* Centralized Help Icon */}
          <HelpIcon slug="180-developers" helpText="Developer Documentation & API Reference" className="hidden sm:flex min-h-[38px] min-w-[38px]" />

          {/* 180 Profile Sovereign Wallet Link */}
          <a
            href="http://localhost:3009"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-3.5 py-1.5 min-h-[38px] rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/20 hover:bg-purple-100/60 dark:hover:bg-purple-900/40 transition-all shadow-xs"
            title="Open 180 Profile Sovereign Wallet"
          >
            <span>180 Profile</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>

          {/* Workspace Hub Link */}
          <a
            href="https://180workspace.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white px-3.5 py-1.5 min-h-[38px] rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-all shadow-xs"
          >
            <span>Workspace</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>

          {/* Theme Toggle (Light / Obsidian Dark Mode) */}
          <ThemeToggle />

          {/* Mobile Hamburger Toggle (Minimum 44x44px per UX rules) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-10 h-10 min-h-[44px] min-w-[44px] rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all duration-200 cursor-pointer shadow-xs"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-white/10 bg-white/95 dark:bg-black/95 px-4 pt-3 pb-6 space-y-3 backdrop-blur-2xl shadow-xl animate-in slide-in-from-top-2 duration-200">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
              pathname === '/'
                ? 'text-zinc-950 dark:text-white bg-zinc-100 dark:bg-white/10 font-bold border border-zinc-200/80 dark:border-white/10'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
            }`}
          >
            <Terminal className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Applications Dashboard</span>
          </Link>

          {/* Mobile Products Group */}
          <div className="space-y-1 pt-1 border-t border-zinc-200 dark:border-white/10">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-4">
              Products
            </span>
            <Link
              href="/products/identity"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>180 Identity (Auth)</span>
              </div>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">OIDC 1.0</span>
            </Link>

            <Link
              href="/products/pay"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5"
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>180 Pay (Payments)</span>
              </div>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">1-Click</span>
            </Link>
          </div>

          <Link
            href="/docs"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 min-h-[44px]"
          >
            <Code2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Docs & SDKs</span>
          </Link>

          <div className="pt-3 border-t border-zinc-200 dark:border-white/10 space-y-2">
            <a
              href="http://localhost:3009"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-500/20"
            >
              <span>180 Profile Sovereign Wallet</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href="https://auth.180workspace.com/.well-known/openid-configuration"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all"
            >
              <span>OIDC Discovery JSON</span>
              <ArrowUpRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

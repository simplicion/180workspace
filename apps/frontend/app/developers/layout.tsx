import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { Terminal, Shield, BookOpen, Key, Activity, ArrowUpRight } from 'lucide-react';

export const metadata: Metadata = {
  title: '180 Developer Portal — Build on 180 Identity',
  description: 'Manage OAuth applications, generate client keys, rotate secrets, and integrate SSO with 180 Identity.',
};

export default function DeveloperPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Developer Portal Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/developers" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                180
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-white text-base tracking-tight">Developers</span>
                <span className="text-[11px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  Console v1.0
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-400">
              <Link
                href="/developers"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-900 transition-colors"
              >
                Applications
              </Link>
              <a
                href="/.well-known/openid-configuration"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-900 transition-colors flex items-center gap-1"
              >
                <span>OIDC Discovery</span>
                <ArrowUpRight className="w-3 h-3 text-slate-500" />
              </a>
              <a
                href="/.well-known/jwks.json"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-900 transition-colors flex items-center gap-1"
              >
                <span>JWKS Keys</span>
                <ArrowUpRight className="w-3 h-3 text-slate-500" />
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* System Status Pill */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Identity Engine Operational</span>
            </div>

            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-900 transition-colors"
            >
              Exit to Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* Main Developer Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} 180 Workspace Platform. Standard OpenID Connect & OAuth 2.0.</span>
          <div className="flex items-center gap-4">
            <a href="/oauth/authorize?client_id=180-workspace-platform" className="hover:text-slate-300">Test Auth Modal</a>
            <span>•</span>
            <a href="/sdk/180-identity.js" target="_blank" className="hover:text-slate-300">Drop-in SDK</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

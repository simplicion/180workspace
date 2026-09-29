'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function AuthStandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between text-slate-900 relative overflow-hidden">
      {/* Full Page Blue Grid Background */}
      <div className="fixed inset-0 marketing-grid-bg pointer-events-none z-0 opacity-70" />

      {/* Subtle ambient gradient orbs */}
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Large watermark logo */}
      <div className="fixed inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
        <img src="/black icon.svg" alt="" className="w-80 h-80 object-contain" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
      </div>

      {/* Top Branding Bar */}
      <header className="relative z-10 w-full pt-6 pb-2 px-6 flex items-center justify-center gap-2.5">
        <img
          src="/black icon.svg"
          alt="180 Profile"
          className="w-7 h-7 object-contain"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            if (!target.src.includes('black-icon')) target.src = '/black-icon.svg';
          }}
        />
        <span className="font-bold text-base tracking-tight text-gray-900">
          <span className="text-blue-600">180</span>profile
        </span>
      </header>

      {/* Full Page Auth Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-4 sm:px-8 w-full max-w-md mx-auto relative z-10">
        <div className="w-full">{children}</div>
      </main>

      {/* Docked Minimal Footer */}
      <footer className="w-full py-3.5 px-4 border-t border-slate-100 text-center text-[11px] text-slate-400 relative z-10 bg-white/80 backdrop-blur-xs flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Protected by 180 Workspace Sovereign Identity & Ledger Protocol</span>
      </footer>
    </div>
  );
}

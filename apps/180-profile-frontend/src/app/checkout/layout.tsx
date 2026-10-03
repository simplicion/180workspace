'use client';

import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

export default function CheckoutStandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-black flex flex-col justify-between text-slate-900 dark:text-zinc-100 font-sans relative antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="w-full border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 py-3 shadow-2xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-center shadow-2xs shrink-0">
              <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-zinc-100 leading-tight">
                Secure Checkout
              </span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                End-to-End Encrypted
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300 bg-emerald-50/80 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800/50 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium text-[11px] text-emerald-800 dark:text-emerald-300">256-Bit SSL</span>
          </div>
        </div>
      </header>

      {/* Direct Page Content */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 sm:px-6 py-5 flex flex-col justify-start relative z-10">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="w-full border-t border-slate-200/70 dark:border-zinc-800/70 py-3 px-4 text-center text-slate-400 dark:text-zinc-500 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-sm relative z-10">
        <div className="max-w-md mx-auto flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-500 font-medium">
          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>PCI-DSS Compliant • 256-Bit Secure Payment Encryption</span>
        </div>
      </footer>
    </div>
  );
}


'use client';

import React from 'react';
import { CreditCard, Shield } from 'lucide-react';

export default function CheckoutStandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between text-slate-900 font-sans relative">
      {/* Top Header */}
      <header className="w-full border-b border-slate-100 bg-white sticky top-0 z-20 px-4 sm:px-6 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[1px] shadow-xs shrink-0 overflow-hidden">
              <div className="w-full h-full bg-white rounded-xl flex items-center justify-center p-1.5">
                <CreditCard className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <span className="font-bold text-xs tracking-tight text-slate-900">
              180 Pay
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              Sovereign Gateway
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/80 shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium text-[11px]">1-Click Authorized</span>
          </div>
        </div>
      </header>

      {/* Direct Page Content */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 sm:px-6 py-5 flex flex-col justify-start relative z-10">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="w-full border-t border-slate-100 py-3.5 px-4 text-center text-slate-400 bg-white relative z-10">
        <div className="max-w-md mx-auto flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <Shield className="w-3 h-3 text-slate-400" />
          <span>Protected by 180 Workspace Sovereign Ledger Protocol</span>
        </div>
      </footer>
    </div>
  );
}

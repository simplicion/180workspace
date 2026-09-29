'use client';

import React from 'react';
import { CreditCard, Shield } from 'lucide-react';

export default function CheckoutStandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 text-slate-900 font-sans relative">
      {/* Background Soft Dot-Matrix Pattern */}
      <div className="fixed inset-0 marketing-grid-bg pointer-events-none z-0 opacity-80" />

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 max-w-lg mx-auto w-full relative z-10">
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

        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium">1-Click Authorized</span>
        </div>
      </div>

      {/* Centered Popup Content Container */}
      <div className="flex-1 flex items-center justify-center py-6 w-full relative z-10">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Minimal Footer */}
      <div className="text-center text-xs text-slate-400 max-w-lg mx-auto w-full pt-3 border-t border-slate-200 relative z-10">
        Protected by 180 Workspace Sovereign Ledger Protocol
      </div>
    </div>
  );
}

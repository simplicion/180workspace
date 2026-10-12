'use client';

import Link from 'next/link';
import { PhoneCall, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-black px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
        <PhoneCall className="w-8 h-8 text-cyan-500 animate-pulse" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">404 - Page Not Found</h1>
      <p className="text-sm text-gray-500 dark:text-zinc-400 mb-8 max-w-sm">
        The requested Voiceforce route or telephony resource could not be found.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-600/20"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Voiceforce
      </Link>
    </div>
  );
}

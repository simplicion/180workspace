'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, X } from 'lucide-react';
import { useOfflineSync } from '@/lib/offline/useOfflineSync';

const DISMISS_KEY = '180_offline_banner_dismissed';

export default function OfflineDownloadBanner() {
  const { isOnline, pendingCount } = useOfflineSync();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      /* storage blocked: banner just stays visible */
    }
  }, []);

  // Coming back online re-arms the banner for the next outage.
  useEffect(() => {
    if (isOnline) {
      setDismissed(false);
      try {
        sessionStorage.removeItem(DISMISS_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [isOnline]);

  if (isOnline || dismissed) return null;

  return (
    <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-amber-200 bg-white dark:bg-zinc-900 dark:border-amber-500/30 shadow-xl p-4 flex gap-3">
      <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
        <WifiOff className="w-5 h-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">You&apos;re offline</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {pendingCount > 0
            ? `${pendingCount} change${pendingCount > 1 ? 's are' : ' is'} saved on this device and will sync automatically when you reconnect.`
            : 'Changes you make will be saved on this device and synced when you reconnect.'}
        </p>
      </div>
      <button
        aria-label="Dismiss"
        onClick={() => {
          setDismissed(true);
          try {
            sessionStorage.setItem(DISMISS_KEY, '1');
          } catch {
            /* ignore */
          }
        }}
        className="shrink-0 self-start p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, Download, X } from 'lucide-react';
import { useOfflineSync } from '@/lib/offline/useOfflineSync';
import { desktopDownloadUrl, desktopPlatformLabel, detectOS, isDesktopApp } from '@/lib/platform/desktop';

const DISMISS_KEY = '180_offline_banner_dismissed';

/**
 * Browser-only nudge shown when the connection drops: the desktop app is what makes the workspace usable offline.
 * Not shown inside the desktop app itself (there the sync indicator already explains offline mode).
 */
export default function OfflineDownloadBanner() {
  const { isOnline, pendingCount } = useOfflineSync();
  const [isDesktop, setIsDesktop] = useState(true); // assume desktop until detected → never flash in the app
  const [dismissed, setDismissed] = useState(false);
  const [os, setOs] = useState(() => detectOS());

  useEffect(() => {
    setIsDesktop(isDesktopApp());
    setOs(detectOS());
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

  if (isDesktop || isOnline || dismissed) return null;

  const isMobile = os === 'android' || os === 'ios';

  return (
    <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-amber-200 bg-white dark:bg-slate-900 dark:border-amber-500/30 shadow-xl p-4 flex gap-3">
      <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
        <WifiOff className="w-5 h-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">You&apos;re offline</p>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {pendingCount > 0 ? `${pendingCount} change${pendingCount > 1 ? 's are' : ' is'} saved on this device and will sync when you reconnect. ` : ''}
          {isMobile
            ? 'Install the 180 Workspace desktop app on your computer to work without internet.'
            : 'Install the 180 Workspace desktop app to keep working without internet, and to use video editing. Download it when you are back online.'}
        </p>
        {!isMobile && (
          <a href={desktopDownloadUrl(os)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            <Download className="w-3.5 h-3.5" /> Download for {desktopPlatformLabel(os)}
          </a>
        )}
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
        className="shrink-0 self-start p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

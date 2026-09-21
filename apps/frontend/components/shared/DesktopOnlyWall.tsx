'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Laptop, Download, ExternalLink, Cpu, HardDrive, WifiOff, ArrowLeft } from 'lucide-react';
import { desktopDeepLink, desktopDownloadUrl, desktopPlatformLabel, detectOS, type ClientOS } from '@/lib/platform/desktop';

interface Props {
  /** e.g. "Video editing" */
  featureName: string;
  /** Route to open inside the desktop app, e.g. "media-editor" */
  deepLinkPath?: string;
  /** Where "back" goes. */
  backHref?: string;
}

/**
 * Shown in the browser in place of a feature that runs only in the desktop app (media processing: FFmpeg, GPU
 * rendering, local files). Explains why, and gives the two actions that matter: open the app, or install it.
 */
export function DesktopOnlyWall({ featureName, deepLinkPath = '', backHref = '/dashboard' }: Props) {
  const [os, setOs] = useState<ClientOS>('web');
  const [tried, setTried] = useState(false);

  useEffect(() => setOs(detectOS()), []);

  const isMobile = os === 'android' || os === 'ios';

  const openApp = () => {
    setTried(true);
    window.location.href = desktopDeepLink(deepLinkPath);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-xl w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 space-y-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
          <Laptop className="w-7 h-7 text-indigo-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{featureName} needs the 180 Workspace desktop app</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            To keep your footage private and your edits fast, {featureName.toLowerCase()} runs on your own computer, not in the
            browser. Install the app once and it also lets you work on the rest of your workspace without an internet connection.
          </p>
        </div>

        <ul className="text-left text-sm text-slate-600 dark:text-slate-400 space-y-2 max-w-sm mx-auto">
          <li className="flex gap-2.5"><Cpu className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" /> Hardware-accelerated rendering and export</li>
          <li className="flex gap-2.5"><HardDrive className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" /> Edit large video files straight from your disk</li>
          <li className="flex gap-2.5"><WifiOff className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" /> Keep working offline; changes sync when you reconnect</li>
        </ul>

        {isMobile ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
            The desktop app is available for Windows, macOS and Linux. Open 180 Workspace on your computer to use {featureName.toLowerCase()}.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={desktopDownloadUrl(os)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              Download for {desktopPlatformLabel(os)}
            </a>
            <button
              onClick={openApp}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Already installed? Open the app
            </button>
          </div>
        )}

        {tried && !isMobile && (
          <p className="text-xs text-slate-500">
            If nothing opened, the app isn&apos;t installed on this computer yet. Download it above, install it, then try again.
          </p>
        )}

        <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to workspace
        </Link>
      </div>
    </div>
  );
}

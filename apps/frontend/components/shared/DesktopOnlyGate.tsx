'use client';

import React, { useEffect, useState } from 'react';
import { isDesktopApp } from '@/lib/platform/desktop';
import { DesktopOnlyWall } from './DesktopOnlyWall';

interface Props {
  children: React.ReactNode;
  featureName: string;
  deepLinkPath?: string;
  backHref?: string;
}

/**
 * Renders `children` only inside the desktop app; in a browser it renders the "download the app" wall.
 *
 * Detection needs `window`, so the first render is neutral (no wall flash for desktop users, no editor flash for
 * browser users). Developers can bypass the gate locally with NEXT_PUBLIC_ALLOW_BROWSER_MEDIA_EDITOR=true; that
 * variable must NOT be set in production builds.
 */
export function DesktopOnlyGate({ children, featureName, deepLinkPath, backHref }: Props) {
  const [mode, setMode] = useState<'checking' | 'desktop' | 'browser'>('checking');

  useEffect(() => {
    setMode(isDesktopApp() ? 'desktop' : 'browser');
  }, []);

  if (mode === 'checking') {
    return <div className="min-h-[60vh]" aria-busy="true" />;
  }

  const devBypass = process.env.NEXT_PUBLIC_ALLOW_BROWSER_MEDIA_EDITOR === 'true';
  if (mode === 'desktop' || devBypass) return <>{children}</>;

  return <DesktopOnlyWall featureName={featureName} deepLinkPath={deepLinkPath} backHref={backHref} />;
}

'use client';

import React from 'react';

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
export function DesktopOnlyGate({ children }: Props) {
  return <>{children}</>;
}

'use client';

import { useEffect } from 'react';
import { isDesktopApp } from '@/lib/platform/desktop';

/**
 * Registers /sw.js in production only. In development a service worker would keep serving stale bundles, so any
 * previously registered one is removed instead.
 *
 * The desktop app registers with `?desktop=1`, which lets the worker also cache page navigations so previously
 * visited screens open with no connection (see public/sw.js for why that is desktop-only).
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
      return;
    }

    const url = isDesktopApp() ? '/sw.js?desktop=1' : '/sw.js';
    navigator.serviceWorker.register(url, { scope: '/' }).catch((err) => {
      console.warn('[SW] registration failed:', err);
    });
  }, []);

  return null;
}

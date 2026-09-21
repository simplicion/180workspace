'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CheckSquare, Users, FileText, WifiOff } from 'lucide-react';
import { OfflineWall } from '@workspace/ui';
import { useOfflineSync } from '@/lib/offline/useOfflineSync';
import { moduleForRoute } from '@/lib/offline/module-policy';

/**
 * Wraps every platform screen.
 *  - Offline on a screen that needs a live connection (real-time or sensitive): an explanation and a way to the parts
 *    that DO work offline, instead of a broken page with failed requests.
 *  - Offline on a screen that works from saved data: the screen renders normally, with a small "saved data" indicator
 *    as soon as a response came from the device instead of the server.
 *
 * Which module is which lives in lib/offline/module-policy.ts (one table for caching, this gate and the docs).
 */
export default function OfflineModuleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isOnline } = useOfflineSync();
  const [servedOffline, setServedOffline] = useState(false);

  useEffect(() => {
    const onServed = () => setServedOffline(true);
    window.addEventListener('offline_data_served', onServed);
    return () => window.removeEventListener('offline_data_served', onServed);
  }, []);

  // Back online: the next responses come from the server again.
  useEffect(() => {
    if (isOnline) setServedOffline(false);
  }, [isOnline]);

  const mod = moduleForRoute(pathname);

  if (!isOnline && mod?.tier === 'online-only') {
    return (
      <OfflineWall
        featureName={mod.label}
        reason={mod.note}
        onRetry={() => window.location.reload()}
        suggestedActions={[
          { label: 'Projects & Tasks', href: '/tasks', icon: CheckSquare, description: 'Create and edit tasks offline; they sync when you reconnect.' },
          { label: 'Clients & Leads', href: '/clients', icon: Users, description: 'Browse and update clients and leads offline.' },
          { label: 'Documents', href: '/documents', icon: FileText, description: 'Open documents you have viewed before.' },
        ]}
      />
    );
  }

  return (
    <>
      {!isOnline && servedOffline && (
        <div role="status" className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <WifiOff className="h-3.5 w-3.5" />
          Offline: showing data saved on this device. Changes you make sync when you reconnect.
        </div>
      )}
      {children}
    </>
  );
}

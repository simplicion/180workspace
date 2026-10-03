import React, { Suspense } from 'react';
import AppDetailClient from '../AppDetailClient';
import { LogoLoader } from '@workspace/ui';

export function generateStaticParams() {
  return [{ id: 'default' }];
}

export default function PayDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
          <LogoLoader size={40} className="w-10 h-10 text-purple-600 animate-spin" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Loading 180 Pay Dashboard...</p>
        </div>
      }
    >
      <AppDetailClient initialView="pay" />
    </Suspense>
  );
}

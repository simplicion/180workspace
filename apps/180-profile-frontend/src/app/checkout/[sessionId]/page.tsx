import React, { Suspense } from 'react';
import CheckoutClient from './CheckoutClient';
import { LogoLoader } from '@workspace/ui';

export function generateStaticParams() {
  return [{ sessionId: 'default' }];
}

export const dynamicParams = false;

export default function StandaloneCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-3xl p-8 text-center space-y-4 max-w-lg mx-auto flex flex-col items-center justify-center border border-slate-200 shadow-xl font-sans">
          <LogoLoader size={40} className="w-10 h-10 text-blue-600" />
          <p className="text-xs text-slate-500 font-medium">Loading 180 Pay checkout...</p>
        </div>
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}

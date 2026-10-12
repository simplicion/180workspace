import React, { Suspense } from 'react';
import AgentTrainClient from './AgentTrainClient';
import { LogoLoader } from '@workspace/ui';

export function generateStaticParams() {
  return [{ id: 'default' }];
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
          <LogoLoader size={40} className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-xs text-gray-500 font-medium">Loading Training Console...</p>
        </div>
      }
    >
      <AgentTrainClient />
    </Suspense>
  );
}

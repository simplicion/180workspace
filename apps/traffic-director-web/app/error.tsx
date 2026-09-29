'use client';

import React from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-900 border border-white/10 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center text-xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">An error occurred</h2>
        <p className="text-xs text-zinc-400">
          {error?.message || 'Something unexpected happened.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Sparkles, Square, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface LiveAIStreamOverlayProps {
  isGenerating: boolean;
  statusMessage?: string;
  onStop: () => void;
}

export function LiveAIStreamOverlay({ isGenerating, statusMessage, onStop }: LiveAIStreamOverlayProps) {
  if (!isGenerating) return null;

  return (
    <>
      {/* Dimmed & Blurred Non-Touchable Canvas Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/15 backdrop-blur-[2px] z-20 pointer-events-none transition-opacity duration-300 animate-fadeIn" 
      />

      {/* Floating Control Pill at the Top */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 px-4 py-2 rounded-full shadow-2xl animate-slideDown">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
            <div className="absolute inset-0 w-4 h-4 bg-violet-500 blur-sm opacity-50 animate-ping" />
          </div>
          <span className="text-xs font-semibold text-slate-100 tracking-wide">
            {statusMessage || 'AI Agent is building your document...'}
          </span>
        </div>

        <div className="w-px h-4 bg-slate-700" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onStop();
          }}
          className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold px-3 py-1 rounded-full shadow transition-all flex items-center gap-1.5 cursor-pointer pointer-events-auto"
          title="Stop Generating (Esc)"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>Stop</span>
        </button>
      </div>
    </>
  );
}

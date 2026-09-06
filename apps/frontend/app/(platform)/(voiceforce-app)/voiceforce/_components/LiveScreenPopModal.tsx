"use client";

import { useState, useEffect } from 'react';
import { 
  PhoneForwarded, User, AlertCircle, CheckCircle2, Sparkles, 
  Clock, ArrowRight, ShieldCheck, PhoneCall, X, Volume2
} from 'lucide-react';
import clsx from 'clsx';

export interface ScreenPopData {
  callSessionId: string;
  customerName: string;
  callerNumber: string;
  sentiment: 'positive' | 'neutral' | 'frustrated' | 'urgent';
  sentimentScore: number;
  coreIntent: string;
  summary: string;
  factsCollected: Record<string, any>;
  actionsPerformed: Array<{ tool: string; result: string }>;
  recommendedAction: string;
  startedAt: string;
  elapsedSeconds: number;
  whisperText?: string;
}

interface LiveScreenPopModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ScreenPopData | null;
  onAcceptTransfer?: () => void;
}

export function LiveScreenPopModal({ isOpen, onClose, data, onAcceptTransfer }: LiveScreenPopModalProps) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800/80 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header with Transfer Alert */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 animate-pulse">
              <PhoneForwarded className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  Incoming Warm Transfer
                </h3>
                <span className={clsx(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border",
                  data.sentiment === 'frustrated' ? "bg-rose-50 dark:bg-rose-950 text-rose-600 border-rose-300" :
                  data.sentiment === 'urgent' ? "bg-amber-50 dark:bg-amber-950 text-amber-600 border-amber-300" :
                  "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border-emerald-300"
                )}>
                  {data.sentiment} Customer
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                AI Employee Prince is transferring active caller {data.callerNumber}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Second Audio Whisper Preview */}
        {data.whisperText && (
          <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-start gap-3 text-xs">
            <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-indigo-900 dark:text-indigo-200">Staff Audio Whisper:</span>
              <p className="text-indigo-800 dark:text-indigo-300 mt-0.5 leading-relaxed italic">
                &ldquo;{data.whisperText}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Structured Caller Briefing Card */}
        <div className="space-y-3.5">
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-200/60 dark:border-gray-700/60">
              <div>
                <span className="text-[11px] text-gray-500 block">Customer Name</span>
                <span className="font-bold text-gray-900 dark:text-white text-sm">{data.customerName}</span>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block">Core Intent</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{data.coreIntent}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-gray-500 block font-semibold mb-1">Issue Summary</span>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                {data.summary}
              </p>
            </div>

            {/* Recommended Action */}
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                Recommended Staff Next Step:
              </span>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100 mt-0.5">
                {data.recommendedAction}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer"
          >
            Dismiss
          </button>
          <button
            onClick={() => {
              if (onAcceptTransfer) onAcceptTransfer();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Accept Warm Call Handoff</span>
          </button>
        </div>
      </div>
    </div>
  );
}

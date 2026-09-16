'use client';

import React, { useState } from 'react';
import { useOfflineSync } from '@/lib/offline/useOfflineSync';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Clock, CloudUpload, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OutboxMutation } from '@/lib/offline/db';

export default function SyncStatusIndicator() {
  const { isOnline, syncState, pendingCount, lastSyncedAt, triggerSync, getPendingList } = useOfflineSync();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState<OutboxMutation[]>([]);

  const handleOpenDrawer = async () => {
    const list = await getPendingList();
    setPendingItems(list);
    setIsOpen(true);
  };

  if (isOnline && pendingCount === 0 && syncState === 'idle') {
    // Silent mode when fully synced, or subtle online indicator
    return (
      <button
        onClick={handleOpenDrawer}
        className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        title="All changes synced to 180 Workspace Cloud"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span className="text-[11px]">Synced</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleOpenDrawer}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-all animate-fade-in",
          !isOnline && "bg-amber-500/10 text-amber-700 border border-amber-300 dark:border-amber-600/30",
          isOnline && syncState === 'syncing' && "bg-indigo-50 text-indigo-700 border border-indigo-200",
          isOnline && pendingCount > 0 && syncState !== 'syncing' && "bg-slate-100 text-slate-700 border border-slate-300"
        )}
        title={!isOnline ? `Offline Mode: ${pendingCount} changes saved locally` : `${pendingCount} changes pending sync`}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Offline ({pendingCount} pending)</span>
          </>
        ) : syncState === 'syncing' ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
            <span>Syncing {pendingCount} change{pendingCount > 1 ? 's' : ''}...</span>
          </>
        ) : (
          <>
            <CloudUpload className="w-3.5 h-3.5 text-slate-600" />
            <span>{pendingCount} Pending Sync</span>
          </>
        )}
      </button>

      {/* Sync Queue Inspector Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {!isOnline ? (
                  <WifiOff className="w-5 h-5 text-amber-500" />
                ) : (
                  <Wifi className="w-5 h-5 text-emerald-500" />
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {!isOnline ? 'Offline Storage Active' : 'Offline Sync Engine'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {!isOnline
                      ? 'All changes are saved safely to your device disk.'
                      : 'Connected to 180 Workspace Work Graph.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                <span>Pending Outbox Mutations:</span>
                <span className="font-bold text-slate-900 dark:text-white">{pendingCount}</span>
              </div>

              {lastSyncedAt && (
                <p className="text-[11px] text-slate-400">
                  Last cloud synchronization: {new Date(lastSyncedAt).toLocaleTimeString()}
                </p>
              )}

              {/* Pending mutation list */}
              {pendingItems.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {pendingItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                            {item.action} {item.entityType}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                            {item.endpoint}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 font-mono">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-500 flex flex-col items-center gap-1.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span>All local mutations have been synchronized to PostgreSQL.</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                disabled={!isOnline || syncState === 'syncing' || pendingCount === 0}
                onClick={async () => {
                  await triggerSync();
                  const list = await getPendingList();
                  setPendingItems(list);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 font-semibold text-xs shadow-sm transition-colors"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", syncState === 'syncing' && "animate-spin")} />
                <span>{syncState === 'syncing' ? 'Syncing...' : 'Sync Changes Now'}</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

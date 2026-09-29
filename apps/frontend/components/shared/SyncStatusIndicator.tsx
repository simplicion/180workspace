'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useOfflineSync } from '@/lib/offline/useOfflineSync';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Clock, CloudUpload, AlertTriangle, LogIn, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OutboxMutation } from '@/lib/offline/db';

const REASON_LABEL: Record<string, string> = {
  stale_write: 'Changed by someone else',
  entity_not_found: 'Deleted by someone else',
  forbidden: 'You no longer have permission',
  validation: 'The server rejected it',
  plan_limit: 'Plan limit reached',
  expired: 'Too old to sync',
  legacy: 'Saved by an older version',
  depends_on_failed_change: 'Depends on a change that failed',
};

export default function SyncStatusIndicator() {
  const { isOnline, syncState, pendingCount, attentionCount, lastSyncedAt, triggerSync, getPendingList, getAttentionList, retryMutation, discardMutation } = useOfflineSync();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState<OutboxMutation[]>([]);
  const [attentionItems, setAttentionItems] = useState<OutboxMutation[]>([]);

  const reload = useCallback(async () => {
    const [p, a] = await Promise.all([getPendingList(), getAttentionList()]);
    setPendingItems(p);
    setAttentionItems(a);
  }, [getPendingList, getAttentionList]);

  // Keep the open drawer live as the engine works.
  useEffect(() => {
    if (isOpen) reload().catch(() => {});
  }, [isOpen, pendingCount, attentionCount, reload]);

  const authRequired = syncState === 'auth_required';

  if (isOnline && pendingCount === 0 && attentionCount === 0 && !authRequired && syncState === 'idle') {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
        title="All changes are saved to 180 Workspace Cloud"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span className="text-[11px]">Synced</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-all animate-fade-in',
          attentionCount > 0 && 'bg-red-50 text-red-700 border border-red-200',
          attentionCount === 0 && authRequired && 'bg-amber-500/10 text-amber-700 border border-amber-300',
          attentionCount === 0 && !authRequired && !isOnline && 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-600/30',
          attentionCount === 0 && !authRequired && isOnline && syncState === 'syncing' && 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60',
          attentionCount === 0 && !authRequired && isOnline && syncState !== 'syncing' && 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700'
        )}
        title={!isOnline ? `Offline: ${pendingCount} change(s) saved on this device` : `${pendingCount} change(s) waiting to sync`}
      >
        {attentionCount > 0 ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{attentionCount} need{attentionCount > 1 ? '' : 's'} attention</span>
          </>
        ) : authRequired ? (
          <>
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign in to sync {pendingCount}</span>
          </>
        ) : !isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Offline{pendingCount > 0 ? ` (${pendingCount} saved)` : ''}</span>
          </>
        ) : syncState === 'syncing' ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
            <span>Syncing {pendingCount}…</span>
          </>
        ) : (
          <>
            <CloudUpload className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
            <span>{pendingCount} waiting</span>
          </>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                {!isOnline ? <WifiOff className="w-5 h-5 text-amber-500" /> : <Wifi className="w-5 h-5 text-emerald-500" />}
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">{!isOnline ? 'Working offline' : 'Sync'}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {!isOnline ? 'Your changes are saved on this device and will sync automatically.' : 'Connected to 180 Workspace.'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {authRequired && (
              <div className="text-xs rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 p-3">
                Your session expired. Your saved changes are safe. Sign in again as the same user and they will sync.
              </div>
            )}

            {attentionItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">Needs your decision</p>
                {attentionItems.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 text-xs space-y-2">
                    <div>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200 capitalize">
                        {item.action.toLowerCase()} {item.entityType}
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400">{REASON_LABEL[item.lastReason || ''] || item.lastError || 'Could not be synced'}</p>
                      {item.lastError && REASON_LABEL[item.lastReason || ''] && <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{item.lastError}</p>}
                    </div>
                    <div className="flex gap-2">
                      {item.lastReason === 'stale_write' ? (
                        <>
                          <button onClick={async () => { await retryMutation(item.id, { force: true }); reload(); }} className="px-2.5 py-1 rounded-md bg-indigo-600 text-white font-semibold">Keep mine</button>
                          <button onClick={async () => { await discardMutation(item); reload(); }} className="px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold">Use theirs</button>
                        </>
                      ) : (
                        <>
                          {item.lastReason !== 'entity_not_found' && item.lastReason !== 'forbidden' && (
                            <button onClick={async () => { await retryMutation(item.id); reload(); }} className="px-2.5 py-1 rounded-md bg-indigo-600 text-white font-semibold">Retry</button>
                          )}
                          <button onClick={async () => { await discardMutation(item); reload(); }} className="px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold">Discard</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                <span>Waiting to sync:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{pendingCount}</span>
              </div>

              {lastSyncedAt && <p className="text-[11px] text-zinc-400">Last synced: {new Date(lastSyncedAt).toLocaleTimeString()}</p>}

              {pendingItems.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {pendingItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <div>
                          <p className="font-semibold text-zinc-800 dark:text-zinc-200 capitalize">
                            {item.action.toLowerCase()} {item.entityType}
                          </p>
                          {item.retryCount > 0 && <p className="text-[10px] text-zinc-400">Retrying (attempt {item.retryCount + 1})</p>}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">{item.status}</span>
                    </div>
                  ))}
                </div>
              ) : attentionItems.length === 0 ? (
                <div className="text-center py-4 text-xs text-zinc-500 flex flex-col items-center gap-1.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span>Everything is synced.</span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                disabled={!isOnline || syncState === 'syncing' || pendingCount === 0}
                onClick={async () => {
                  await triggerSync();
                  await reload();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-zinc-800 text-white disabled:text-gray-400 dark:disabled:text-zinc-500 font-semibold text-xs shadow-sm transition-colors"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', syncState === 'syncing' && 'animate-spin')} />
                <span>{syncState === 'syncing' ? 'Syncing…' : 'Sync now'}</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors"
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

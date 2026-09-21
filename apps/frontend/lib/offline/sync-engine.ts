/**
 * 180 Workspace - Background Sync Engine
 *
 * Responsibilities
 *  - Know whether we are REALLY online (navigator.onLine only says a network interface exists).
 *  - Push the outbox: FIFO, batched, idempotent, one tab at a time, exponential backoff, never dropping user data.
 *  - Remap temp ids to server ids and rewrite dependent queued mutations.
 *  - Pull server changes into the local entity store (tenant/permission scoped by the server).
 *
 * Failure semantics (see docs/offline-desktop/PRODUCTION_PLAN.md for the full matrix)
 *   network down       -> mutations stay queued, no retry budget consumed
 *   401                -> pause, keep everything, resume after sign-in as the SAME user
 *   429 / 5xx / timeout-> exponential backoff with jitter, order preserved (later mutations wait)
 *   403 / 4xx          -> "rejected": surfaced to the user, dependents cascade-rejected, nothing lost silently
 *   409 / entity gone  -> "conflict": user chooses keep mine / use theirs
 */

import api from '@/lib/api';
import {
  OutboxMutation,
  bulkDeleteSynced,
  bulkUpsertSynced,
  deleteLocalEntity,
  getAttentionMutations,
  getLocalEntityRecord,
  getLocalEntityRecordsByType,
  getMeta,
  getPendingMutationCount,
  getPendingMutations,
  patchMutation,
  remapTempId,
  removeMutation,
  saveLocalEntity,
  setMeta,
  subscribeOutboxChanged,
} from './outbox';
import { getSessionScope, type SessionScope } from './session';
import { registerReachabilityHandler } from './reachability';
import {
  STUCK_IN_FLIGHT_MS,
  backoffMs,
  extractEntity,
  extractEntityId,
  findDependents,
  isExpired,
  takeBatch,
} from './sync-logic';
import { toRestTask } from './local-queries';

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error' | 'auth_required';

export interface SyncSnapshot {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  attentionCount: number;
  lastSyncedAt: number | null;
  currentMutation?: OutboxMutation;
}

export interface SyncEngineListener {
  (state: SyncSnapshot): void;
}

const HEARTBEAT_MS = 15_000;
const PULL_INTERVAL_MS = 60_000;
const BASELINE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const PROBE_TIMEOUT_MS = 4_000;
const LOCK_NAME = '180-outbox-drain';

class BackgroundSyncEngine {
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncState: SyncState = 'idle';
  private pendingCount = 0;
  private attentionCount = 0;
  private lastSyncedAt: number | null = null;
  private listeners = new Set<SyncEngineListener>();
  private draining = false;
  private started = false;
  private lastPullAt = 0;
  private needsBaseline = false;
  private authPaused = false;

  constructor() {
    if (typeof window !== 'undefined') this.start();
  }

  private start() {
    if (this.started) return;
    this.started = true;

    registerReachabilityHandler((reachable) => this.reportReachable(reachable));

    window.addEventListener('online', () => {
      // The interface is up; confirm the API is actually reachable before claiming to be online.
      void this.probe().then((ok) => {
        if (ok) void this.drainOutbox();
      });
    });
    window.addEventListener('offline', () => this.setOnline(false));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.tick();
    });
    subscribeOutboxChanged(() => void this.refreshCount());

    try {
      const cap = (window as any).Capacitor?.Plugins?.Network;
      cap?.addListener?.('networkStatusChange', (s: { connected: boolean }) => {
        if (s.connected) {
          void this.probe().then((ok) => {
            if (ok) void this.drainOutbox();
          });
        } else {
          this.setOnline(false);
        }
      });
    } catch {
      /* not running under Capacitor */
    }

    // Ask the browser not to evict our IndexedDB under storage pressure (best effort; honoured in installed apps).
    try {
      void navigator.storage?.persist?.();
    } catch {
      /* unsupported */
    }

    setInterval(() => void this.tick(), HEARTBEAT_MS);
    void this.refreshCount();
    void this.tick();
  }

  // ── public API ─────────────────────────────────────────────────────────────

  public subscribe(listener: SyncEngineListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus() {
    return this.snapshot();
  }

  /** Called by the HTTP layer: a request just reached (or failed to reach) the API. Cheaper and truer than polling. */
  public reportReachable(reachable: boolean) {
    if (reachable === this.isOnline) return;
    this.setOnline(reachable);
    if (reachable) void this.drainOutbox();
  }

  public async refreshCount(): Promise<number> {
    try {
      const [pending, attention] = await Promise.all([getPendingMutationCount(), getAttentionMutations().then((a) => a.length)]);
      this.pendingCount = pending;
      this.attentionCount = attention;
      this.notify();
      return pending;
    } catch {
      return 0;
    }
  }

  // ── connectivity ───────────────────────────────────────────────────────────

  private setOnline(online: boolean) {
    if (this.isOnline === online) return;
    this.isOnline = online;
    if (!online) this.syncState = 'offline';
    else if (this.syncState === 'offline') this.syncState = 'idle';
    this.notify();
  }

  /** True if the API answered at all (any HTTP status). Only a thrown fetch means "unreachable". */
  private async probe(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      await fetch(`${base}/api/health`, { method: 'GET', cache: 'no-store', signal: controller.signal });
      this.setOnline(true);
      return true;
    } catch {
      this.setOnline(false);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  private async tick() {
    // Deliberately NOT skipped when the window is hidden/minimised: the desktop app should keep syncing in the
    // background. Only the (heavier) pull is limited to visible windows, see maybePull.
    await this.refreshCount();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.setOnline(false);
      return;
    }
    if (!this.isOnline) {
      await this.probe(); // drains via the reportReachable/online paths once reachable
      if (this.isOnline && this.pendingCount > 0) await this.drainOutbox();
      return;
    }
    if (this.pendingCount > 0) await this.drainOutbox();
    else await this.maybePull();
  }

  // ── push ───────────────────────────────────────────────────────────────────

  public async drainOutbox(): Promise<void> {
    if (this.draining || !this.isOnline) return;

    const run = async () => {
      this.draining = true;
      try {
        await this.drainLocked();
      } finally {
        this.draining = false;
        this.notify();
      }
    };

    // Only one tab may drain at a time; the others just observe via the outbox change channel.
    const locks = (typeof navigator !== 'undefined' ? (navigator as any).locks : undefined) as LockManager | undefined;
    if (locks?.request) {
      await locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
        if (lock) await run();
      });
    } else {
      await run();
    }
  }

  private async drainLocked() {
    const scope = getSessionScope();
    if (!scope) {
      this.syncState = this.pendingCount > 0 ? 'auth_required' : 'idle';
      return;
    }

    this.syncState = 'syncing';
    this.notify();

    try {
      await this.recoverStuck(scope);
      await this.expireOld(scope);

      for (;;) {
        const batch = takeBatch(await getPendingMutations(), Date.now());
        if (batch.length === 0) break;

        for (const m of batch) {
          await patchMutation(m.id, (row) => ({ ...row, status: 'in_flight', inFlightSince: Date.now() }));
        }
        this.notify(batch[0]);

        let results: any[];
        try {
          const res = await api.post(
            '/api/v1/sync/push',
            {
              mutations: batch.map((m) => ({
                clientMutationId: m.clientMutationId,
                method: m.method,
                path: m.endpoint,
                body: m.payload ?? undefined,
                baseUpdatedAt: m.baseUpdatedAt,
                force: m.force || undefined,
              })),
            },
            { timeout: 60_000, __skipOffline: true } as any
          );
          results = Array.isArray(res.data?.results) ? res.data.results : [];
        } catch (err: any) {
          await this.requeue(batch);
          if (!err?.response || err.code === 'ERR_NETWORK') {
            this.setOnline(false);
          } else if (err.response.status === 401) {
            this.authPaused = true;
            this.syncState = 'auth_required';
          } else {
            // 5xx / 404 (server mid-deploy) / 413 etc.: back off the head of the queue, keep everything.
            await this.bumpRetry(batch[0], err.response.status >= 500 ? 'server_error' : `http_${err.response.status}`);
          }
          return;
        }

        this.authPaused = false;
        const proceed = await this.applyResults(batch, results);
        await this.refreshCount();
        if (!proceed) break;
      }

      await this.maybePull(true);
      this.lastSyncedAt = Date.now();
      if (this.syncState === 'syncing') this.syncState = this.isOnline ? 'idle' : 'offline';
    } catch (err) {
      console.error('[SyncEngine] Fatal error during outbox drain:', err);
      this.syncState = 'error';
    } finally {
      await this.refreshCount();
    }
  }

  private async recoverStuck(scope: SessionScope) {
    const now = Date.now();
    for (const m of await getPendingMutations()) {
      // A tab that crashed mid-push leaves rows in_flight forever. The server's idempotency ledger makes re-sending safe.
      if (m.status === 'in_flight' && m.userId === scope.userId && now - (m.inFlightSince || 0) > STUCK_IN_FLIGHT_MS) {
        await patchMutation(m.id, (row) => ({ ...row, status: 'queued', inFlightSince: undefined }));
      }
    }
  }

  private async expireOld(scope: SessionScope) {
    const now = Date.now();
    for (const m of await getPendingMutations()) {
      if (m.userId === scope.userId && m.status === 'queued' && isExpired(m, now)) {
        await patchMutation(m.id, (row) => ({
          ...row,
          status: 'rejected',
          lastReason: 'expired',
          lastError: 'This change was saved offline more than 7 days ago and can no longer be synced automatically.',
        }));
      }
    }
  }

  private async requeue(batch: OutboxMutation[]) {
    for (const m of batch) {
      await patchMutation(m.id, (row) => (row.status === 'in_flight' ? { ...row, status: 'queued', inFlightSince: undefined } : row));
    }
  }

  private async bumpRetry(m: OutboxMutation, reason: string, retryAfterMs?: number) {
    await patchMutation(m.id, (row) => {
      const retryCount = row.retryCount + 1;
      return { ...row, status: 'queued', inFlightSince: undefined, retryCount, lastReason: reason, nextAttemptAt: Date.now() + (retryAfterMs ?? backoffMs(retryCount)) };
    });
  }

  /** Returns false when the batch hit a transient failure and the rest of the queue must wait. */
  private async applyResults(batch: OutboxMutation[], results: any[]): Promise<boolean> {
    const byId = new Map<string, any>(results.map((r) => [r.clientMutationId, r]));
    let proceed = true;

    for (const m of batch) {
      const r = byId.get(m.clientMutationId);
      if (!r) {
        await this.requeue([m]);
        proceed = false;
        continue;
      }

      switch (r.status) {
        case 'applied':
          await this.handleApplied(m, r);
          break;

        case 'conflict':
          await patchMutation(m.id, (row) => ({
            ...row,
            status: 'conflict',
            inFlightSince: undefined,
            lastReason: r.reason,
            lastError: r.message || 'This item changed while you were offline.',
            serverEntity: r.serverEntity,
          }));
          break;

        case 'rejected': {
          await patchMutation(m.id, (row) => ({
            ...row,
            status: 'rejected',
            inFlightSince: undefined,
            lastReason: r.reason,
            lastError: r.message || 'The server could not accept this change.',
          }));
          await this.cascadeReject(m);
          break;
        }

        case 'retry':
        default: {
          proceed = false;
          if (r.reason === 'unauthorized') {
            this.authPaused = true;
            this.syncState = 'auth_required';
            await this.requeue([m]);
          } else if (r.reason === 'rate_limited' || r.reason === 'in_progress' || r.reason === 'blocked_by_previous' || r.reason === 'time_budget') {
            // Not the mutation's fault: wait without consuming its retry budget.
            await patchMutation(m.id, (row) => ({ ...row, status: 'queued', inFlightSince: undefined, lastReason: r.reason, nextAttemptAt: Date.now() + (r.retryAfterMs ?? 2000) }));
          } else {
            await this.bumpRetry(m, r.reason || 'server_error', r.retryAfterMs);
          }
        }
      }
    }
    return proceed;
  }

  private async handleApplied(m: OutboxMutation, r: any) {
    const entity = extractEntity(r.data, m.entityType);

    if (m.action === 'CREATE') {
      const realId = extractEntityId(r.data, m.entityType);
      if (realId) {
        await remapTempId(m.entityId, realId);
        await deleteLocalEntity(m.entityType, m.entityId, m.userId);
        const shaped = m.entityType === 'task' ? toRestTask(entity) : entity;
        if (shaped) await saveLocalEntity(m.entityType, realId, shaped, 'synced');
      } else {
        // Created, but the response did not tell us the id. Drop the placeholder; the next baseline pull restores it.
        await deleteLocalEntity(m.entityType, m.entityId, m.userId);
        this.needsBaseline = true;
      }
    } else if (m.action === 'UPDATE') {
      if (entity) {
        const shaped = m.entityType === 'task' ? toRestTask(entity) : entity;
        await saveLocalEntity(m.entityType, m.entityId, shaped, 'synced');
      } else {
        const rec = await getLocalEntityRecord(m.entityType, m.entityId);
        if (rec) await saveLocalEntity(m.entityType, m.entityId, rec.data, 'synced', rec.serverUpdatedAt);
      }
    }
    await removeMutation(m.id);
  }

  /** A CREATE that will never succeed strands every queued edit that references its temp id. Fail them visibly. */
  private async cascadeReject(failed: OutboxMutation) {
    if (failed.action === 'CREATE') {
      const rec = await getLocalEntityRecord(failed.entityType, failed.entityId);
      if (rec) await saveLocalEntity(failed.entityType, failed.entityId, rec.data, 'sync_failed');
    }
    const dependents = findDependents(await getPendingMutations(), failed);
    for (const d of dependents) {
      await patchMutation(d.id, (row) => ({
        ...row,
        status: 'rejected',
        lastReason: 'depends_on_failed_change',
        lastError: 'A change this one depends on could not be saved, so this one was not applied.',
      }));
    }
  }

  // ── pull ───────────────────────────────────────────────────────────────────

  private async maybePull(force = false) {
    const now = Date.now();
    if (!this.isOnline || this.authPaused) return;
    if (!force && typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (!force && now - this.lastPullAt < PULL_INTERVAL_MS) return;
    this.lastPullAt = now;
    try {
      await this.pullTasks();
    } catch (err: any) {
      if (!err?.response) this.setOnline(false);
      else console.warn('[SyncEngine] pull failed:', err.response?.status);
    }
  }

  private async pullTasks() {
    const scope = getSessionScope();
    if (!scope) return;
    const metaKey = `pull:task:${scope.userId}`;
    const meta = (await getMeta<{ cursor?: string; baselineAt?: number }>(metaKey)) || {};

    const baseline = this.needsBaseline || !meta.cursor || Date.now() - (meta.baselineAt || 0) > BASELINE_INTERVAL_MS;
    let cursor = baseline ? undefined : meta.cursor;
    const seen = new Set<string>();
    const pullStartedAt = Date.now();
    let complete = false;

    for (let page = 0; page < 200; page++) {
      let data: any;
      try {
        const res = await api.get('/api/v1/sync/pull', { params: { entity: 'task', cursor, limit: 200 }, __skipOffline: true } as any);
        data = res.data;
      } catch (err: any) {
        if (err?.response?.status === 400) await setMeta(metaKey, {}); // cursor no longer valid: re-baseline next time
        throw err;
      }

      for (const row of data.upserts || []) seen.add(row.id);
      // Both helpers skip rows with unsynced local changes: a pull must never erase offline work.
      await bulkUpsertSynced('task', data.upserts || [], toRestTask);
      await bulkDeleteSynced('task', data.deletedIds || []);

      cursor = data.nextCursor || cursor;
      if (!data.hasMore) {
        complete = true;
        break;
      }
    }

    if (baseline && complete) {
      // Anything synced that the server no longer returns was reassigned away / deleted: drop it. Two guards keep
      // this from ever deleting valid data: it only runs after a COMPLETE baseline (never a truncated one), and it
      // never touches rows written after this pull began (e.g. a task that was pushed while the pull was running).
      for (const rec of await getLocalEntityRecordsByType('task')) {
        if (rec.syncStatus === 'synced' && !seen.has(rec.entityId) && rec.localUpdatedAt < pullStartedAt) {
          await deleteLocalEntity('task', rec.entityId);
        }
      }
      this.needsBaseline = false;
    }
    await setMeta(metaKey, { cursor, baselineAt: baseline && complete ? Date.now() : meta.baselineAt });
  }

  // ── notification ───────────────────────────────────────────────────────────

  private snapshot(currentMutation?: OutboxMutation): SyncSnapshot {
    return {
      isOnline: this.isOnline,
      syncState: this.syncState,
      pendingCount: this.pendingCount,
      attentionCount: this.attentionCount,
      lastSyncedAt: this.lastSyncedAt,
      currentMutation,
    };
  }

  private notify(currentMutation?: OutboxMutation) {
    const snap = this.snapshot(currentMutation);
    for (const l of this.listeners) l(snap);
  }
}

// Global singleton
export const syncEngine = new BackgroundSyncEngine();

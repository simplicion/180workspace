/**
 * 180 Workspace - Offline-aware API client (thin wrapper)
 *
 * Offline behaviour now lives in ONE place — the axios interceptors in lib/api.tsx (read cache, queueing,
 * optimistic entities, id remapping). This wrapper only keeps the `{ data, isOptimisticOffline }` return shape that
 * existing call sites rely on, and lets a caller supply a richer optimistic object for the UI.
 *
 * The previous implementation enqueued a mutation BEFORE attempting the request and never removed it on success,
 * so every online create was later replayed a second time. Do not reintroduce a second queueing path.
 */

import api from '@/lib/api';

export interface OfflineMutationOptions {
  /** Richer local shape to show while the change is only saved on this device (e.g. resolved assignee/project). */
  optimisticData?: any;
  /** @deprecated ignored; the entity type is derived from the URL by lib/offline/queue-policy.ts */
  entityType?: string;
  /** @deprecated ignored */
  entityId?: string;
  /** @deprecated ignored; identity comes from the session */
  companyId?: string;
}

const wasQueued = (res: any) => res?.headers?.['x-offline-queued'] === '1';
const config = (options?: OfflineMutationOptions) => (options?.optimisticData ? ({ __optimistic: options.optimisticData } as any) : undefined);

export const offlineApi = {
  async get<T = any>(endpoint: string, _options: { entityType?: string; entityId?: string } = {}): Promise<{ data: T; isOfflineCache?: boolean }> {
    const res = await api.get<T>(endpoint);
    return { data: res.data, isOfflineCache: !!(res.headers as any)?.['x-offline-cache'] };
  },

  async post<T = any>(endpoint: string, payload: any, options: OfflineMutationOptions = {}): Promise<{ data: T; isOptimisticOffline: boolean }> {
    const res = await api.post<T>(endpoint, payload, config(options));
    return { data: res.data, isOptimisticOffline: wasQueued(res) };
  },

  async put<T = any>(endpoint: string, payload: any, options: OfflineMutationOptions = {}): Promise<{ data: T; isOptimisticOffline: boolean }> {
    const res = await api.put<T>(endpoint, payload, config(options));
    return { data: res.data, isOptimisticOffline: wasQueued(res) };
  },

  async delete<T = any>(endpoint: string, options: OfflineMutationOptions = {}): Promise<{ success: boolean; isOptimisticOffline: boolean }> {
    const res = await api.delete<T>(endpoint, config(options));
    return { success: true, isOptimisticOffline: wasQueued(res) };
  },
};

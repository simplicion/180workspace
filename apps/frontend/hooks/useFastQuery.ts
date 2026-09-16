'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { saveLocalEntity, getLocalEntity } from '@/lib/offline/outbox';

interface CacheEntry<T = any> {
    data: T;
    timestamp: number;
    promise?: Promise<T>;
}

// Global In-Memory SWR Store
const queryCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

export interface UseFastQueryOptions<T> {
    staleTime?: number; // Time in ms before background revalidation is triggered (default: 30s)
    cacheTime?: number; // Time in ms before memory entry expires (default: 5 minutes)
    enabled?: boolean;  // Whether query should automatically execute
    initialData?: T;
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
}

export interface UseFastQueryResult<T> {
    data: T | undefined;
    loading: boolean;
    isRevalidating: boolean;
    error: any;
    refetch: () => Promise<T | undefined>;
    mutate: (updater: T | ((prev: T | undefined) => T), revalidate?: boolean) => void;
}

/**
 * High-performance Stale-While-Revalidate (SWR) Hook
 * 
 * Provides 0ms instant cached rendering when navigating between workspace screens,
 * paired with silent background network synchronization and request deduplication.
 */
export function useFastQuery<T = any>(
    key: string | null | undefined,
    fetcher?: () => Promise<T>,
    options: UseFastQueryOptions<T> = {}
): UseFastQueryResult<T> {
    const {
        staleTime = 30 * 1000,   // 30 seconds
        cacheTime = 5 * 60 * 1000, // 5 minutes
        enabled = true,
        initialData,
        onSuccess,
        onError
    } = options;

    const isMountedRef = useRef(true);
    const keyRef = useRef(key);
    keyRef.current = key;

    // Check immediate cache hit
    const cached = key ? queryCache.get(key) : undefined;
    const isCachedValid = cached && (Date.now() - cached.timestamp < cacheTime);

    const [data, setData] = useState<T | undefined>(() => {
        if (isCachedValid && cached) return cached.data;
        return initialData;
    });

    // Only show loading if we have NO cached data to paint
    const [loading, setLoading] = useState<boolean>(() => {
        if (!enabled || !key) return false;
        return !isCachedValid;
    });

    const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
    const [error, setError] = useState<any>(null);

    // Default fetcher using the centralized axios api client
    const executeFetch = useCallback(async (): Promise<T> => {
        if (!key) throw new Error('No query key provided');

        if (fetcher) {
            return await fetcher();
        }

        const res = await api.get(key);
        return res.data;
    }, [key, fetcher]);

    const fetchData = useCallback(async (isSilentBackground: boolean = false) => {
        if (!key || !enabled) return;

        // Deduplicate in-flight requests for the exact same endpoint
        if (inFlightRequests.has(key)) {
            try {
                const sharedResult = await inFlightRequests.get(key);
                if (isMountedRef.current && keyRef.current === key) {
                    setData(sharedResult);
                    setLoading(false);
                    setIsRevalidating(false);
                }
                return sharedResult;
            } catch (err) {
                // Handled by original caller
            }
        }

        if (!isSilentBackground) {
            setLoading(true);
        } else {
            setIsRevalidating(true);
        }

        const requestPromise = executeFetch();
        inFlightRequests.set(key, requestPromise);

        try {
            const result = await requestPromise;
            
            // Update in-memory cache
            queryCache.set(key, {
                data: result,
                timestamp: Date.now()
            });

            // Persist to local IndexedDB store for offline access across refreshes
            saveLocalEntity('query_cache', key, result, 'synced').catch(() => {});

            if (isMountedRef.current && keyRef.current === key) {
                setData(result);
                setError(null);
                setLoading(false);
                setIsRevalidating(false);
                onSuccess?.(result);
            }
            return result;
        } catch (err: any) {
            // Check if local cache has fallback data during network error
            try {
                const offlineFallback = await getLocalEntity('query_cache', key);
                if (offlineFallback && isMountedRef.current && keyRef.current === key) {
                    setData(offlineFallback);
                    setLoading(false);
                    setIsRevalidating(false);
                    return offlineFallback;
                }
            } catch {}

            if (isMountedRef.current && keyRef.current === key) {
                setError(err);
                setLoading(false);
                setIsRevalidating(false);
                onError?.(err);
            }
        } finally {
            inFlightRequests.delete(key);
        }
    }, [key, enabled, executeFetch, onSuccess, onError]);

    useEffect(() => {
        isMountedRef.current = true;

        if (!key || !enabled) {
            return;
        }

        const existing = queryCache.get(key);
        const now = Date.now();

        if (existing) {
            // Instant 0ms Paint
            setData(existing.data);
            setLoading(false);

            // If stale, revalidate silently in background
            if (now - existing.timestamp > staleTime) {
                fetchData(true);
            }
        } else {
            // Check IndexedDB local disk cache before cold network fetch
            getLocalEntity('query_cache', key).then((persisted) => {
                if (persisted && isMountedRef.current && keyRef.current === key) {
                    queryCache.set(key, { data: persisted, timestamp: Date.now() });
                    setData(persisted);
                    setLoading(false);
                    fetchData(true);
                } else {
                    fetchData(false);
                }
            }).catch(() => {
                fetchData(false);
            });
        }

        return () => {
            isMountedRef.current = false;
        };
    }, [key, enabled, staleTime, fetchData]);

    // Optimistic mutation helper
    const mutate = useCallback((
        updater: T | ((prev: T | undefined) => T),
        revalidate: boolean = false
    ) => {
        if (!key) return;

        setData(prev => {
            const nextValue = typeof updater === 'function' 
                ? (updater as (p: T | undefined) => T)(prev) 
                : updater;

            queryCache.set(key, {
                data: nextValue,
                timestamp: Date.now()
            });

            return nextValue;
        });

        if (revalidate) {
            fetchData(true);
        }
    }, [key, fetchData]);

    const refetch = useCallback(async () => {
        return await fetchData(false);
    }, [fetchData]);

    return {
        data,
        loading,
        isRevalidating,
        error,
        refetch,
        mutate
    };
}

/**
 * Global cache invalidation utility
 * Call after writes/deletions to force fresh data on next visit
 */
export function invalidateFastQueryCache(prefix?: string) {
    if (!prefix) {
        queryCache.clear();
        return;
    }
    for (const key of queryCache.keys()) {
        if (key.startsWith(prefix) || key.includes(prefix)) {
            queryCache.delete(key);
        }
    }
}

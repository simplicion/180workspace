import axios from 'axios';
import toast from 'react-hot-toast';
import { updateSocketAuth } from './socket';
import { singleFlightRefresh, clearAllAuthTokens } from './auth-refresh';
import { classifyForQueue, isCacheableGet } from './offline/queue-policy';
import { cacheGet, cachePut } from './offline/http-cache';
import { queryTasksLocally } from './offline/local-queries';
import { queueOfflineWrite } from './offline/offline-write';
import { lookupRealIdSync } from './offline/outbox';
import { ingestGetResponse } from './offline/ingest';
import { reportReachable } from './offline/reachability';
import { isTempId } from './offline/sync-logic';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
    console.warn('NEXT_PUBLIC_API_URL is not defined. API calls may fail.');
}

const getBaseURL = () => {
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
    const isServer = typeof window === 'undefined';
    
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    
    if (isServer && isBuildPhase) {
        return 'http://127.0.0.1:0';
    }
    
    if (isServer) {
        return process.env.BACKEND_INTERNAL_URL || 'http://backend:4000';
    }
    
    if (window.location.hostname.endsWith('180workspace.com')) {
        return 'https://api.180workspace.com';
    }
    
    return window.location.origin;
};

const api = axios.create({
    baseURL: getBaseURL(),
    timeout: 30 * 1000,
});

// Helper to get token from storage or cookies (subdomain sharing)
const getAuthToken = () => {
    if (typeof window === 'undefined') return null;

    // 1. Try localStorage
    const localToken = localStorage.getItem('platform_auth_token');
    if (localToken) return localToken;

    // 2. Try cookie (backup for subdomains)
    const matches = document.cookie.match(/(^| )platform_auth_token=([^;]+)/);
    return matches ? matches[2] : null;
};

// ─── Offline helpers ─────────────────────────────────────────────────────────

const TEMP_ID_IN_PATH = /\/((?:temp|tmp|offline|local)[_-][A-Za-z0-9-]+)(?=\/|$|\?)/i;

/** Only a failed connection is "offline". Timeouts are ambiguous (the server may have applied the write). */
const isConnectionFailure = (error: any) =>
    !error?.response && (error?.code === 'ERR_NETWORK' || String(error?.message || '').includes('Network Error'));

const isUnauthenticatedEndpoint = (url?: string) =>
    !!url && (url.includes('/api/auth/login') || url.includes('/api/auth/refresh') || url.includes('/api/auth/register'));

function syntheticResponse(config: any, data: any, headers: Record<string, string>) {
    return { data, status: 200, statusText: 'OK (offline)', headers, config, request: {} };
}

function notifyServedOffline(url: string, storedAt?: number) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('offline_data_served', { detail: { url, storedAt } }));
}

// Request interceptor: attach latest token; resolve temp ids that have since been synced
api.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const url = config.url || '';
    const tempMatch = url.match(TEMP_ID_IN_PATH);
    if (tempMatch && isTempId(tempMatch[1])) {
        const real = lookupRealIdSync(tempMatch[1]);
        if (real) {
            config.url = url.replace(tempMatch[1], real);
        } else if (classifyForQueue(config.method, url)) {
            // The entity was created offline and its CREATE has not been pushed yet: this edit/delete can only be
            // queued (and merged into the pending create). Never send a temp id to the server.
            config.adapter = () => Promise.reject(new axios.AxiosError('Network Error', 'ERR_NETWORK', config));
        }
    }
    return config;
});

// Response interceptor: reachability + read cache on success; refresh / offline handling on failure
api.interceptors.response.use(
    (response) => {
        reportReachable(true);
        const cfg: any = response.config;
        if (typeof window !== 'undefined' && (cfg?.method || 'get').toLowerCase() === 'get' && isCacheableGet(cfg?.url)) {
            cachePut(cfg.url, cfg.params, response.data).catch(() => {});
            ingestGetResponse(cfg.url, response.data).catch(() => {});
        }
        return response;
    },
    async (error) => {
        const original = error.config;
        if (!original) return Promise.reject(error);
        if (error.response) reportReachable(true);
        else if (isConnectionFailure(error)) reportReachable(false);

        if (
            error.response?.status === 401 &&
            !original._retry &&
            !original.url?.includes('/api/auth/login') &&
            typeof window !== 'undefined'
        ) {
            original._retry = true;
            try {
                const newToken = await singleFlightRefresh();
                updateSocketAuth(newToken);
                original.headers.Authorization = `Bearer ${newToken}`;
                return api(original);
            } catch (refreshError: any) {
                // Only a DEFINITIVE rejection of the refresh token ends the session. If the refresh could not be
                // attempted (offline / server error) the user stays signed in with everything intact and the original
                // 401 is simply rejected. Wiping tokens here used to log people out whenever the refresh call failed
                // for network or server reasons.
                if (!refreshError?.isAuthRejection) {
                    return Promise.reject(error);
                }
                clearAllAuthTokens();

                if (window.location.pathname !== '/login' &&
                    window.location.pathname !== '/signup' &&
                    window.location.pathname !== '/onboarding' &&
                    window.location.pathname !== '/workspace-setup' &&
                    !window.location.pathname.startsWith('/superadmin')) {
                    window.location.href = '/login?clearSession=true';
                }
                return Promise.reject(error);
            }
        }

        if (error.response?.status === 403 && error.response?.data?.error === 'STORAGE_NOT_CONFIGURED') {
            if (typeof window !== 'undefined') {
                toast.error((t: any) => (
                    <div className="flex flex-col gap-2">
                        <span className="font-semibold text-sm">{error.response.data.message || 'Storage Not Configured'}</span>
                        <button 
                            onClick={() => {
                                toast.dismiss(t.id);
                                window.location.href = '/settings/system-configs'; // This is where storage is
                            }}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold w-fit hover:bg-indigo-700 transition-colors"
                        >
                            Configure Storage
                        </button>
                    </div>
                ), { duration: 10000 });
            }
            return Promise.reject(error);
        }

        // ─── Offline handling ────────────────────────────────────────────────────
        // Only when the API is genuinely unreachable (connection failure), never for timeouts or HTTP errors.
        if (typeof window !== 'undefined' && isConnectionFailure(error) && !original.__skipOffline && !isUnauthenticatedEndpoint(original.url)) {
            const method = String(original.method || 'get').toLowerCase();

            // READS: serve what we have. Local task store first (includes offline edits), else the last cached response.
            if (method === 'get' && isCacheableGet(original.url)) {
                try {
                    const path = String(original.url || '').split('?')[0].replace(/^https?:\/\/[^/]+/i, '').replace(/^\/api\/v1\//, '/api/');
                    if (path === '/api/tasks') {
                        const local = await queryTasksLocally(original.params);
                        if (local) {
                            notifyServedOffline(original.url);
                            return syntheticResponse(original, local, { 'x-offline-cache': 'local' });
                        }
                    }
                    const cached = await cacheGet(original.url, original.params);
                    if (cached) {
                        notifyServedOffline(original.url, cached.storedAt);
                        return syntheticResponse(original, cached.data, { 'x-offline-cache': 'http', 'x-offline-cached-at': String(cached.storedAt) });
                    }
                } catch (cacheErr) {
                    console.warn('[API Offline] Read fallback failed:', cacheErr);
                }
                return Promise.reject(error);
            }

            // WRITES: queue only what the sync policy allows; everything else fails honestly.
            if (method === 'post' || method === 'put' || method === 'delete') {
                if (!classifyForQueue(method, original.url)) {
                    toast.error('You are offline. This action needs an internet connection.', { id: 'offline-action-blocked' });
                    window.dispatchEvent(new CustomEvent('offline_action_blocked', { detail: { url: original.url } }));
                    return Promise.reject(error);
                }
                try {
                    const queued = await queueOfflineWrite(method, original.url, original.data, original.__optimistic);
                    if (queued) {
                        toast('Saved on this device. It will sync when you are back online.', { icon: '💾', duration: 4000, id: 'offline-saved' });
                        return syntheticResponse(original, queued.data, { 'x-offline-queued': '1' });
                    }
                } catch (outboxErr: any) {
                    console.error('[API Offline] Could not queue mutation:', outboxErr);
                    const quota = outboxErr?.name === 'QuotaExceededError';
                    toast.error(
                        quota
                            ? 'Not enough storage on this device to save your change offline. Free up space and try again.'
                            : 'Could not save your change offline. It has NOT been saved.',
                        { id: 'offline-save-failed', duration: 8000 }
                    );
                }
            }
        }

        return Promise.reject(error);
    }
);

export default api;

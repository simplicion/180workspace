import axios from 'axios';
import toast from 'react-hot-toast';
import { updateSocketAuth } from './socket';
import { singleFlightRefresh, clearAllAuthTokens } from './auth-refresh';

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

// Request interceptor: attach latest token
api.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Response interceptor: auto-refresh on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
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
            } catch {
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

        // ─── Global Offline-First Write Interceptor ──────────────────────────────
        // If a network connection drop occurs during a write mutation (POST, PUT, PATCH, DELETE),
        // automatically persist the mutation to the Transactional Outbox and save optimistically.
        const method = (original?.method || '').toUpperCase();
        const isWriteMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
        const isOfflineError = !error.response || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error');
        const isAuthEndpoint = original?.url?.includes('/api/auth/login') || original?.url?.includes('/api/auth/refresh');

        if (isOfflineError && isWriteMutation && !isAuthEndpoint && typeof window !== 'undefined') {
            try {
                const { enqueueMutation, saveLocalEntity } = await import('./offline/outbox');
                const { syncEngine } = await import('./offline/sync-engine');

                let parsedPayload = original.data;
                if (typeof parsedPayload === 'string') {
                    try {
                        parsedPayload = JSON.parse(parsedPayload);
                    } catch {}
                }

                const url = original.url || '';
                let entityType: any = 'generic';
                if (url.includes('/tasks')) entityType = 'task';
                else if (url.includes('/users') || url.includes('/employees')) entityType = 'employee';
                else if (url.includes('/projects')) entityType = 'project';
                else if (url.includes('/clients')) entityType = 'client';
                else if (url.includes('/deals')) entityType = 'deal';
                else if (url.includes('/leads')) entityType = 'lead';
                else if (url.includes('/invoices')) entityType = 'invoice';
                else if (url.includes('/expenses') || url.includes('/bills')) entityType = 'expense';
                else if (url.includes('/attendance')) entityType = 'attendance';
                else if (url.includes('/tickets') || url.includes('/support')) entityType = 'ticket';
                else if (url.includes('/posts') || url.includes('/content-calendar')) entityType = 'social_post';
                else if (url.includes('/documents')) entityType = 'document';
                else if (url.includes('/campaigns') || url.includes('/advertising')) entityType = 'campaign';
                else if (url.includes('/links') || url.includes('/traffic-director')) entityType = 'link';

                const entityId = parsedPayload?.id || url.split('/').pop() || `offline_${Date.now()}`;
                const optimisticData = {
                    ...(typeof parsedPayload === 'object' ? parsedPayload : {}),
                    id: entityId,
                    syncStatus: 'pending_sync',
                    localUpdatedAt: Date.now(),
                };

                // 1. Save locally to IndexedDB
                await saveLocalEntity(entityType, entityId, optimisticData, 'pending_sync');

                // 2. Queue mutation to Outbox
                await enqueueMutation({
                    entityType,
                    entityId,
                    action: method === 'POST' ? 'CREATE' : method === 'DELETE' ? 'DELETE' : 'UPDATE',
                    endpoint: url,
                    method: method as any,
                    payload: parsedPayload,
                });

                syncEngine.refreshCount().catch(() => {});

                toast('Saved offline. Will sync automatically when connection returns.', {
                    icon: '💾',
                    duration: 4000,
                });

                // 3. Resolve with optimistic response to prevent component crash
                return Promise.resolve({
                    data: optimisticData,
                    status: 200,
                    statusText: 'OK (Optimistic Offline)',
                    headers: {},
                    config: original,
                });
            } catch (outboxErr) {
                console.error('[API Offline Interceptor] Error queueing mutation:', outboxErr);
            }
        }

        return Promise.reject(error);
    }
);

export default api;

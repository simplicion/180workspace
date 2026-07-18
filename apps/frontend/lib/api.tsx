import axios from 'axios';
import toast from 'react-hot-toast';
import { updateSocketAuth } from './socket';
import { singleFlightRefresh, clearAllAuthTokens } from './auth-refresh';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
    console.warn('NEXT_PUBLIC_API_URL is not defined. API calls may fail.');
}

const getBaseURL = () => {
    // Prevent build-time hangs: if we are in a build phase on the server, 
    // and the target is localhost, return a mock or immediate fail.
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
    const isServer = typeof window === 'undefined';
    
    if (isServer) {
        const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        if (isBuildPhase && rawUrl.includes('localhost')) {
            return 'http://127.0.0.1:0'; // Immediate connection refusal to avoid hang
        }
        return rawUrl;
    }

    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    
    // Detect subdomain: 
    // - On localhost: tenant.localhost -> ["tenant", "localhost"] (len 2)
    // - On prod: tenant.ims.com -> ["tenant", "ims", "com"] (len 3)
    const subdomain = isLocalhost
        ? (parts.length >= 2 && parts[parts.length - 1].split(':')[0] === 'localhost' ? parts[0] : null)
        : (parts.length > 2 ? parts[0] : null);

    // Filter out common system subdomains
    const isSubdomain = !!subdomain && !['www', 'ims', 'api', 'admin', 'app', 'localhost', 'vercel'].includes(subdomain);

    if (isSubdomain) {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        try {
            const url = new URL(apiBase);
            const port = url.port ? `:${url.port}` : '';
            
            // If the base API is localhost, we want subdomain.localhost:port
            // If the base API is e.g. ims-backend.onrender.com, we just use it directly!
            // Most production setups use a single API entry point with x-tenant-id header or JWT
            if (url.hostname === 'localhost') {
                return `${url.protocol}//${subdomain}.localhost${port}`;
            }
            
            // For production, if you have wildcard DNS for the API, use it. 
            // Otherwise, just return apiBase and rely on headers/JWT which are already attached.
            return apiBase;
        } catch (e) {
            return apiBase;
        }
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
};

const api = axios.create({
    baseURL: getBaseURL(),
    timeout: 15 * 1000,
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
                    !window.location.pathname.startsWith('/superadmin')) {
                    window.location.href = '/login?clearSession=true';
                }
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
                                window.location.href = '/dashboard/settings/system-configs'; // This is where storage is
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

        if (error.response?.status === 404 && error.response?.data?.error === 'Your workspace could not be found. Please check your URL or contact support.') {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('platform_auth_token');
                localStorage.removeItem('platform_refresh_token');

                const hostname = window.location.hostname;
                const cookieDomain = hostname.includes('localhost') ? '.localhost' : `.${hostname.split('.').slice(-2).join('.')}`;
                document.cookie = `platform_auth_token=; path=/; max-age=0; Domain=${cookieDomain}`;
                document.cookie = `platform_auth_token=; path=/; max-age=0;`;

                // If on login page, force a reload to clear the auth-context state
                if (window.location.pathname === '/login') {
                    // Only reload if we haven't already added clearSession
                    if (!window.location.search.includes('clearSession=true')) {
                        window.location.href = '/login?clearSession=true';
                    }
                } else if (window.location.pathname !== '/signup' && !window.location.pathname.startsWith('/superadmin')) {
                    window.location.href = '/login?clearSession=true';
                }
            }
            return Promise.reject(error);
        }

        return Promise.reject(error);
    }
);

export default api;

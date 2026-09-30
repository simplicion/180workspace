// Lightweight, robust API client for Traffic Director
export const getApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:4002';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:4002' : 'https://api.180workspace.com';
};

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const lsToken = 
    localStorage.getItem('platform_auth_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token') ||
    localStorage.getItem('accessToken');
  if (lsToken) {
    if (!localStorage.getItem('platform_auth_token')) {
      localStorage.setItem('platform_auth_token', lsToken);
    }
    return lsToken;
  }

  const match = document.cookie.match(/(?:^|;\s*)(?:platform_auth_token|token|auth_token)=([^;]+)/);
  if (match && match[1]) {
    const cookieToken = decodeURIComponent(match[1]);
    try { localStorage.setItem('platform_auth_token', cookieToken); } catch (e) {}
    return cookieToken;
  }

  return null;
};

export const clearAuthTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('platform_auth_token');
  localStorage.removeItem('platform_refresh_token');
  localStorage.removeItem('token');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('accessToken');
  document.cookie = 'platform_auth_token=; path=/; max-age=0;';
  document.cookie = 'token=; path=/; max-age=0;';
  document.cookie = 'auth_token=; path=/; max-age=0;';
};

const handleResponse = async (res: Response) => {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      clearAuthTokens();
      if (window.location.pathname.startsWith('/traffic-director')) {
        window.location.href = '/';
      }
    }
    const error: any = new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return { data };
};

export const api = {
  async get(endpoint: string, options: { params?: Record<string, any>; headers?: Record<string, string> } = {}) {
    const token = getAuthToken();
    let url = `${getApiBase()}${endpoint}`;

    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const res = await fetch(url, { method: 'GET', headers });
    return handleResponse(res);
  },

  async post(endpoint: string, body: any = {}, options: { headers?: Record<string, string> } = {}) {
    const token = getAuthToken();
    const url = `${getApiBase()}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async put(endpoint: string, body: any = {}) {
    const token = getAuthToken();
    const url = `${getApiBase()}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async patch(endpoint: string, body: any = {}) {
    const token = getAuthToken();
    const url = `${getApiBase()}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async delete(endpoint: string, body?: any) {
    const token = getAuthToken();
    const url = `${getApiBase()}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(url, {
      method: 'DELETE',
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return handleResponse(res);
  },
};

export default api;

/**
 * Shared Single-Flight Token Refresh
 * 
 * This module ensures that across ALL HTTP clients (RTK Query baseApi,
 * infrastructure/axios, lib/api), only ONE refresh request is ever in-flight.
 * 
 * Every interceptor calls `singleFlightRefresh()` instead of making its own
 * POST to /api/auth/refresh. The first caller creates the Promise; all
 * subsequent callers receive the same Promise until it settles.
 *
 * Errors thrown here carry `isAuthRejection: true` ONLY when the server definitively rejected the refresh token
 * (or there is none). Callers must not end the session for any other failure (offline, 5xx, 429).
 */

import { readScopeFromToken, readStoredToken } from "./offline/session";

let inflightRefreshPromise = null;

/**
 * Performs a token refresh, guaranteeing at most one network request
 * is in-flight at any time. Returns the new access token on success,
 * or throws on failure.
 * 
 * @returns {Promise<string>} The new access token
 */
export async function singleFlightRefresh() {
    // If a refresh is already in-flight, piggyback on it
    if (inflightRefreshPromise) {
        return inflightRefreshPromise;
    }

    // We are the first caller — create the promise
    inflightRefreshPromise = _doRefresh();

    try {
        const token = await inflightRefreshPromise;
        return token;
    } finally {
        // Clear the promise so the next expiry can trigger a fresh refresh
        inflightRefreshPromise = null;
    }
}

async function _doRefresh() {
    const refreshToken =
        typeof window !== "undefined"
            ? localStorage.getItem("platform_refresh_token")
            : null;

    if (!refreshToken) {
        // The server just told us (401) the access token is invalid and we hold nothing to renew it with.
        const err = new Error("No refresh token available");
        err.isAuthRejection = true;
        throw err;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const response = await fetch(`${apiUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
        const err = new Error(`Refresh failed with status ${response.status}`);
        err.status = response.status;
        // Only a definitive "this refresh token is not valid" ends the session. 5xx / 429 / gateway errors are
        // transient: the user must stay signed in (and keep their offline queue) while the server recovers.
        err.isAuthRejection = response.status === 400 || response.status === 401 || response.status === 403;
        throw err;
    }

    const data = await response.json();

    if (!data.token) {
        throw new Error("Refresh response did not contain a token");
    }

    // Persist the new token centrally
    if (typeof window !== "undefined") {
        localStorage.setItem("platform_auth_token", data.token);
        if (data.refreshToken) {
            localStorage.setItem("platform_refresh_token", data.refreshToken);
        }
        const isProd = window.location.protocol === "https:";
        const is180 = window.location.hostname.endsWith('180workspace.com');
        const domainAttr = is180 ? '; domain=.180workspace.com' : '';
        const cookieFlags = `; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? "; Secure" : ""}${domainAttr}`;
        document.cookie = `platform_auth_token=${data.token}${cookieFlags}`;
    }

    return data.token;
}

/**
 * Clears all auth tokens from localStorage and cookies.
 * Call this on hard logout.
 */
export function clearAllAuthTokens() {
    if (typeof window === "undefined") return;

    // Work out whose cached data to drop BEFORE the token disappears. Cached server data is purged on sign-out so it
    // is not left on disk for the next user of this machine; the user's unsynced outbox is kept (see offline/purge.ts).
    try {
        const scope = readScopeFromToken(readStoredToken());
        if (scope) {
            import("./offline/purge").then((m) => m.purgeSessionData(scope)).catch(() => {});
        }
    } catch {
        /* never block sign-out on cache cleanup */
    }

    localStorage.removeItem("platform_auth_token");
    localStorage.removeItem("platform_refresh_token");
    sessionStorage.removeItem("platform_init_data");

    const hostname = window.location.hostname;
    const is180 = hostname.endsWith('180workspace.com');
    const domainAttr = is180 ? '; domain=.180workspace.com' : '';
    const cookieDomain = hostname.includes("localhost")
        ? ".localhost"
        : `.${hostname.split(".").slice(-2).join(".")}`;

    // Clear platform_auth_token
    document.cookie = `platform_auth_token=; path=/; max-age=0; Domain=${cookieDomain}`;
    document.cookie = `platform_auth_token=; path=/; max-age=0${domainAttr}`;
    document.cookie = `platform_auth_token=; path=/; max-age=0;`;
    document.cookie = `platform_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;

    // Clear NextAuth cookies
    const nextAuthCookieNames = [
        'next-auth.session-token',
        '__Secure-next-auth.session-token',
        'next-auth.callback-url',
        '__Secure-next-auth.callback-url',
        'next-auth.csrf-token',
        '__Host-next-auth.csrf-token'
    ];
    nextAuthCookieNames.forEach(name => {
        document.cookie = `${name}=; path=/; max-age=0; Domain=${cookieDomain}`;
        document.cookie = `${name}=; path=/; max-age=0${domainAttr}`;
        document.cookie = `${name}=; path=/; max-age=0;`;
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    });
}

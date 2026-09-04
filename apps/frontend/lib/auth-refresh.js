/**
 * Shared Single-Flight Token Refresh
 * 
 * This module ensures that across ALL HTTP clients (RTK Query baseApi,
 * infrastructure/axios, lib/api), only ONE refresh request is ever in-flight.
 * 
 * Every interceptor calls `singleFlightRefresh()` instead of making its own
 * POST to /api/auth/refresh. The first caller creates the Promise; all
 * subsequent callers receive the same Promise until it settles.
 */

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
        throw new Error("No refresh token available");
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const response = await fetch(`${apiUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
        throw new Error(`Refresh failed with status ${response.status}`);
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

    localStorage.removeItem("platform_auth_token");
    localStorage.removeItem("platform_refresh_token");

    const hostname = window.location.hostname;
    const is180 = hostname.endsWith('180workspace.com');
    const domainAttr = is180 ? '; domain=.180workspace.com' : '';
    const cookieDomain = hostname.includes("localhost")
        ? ".localhost"
        : `.${hostname.split(".").slice(-2).join(".")}`;
    document.cookie = `platform_auth_token=; path=/; max-age=0; Domain=${cookieDomain}`;
    document.cookie = `platform_auth_token=; path=/; max-age=0${domainAttr}`;
    document.cookie = `platform_auth_token=; path=/; max-age=0;`;
    document.cookie = `platform_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

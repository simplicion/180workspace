import axios from "axios";
import { store } from "@redux/store";
import { logout, restoreAuth } from "@redux/slices/authSlice";
import { singleFlightRefresh, clearAllAuthTokens } from "@/lib/auth-refresh";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor: attach JWT token from Redux-Persist storage (Optional fallback)
axiosInstance.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state.auth.token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor: dispatch logout on expired/invalid token, but ignore /getMe failures for guests
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthCheck = originalRequest?.url?.includes("/api/user/auth/getMe");

    // Match on the canonical `code` field (Wave 1 server envelope).
    const errCode = error.response?.data?.code;
    const errMessage = error.response?.data?.message;
    const isExpired =
      errCode === "TOKEN_EXPIRED" || errMessage === "TOKEN_EXPIRED";

    if (
      error.response?.status === 401 &&
      isExpired &&
      !originalRequest._retry &&
      !isAuthCheck
    ) {
      originalRequest._retry = true;

      try {
        const newToken = await singleFlightRefresh();
        store.dispatch(restoreAuth({ token: newToken }));
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Sign out only if the server definitively rejected the refresh token; a network/5xx failure must not end
        // the session (see lib/auth-refresh.js).
        if (refreshError?.isAuthRejection) store.dispatch(logout());
        return Promise.reject(refreshError);
      }
    } else if (
      error.response?.status === 401 ||
      error.response?.status === 403
    ) {
      if (!isAuthCheck) {
        console.warn(
          "API returned 401/403. URL:",
          originalRequest?.url,
          "Code:",
          errCode,
          "Message:",
          errMessage
        );
        // Prefer the stable `code` (Wave 1 envelope); fall back to substring
        // matching on the human message for any older response paths that
        // haven't been migrated yet.
        const HARD_LOGOUT_CODES = new Set(["INVALID_TOKEN", "NO_TOKEN"]);
        const msg = errMessage || "";
        const shouldLogout =
          (errCode && HARD_LOGOUT_CODES.has(errCode)) ||
          msg.includes("Invalid token") ||
          msg.includes("Session invalid") ||
          msg.includes("Session expired");
        if (shouldLogout) {
          store.dispatch(logout());
        }
      }
    }
    
    // Check for maintenance mode / server down
    if (
      process.env.NODE_ENV === "production" &&
      (error.code === "ERR_NETWORK" ||
      (error.response && [502, 503, 504].includes(error.response.status)))
    ) {
      window.dispatchEvent(new Event("maintenance-mode"));
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;

import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { logout, restoreAuth } from "@redux/slices/authSlice";
import { updateSocketAuth } from "@/lib/socket";
import { singleFlightRefresh } from "@/lib/auth-refresh";
import { RootState } from "../store";

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "",
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    // Get token from auth state
    const state = getState() as RootState;
    let token = state.auth?.token;
    
    // Fallback to localStorage if Redux state is out of sync
    if (!token && typeof window !== "undefined") {
      token = localStorage.getItem("platform_auth_token");
    }

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  // Check for maintenance mode / server down
  if (
    process.env.NODE_ENV === "production" &&
    result.error &&
    (result.error.status === "FETCH_ERROR" ||
     result.error.status === "PARSING_ERROR" ||
     (typeof result.error.status === 'number' && [500, 502, 503, 504].includes(result.error.status)))
  ) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("maintenance-mode"));
    }
  }

  if (result.error && result.error.status === 401) {
    const isRefreshRequest =
      typeof args === "object" &&
      args !== null &&
      (args as FetchArgs).url?.includes("/api/auth/refresh");

    if (isRefreshRequest) {
      return result;
    }

    try {
      const newToken = await singleFlightRefresh();
      api.dispatch(restoreAuth({ token: newToken }));
      updateSocketAuth(newToken);

      // Retry the original query with the new token
      result = await baseQuery(args, api, extraOptions);
    } catch {
      api.dispatch(logout());
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
  tagTypes: [
    "Chat",
    "Message",
    "User",
    "Team",
    "Games",
    "Reel",
    "Community",
    "Booking",
    "Turf",
    "Stories",
    "Scoring",
    "Tournament",
    // Admin-specific tags
    "Admin",
    "Transaction",
    "Dispute",
    "Owner",
    "Professional",
    "Support",
    "Company",
    "CompanyPrivate",
    "CompanyServices",
    "CompanyEvents",
    "PublicEvents",
    "ServiceRequests",
    "Profile",
    "Network",
    "Knowledge",
    "KnowledgeLink",
    "Contracts",
    "Project",
    // New Dashboard specific tags
    "DashboardMetrics",
    "SalesPipeline",
    "Activity",
    "TeamActivity", "advertising", "communications", "crm-and-sales", "finance", "hr-management", "insights", "settings", "workspace-tools", "dashboard", "projects-and-tasks", "social-media-management", "company-hub"
  ],
});

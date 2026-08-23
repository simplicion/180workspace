import { baseApi } from "./baseApi";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query({
      query: () => "/api/v1/crm-and-sales/sales/dashboard",
      providesTags: ["DashboardMetrics"],
    }),
    getLiveActivity: builder.query({
      query: () => "/api/v1/insights/analytics/team-activity",
      providesTags: ["TeamActivity"],
    }),
    getActivityAnalytics: builder.query({
      query: (range: string = "7") => `/api/v1/insights/analytics/activity?range=${range}`,
      providesTags: ["Activity"],
    }),
    getWeeklyTrends: builder.query({
      query: ({ range, grouping }) => `/api/hrms/weekly-trends?range=${range}&grouping=${grouping}`,
      providesTags: ["Activity"],
    }),
    getHrmsDashboardStats: builder.query({
      query: () => `/api/hrms/dashboard`,
      providesTags: ["DashboardMetrics"],
    }),
    getRecentProjects: builder.query({
      query: () => `/api/projects`,
      providesTags: ["Project"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDashboardStatsQuery,
  useGetLiveActivityQuery,
  useGetActivityAnalyticsQuery,
  useGetWeeklyTrendsQuery,
  useGetHrmsDashboardStatsQuery,
  useGetRecentProjectsQuery,
} = dashboardApi;

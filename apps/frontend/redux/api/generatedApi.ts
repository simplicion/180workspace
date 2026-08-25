import { baseApi } from "./baseApi";

export const generatedApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBootstrap: builder.query({
      query: () => '/api/bootstrap',
      providesTags: ['dashboard'],
    }),
    getUserpreferences: builder.query({
      query: () => '/api/user-preferences',
      providesTags: ['dashboard'],
    }),
    postUserpreferencesFavoritesToggle: builder.mutation({
      query: (body) => ({
        url: '/api/user-preferences/favorites/toggle',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['dashboard'],
    }),
    putRolesaccessBulkupdate: builder.mutation({
      query: (body) => ({
        url: '/api/roles-access/bulk-update',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    getWebsites: builder.query({
      query: () => '/api/websites',
      providesTags: ['advertising'],
    }),
    postForms: builder.mutation({
      query: (body) => ({
        url: '/api/forms',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['advertising'],
    }),
    postAiGenerateemaildraft: builder.mutation({
      query: (body) => ({
        url: '/api/ai/generate-email-draft',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['communications'],
    }),
    getUsers: builder.query({
      query: () => '/api/users',
      providesTags: ['workspace-tools'],
    }),
    getClients: builder.query({
      query: () => '/api/clients',
      providesTags: ['workspace-tools'],
    }),
    getChat: builder.query({
      query: () => '/api/chat',
      providesTags: ['communications'],
    }),
    putChatSettings: builder.mutation({
      query: (body) => ({
        url: '/api/chat/settings',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['communications'],
    }),
    getEmailsLogs: builder.query({
      query: () => '/api/emails/logs',
      providesTags: ['communications'],
    }),
    getEmailsStats: builder.query({
      query: () => '/api/emails/stats',
      providesTags: ['communications'],
    }),
    getEmailsTemplates: builder.query({
      query: () => '/api/emails/templates',
      providesTags: ['communications'],
    }),
    postEmailsPreview: builder.mutation({
      query: (body) => ({
        url: '/api/emails/preview',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['communications'],
    }),
    postEmailsSend: builder.mutation({
      query: (body) => ({
        url: '/api/emails/send',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['communications'],
    }),
    postEmailsSendcustom: builder.mutation({
      query: (body) => ({
        url: '/api/emails/send-custom',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['communications'],
    }),
    postEmailsSendbulk: builder.mutation({
      query: (body) => ({
        url: '/api/emails/send-bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['communications'],
    }),
    postMeeting: builder.mutation({
      query: (body) => ({
        url: '/api/meeting',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['communications'],
    }),
    getCompanyprofilePrivateMilestones: builder.query({
      query: () => '/api/company-profile/private/milestones',
      providesTags: ['company-hub'],
    }),
    putCompanyprofile: builder.mutation({
      query: (body) => ({
        url: '/api/company-profile',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['company-hub'],
    }),
    postBrandingLogo: builder.mutation({
      query: (body) => ({
        url: '/api/branding/logo',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postEventsUploadbanner: builder.mutation({
      query: (body) => ({
        url: '/api/events/upload-banner',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['company-hub'],
    }),
    postAiAnalyzedocument: builder.mutation({
      query: (body) => ({
        url: '/api/ai/analyze-document',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['workspace-tools'],
    }),
    getUsersLimit200: builder.query({
      query: () => '/api/usersLimit200',
      providesTags: ['workspace-tools'],
    }),
    postEmailSenddocument: builder.mutation({
      query: (body) => ({
        url: '/api/email/send-document',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['workspace-tools'],
    }),
    postFilesUpload: builder.mutation({
      query: (body) => ({
        url: '/api/files/upload',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['advertising'],
    }),
    getSalesAccounts: builder.query({
      query: () => '/api/sales/accounts',
      providesTags: ['dashboard'],
    }),
    getSalesLeadspipeline: builder.query({
      query: () => '/api/sales/leads-pipeline',
      providesTags: ['workspace-tools'],
    }),
    postSalesContacts: builder.mutation({
      query: (body) => ({
        url: '/api/sales/contacts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['dashboard'],
    }),
    getAiInsights: builder.query({
      query: () => '/api/ai/insights',
      providesTags: ['dashboard'],
    }),
    getAiDashboard: builder.query({
      query: () => '/api/ai/dashboard',
      providesTags: ['dashboard'],
    }),
    getProjectsLimit5: builder.query({
      query: () => '/api/projectsLimit5',
      providesTags: ['dashboard'],
    }),
    getEmployeeDashboard: builder.query({
      query: () => '/api/employee/dashboard',
      providesTags: ['hr-management'],
    }),
    postAttendanceAutocheckin: builder.mutation({
      query: (body) => ({
        url: '/api/attendance/auto-checkin',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['hr-management'],
    }),
    postAttendanceAutocheckout: builder.mutation({
      query: (body) => ({
        url: '/api/attendance/auto-checkout',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['hr-management'],
    }),
    getHrmsCeoinsights: builder.query({
      query: () => '/api/hrms/ceo-insights',
      providesTags: ['dashboard'],
    }),
    getGoals: builder.query({
      query: () => '/api/goals',
      providesTags: ['insights'],
    }),
    getV1CrmandsalesSalesActivity: builder.query({
      query: () => '/api/v1/crm-and-sales/sales/activity',
      providesTags: ['dashboard'],
    }),
    getLeavesStatusPending: builder.query({
      query: () => '/api/leavesStatusPending',
      providesTags: ['dashboard'],
    }),
    getLeavesStatusApproved: builder.query({
      query: () => '/api/leavesStatusApproved',
      providesTags: ['dashboard'],
    }),
    getExpensesStatusPending: builder.query({
      query: () => '/api/expensesStatusPending',
      providesTags: ['dashboard'],
    }),
    getBillingPlans: builder.query({
      query: () => '/api/billing/plans',
      providesTags: ['finance'],
    }),
    getBillingHistory: builder.query({
      query: () => '/api/billing/history',
      providesTags: ['finance'],
    }),
    postBillingAutopayCancel: builder.mutation({
      query: (body) => ({
        url: '/api/billing/autopay/cancel',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['finance'],
    }),
    getExpenses: builder.query({
      query: () => '/api/expenses',
      providesTags: ['projects-and-tasks'],
    }),
    getVendors: builder.query({
      query: () => '/api/vendors',
      providesTags: ['finance'],
    }),
    getProjects: builder.query({
      query: () => '/api/projects',
      providesTags: ['settings'],
    }),
    getFinanceDashboardstats: builder.query({
      query: () => '/api/finance/dashboard-stats',
      providesTags: ['finance'],
    }),
    getFinanceTransactions: builder.query({
      query: () => '/api/finance/transactions',
      providesTags: ['finance'],
    }),
    getInvoices: builder.query({
      query: () => '/api/invoices',
      providesTags: ['projects-and-tasks'],
    }),
    postUserpreferencesRecent: builder.mutation({
      query: (body) => ({
        url: '/api/user-preferences/recent',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    getSalary: builder.query({
      query: () => '/api/salary',
      providesTags: ['hr-management'],
    }),
    postFinanceVerifybank: builder.mutation({
      query: (body) => ({
        url: '/api/finance/verify-bank',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postTransactions: builder.mutation({
      query: (body) => ({
        url: '/api/transactions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['finance'],
    }),
    getTransactionsKpis: builder.query({
      query: () => '/api/transactions/kpis',
      providesTags: ['finance'],
    }),
    postAuthRegisteruser: builder.mutation({
      query: (body) => ({
        url: '/api/auth/register-user',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['hr-management'],
    }),
    getSalaryPreview: builder.query({
      query: () => '/api/salary/preview',
      providesTags: ['hr-management'],
    }),
    postSalaryGenerate: builder.mutation({
      query: (body) => ({
        url: '/api/salary/generate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['hr-management'],
    }),
    getHolidays: builder.query({
      query: () => '/api/holidays',
      providesTags: ['hr-management'],
    }),
    getLeaves: builder.query({
      query: () => '/api/leaves',
      providesTags: ['insights'],
    }),
    getAuthMe: builder.query({
      query: () => '/api/auth/me',
      providesTags: ['hr-management'],
    }),
    postAttendanceMark: builder.mutation({
      query: (body) => ({
        url: '/api/attendance/mark',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['hr-management'],
    }),
    getJobs: builder.query({
      query: () => '/api/jobs',
      providesTags: ['hr-management'],
    }),
    putSettingsCompany: builder.mutation({
      query: (body) => ({
        url: '/api/settings/company',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['hr-management'],
    }),
    getAttendance: builder.query({
      query: () => '/api/attendance',
      providesTags: ['hr-management'],
    }),
    getHrmsAttendancetrend: builder.query({
      query: () => '/api/hrms/attendance-trend',
      providesTags: ['hr-management'],
    }),
    getPublicApikey: builder.query({
      query: () => '/api/public/api-key',
      providesTags: ['hr-management'],
    }),
    putSettings: builder.mutation({
      query: (body) => ({
        url: '/api/settings',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postPublicApikeyGenerate: builder.mutation({
      query: (body) => ({
        url: '/api/public/api-key/generate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['hr-management'],
    }),
    getReviewsPerformanceinsights: builder.query({
      query: () => '/api/reviews/performance-insights',
      providesTags: ['hr-management'],
    }),
    getReviews: builder.query({
      query: () => '/api/reviews',
      providesTags: ['hr-management'],
    }),
    getHrmsDashboard: builder.query({
      query: () => '/api/hrms/dashboard',
      providesTags: ['insights'],
    }),
    getTasks: builder.query({
      query: () => '/api/tasks',
      providesTags: ['hr-management'],
    }),
    getAnalyticsFinancialStats: builder.query({
      query: () => '/api/analytics/financial/stats',
      providesTags: ['insights'],
    }),
    getAnalyticsFinancialProjects: builder.query({
      query: () => '/api/analytics/financial/projects',
      providesTags: ['insights'],
    }),
    getAttendanceMonthlyreport: builder.query({
      query: () => '/api/attendance/monthly-report',
      providesTags: ['insights'],
    }),
    getAssets: builder.query({
      query: () => '/api/assets',
      providesTags: ['workspace-tools'],
    }),
    postModules: builder.mutation({
      query: (body) => ({
        url: '/api/modules',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['projects-and-tasks'],
    }),
    postFilesUploadvoice: builder.mutation({
      query: (body) => ({
        url: '/api/files/upload-voice',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['projects-and-tasks'],
    }),
    getActivity: builder.query({
      query: () => '/api/activity',
      providesTags: ['projects-and-tasks'],
    }),
    getAudit: builder.query({
      query: () => '/api/audit',
      providesTags: ['projects-and-tasks'],
    }),
    postSalesActivities: builder.mutation({
      query: (body) => ({
        url: '/api/sales/activities',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['projects-and-tasks'],
    }),
    getWorklogs: builder.query({
      query: () => '/api/work-logs',
      providesTags: ['projects-and-tasks'],
    }),
    getWorklogsStats: builder.query({
      query: () => '/api/work-logs/stats',
      providesTags: ['projects-and-tasks'],
    }),
    postSettingsTestai: builder.mutation({
      query: (body) => ({
        url: '/api/settings/test-ai',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    getSettingsMigrationstatus: builder.query({
      query: () => '/api/settings/migration-status',
      providesTags: ['settings'],
    }),
    postSettingsMigratedb: builder.mutation({
      query: (body) => ({
        url: '/api/settings/migrate-db',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postSettingsTestdb: builder.mutation({
      query: (body) => ({
        url: '/api/settings/test-db',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postSettingsCleardata: builder.mutation({
      query: (body) => ({
        url: '/api/settings/clear-data',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postSettingsTestemail: builder.mutation({
      query: (body) => ({
        url: '/api/settings/test-email',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postFinanceConfig: builder.mutation({
      query: (body) => ({
        url: '/api/finance/config',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    putCompanyconfig: builder.mutation({
      query: (body) => ({
        url: '/api/company-config',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postFinanceTriggerreminders: builder.mutation({
      query: (body) => ({
        url: '/api/finance/trigger-reminders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postIntegrationsGoogleFolders: builder.mutation({
      query: (body) => ({
        url: '/api/integrations/google/folders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postIntegrationsGoogleDisconnect: builder.mutation({
      query: (body) => ({
        url: '/api/integrations/google/disconnect',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postIntegrationsGoogleCallback: builder.mutation({
      query: (body) => ({
        url: '/api/integrations/google/callback',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postAnalyticsPlausibleTest: builder.mutation({
      query: (body) => ({
        url: '/api/analytics/plausible/test',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postSettingsTeststorage: builder.mutation({
      query: (body) => ({
        url: '/api/settings/test-storage',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postSocialmediaSavedbanks: builder.mutation({
      query: (body) => ({
        url: '/api/social-media/saved-banks',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['social-media-management'],
    }),
    postSocialmediaAssets: builder.mutation({
      query: (body) => ({
        url: '/api/social-media/assets',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['social-media-management'],
    }),
    getSalesQuotes: builder.query({
      query: () => '/api/sales/quotes',
      providesTags: ['workspace-tools'],
    }),
    get180documentsFilesCategoryTemplate: builder.query({
      query: () => '/api/v1/workspace-tools/documents/filesCategoryTemplate',
      providesTags: ['workspace-tools'],
    }),
    getAiSessions: builder.query({
      query: () => '/api/ai/sessions',
      providesTags: ['workspace-tools'],
    }),
    postAiUpload: builder.mutation({
      query: (body) => ({
        url: '/api/ai/upload',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['workspace-tools'],
    }),
    getAssetsStats: builder.query({
      query: () => '/api/assets/stats',
      providesTags: ['workspace-tools'],
    }),
    getCalendar: builder.query({
      query: () => '/api/calendar',
      providesTags: ['workspace-tools'],
    }),
    post180documentsFiles: builder.mutation({
      query: (body) => ({
        url: '/api/v1/workspace-tools/documents/files',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['workspace-tools'],
    }),
    getFiles: builder.query({
      query: () => '/api/files',
      providesTags: ['projects-and-tasks'],
    }),
    patchCompanyProfile: builder.mutation({
      query: (body) => ({
        url: '/api/company/profile',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['advertising'],
    }),
    postMeetingLogJoin: builder.mutation({
      query: (body) => ({
        url: '/api/meeting/log/join',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['communications'],
    }),
    postMeetingLogLeave: builder.mutation({
      query: (body) => ({
        url: '/api/meeting/log/leave',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['communications'],
    }),
    postMeetingTranscript: builder.mutation({
      query: (body) => ({
        url: '/api/meeting/transcript',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['communications'],
    }),
    postMeetingAichat: builder.mutation({
      query: (body) => ({
        url: '/api/meeting/ai-chat',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['communications'],
    }),
    postMeetingAiProcess: builder.mutation({
      query: (body) => ({
        url: '/api/meeting/ai/process',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['communications'],
    }),
    getSalesDeals: builder.query({
      query: () => '/api/sales/deals',
      providesTags: ['crm-and-sales'],
    }),
    postSalesDealsImport: builder.mutation({
      query: (body) => ({
        url: '/api/sales/deals/import',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['crm-and-sales'],
    }),
    getSalesLeadspipelinePipelineTypeDEAL: builder.query({
      query: () => '/api/sales/leads-pipelinePipelineTypeDEAL',
      providesTags: ['crm-and-sales'],
    }),
    getSalesProductivity: builder.query({
      query: () => '/api/sales/productivity',
      providesTags: ['crm-and-sales'],
    }),
    postBillingCoupon: builder.mutation({
      query: (body) => ({
        url: '/api/billing/coupon',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['finance'],
    }),
    postBillingActivate: builder.mutation({
      query: (body) => ({
        url: '/api/billing/activate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['finance'],
    }),
    postBillingMandateInitiate: builder.mutation({
      query: (body) => ({
        url: '/api/billing/mandate/initiate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['finance'],
    }),
    postBillingMandateVerify: builder.mutation({
      query: (body) => ({
        url: '/api/billing/mandate/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['finance'],
    }),
    getAttendanceReport: builder.query({
      query: () => '/api/attendance/report',
      providesTags: ['hr-management'],
    }),
    getAnalyticsPlausible: builder.query({
      query: () => '/api/analytics/plausible',
      providesTags: ['insights'],
    }),
    putAuthChangepassword: builder.mutation({
      query: (body) => ({
        url: '/api/auth/change-password',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    postApikeyGenerate: builder.mutation({
      query: (body) => ({
        url: '/api/apikey/generate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['settings'],
    }),
    getRolesaccessMatrix: builder.query({
      query: () => '/api/roles-access/matrix',
      providesTags: ['settings'],
    }),
    postFilesUploadvideo: builder.mutation({
      query: (body) => ({
        url: '/api/files/upload-video',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['advertising'],
    }),
    patchCompanyconfigModules: builder.mutation({
      query: (body) => ({
        url: '/api/company-config/modules',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['settings'],
    }),

  }),
  overrideExisting: false,
});

export const {
  useGetBootstrapQuery,
  useGetUserpreferencesQuery,
  usePostUserpreferencesFavoritesToggleMutation,
  usePutRolesaccessBulkupdateMutation,
  useGetWebsitesQuery,
  usePostFormsMutation,
  usePostAiGenerateemaildraftMutation,
  useGetUsersQuery,
  useGetClientsQuery,
  useGetChatQuery,
  usePutChatSettingsMutation,
  useGetEmailsLogsQuery,
  useGetEmailsStatsQuery,
  useGetEmailsTemplatesQuery,
  usePostEmailsPreviewMutation,
  usePostEmailsSendMutation,
  usePostEmailsSendcustomMutation,
  usePostEmailsSendbulkMutation,
  usePostMeetingMutation,
  useGetCompanyprofilePrivateMilestonesQuery,
  usePutCompanyprofileMutation,
  usePostBrandingLogoMutation,
  usePostEventsUploadbannerMutation,
  usePostAiAnalyzedocumentMutation,
  useGetUsersLimit200Query,
  usePostEmailSenddocumentMutation,
  usePostFilesUploadMutation,
  useGetSalesAccountsQuery,
  useGetSalesLeadspipelineQuery,
  usePostSalesContactsMutation,
  useGetAiInsightsQuery,
  useGetAiDashboardQuery,
  useGetProjectsLimit5Query,
  useGetEmployeeDashboardQuery,
  usePostAttendanceAutocheckinMutation,
  usePostAttendanceAutocheckoutMutation,
  useGetHrmsCeoinsightsQuery,
  useGetGoalsQuery,
  useGetV1CrmandsalesSalesActivityQuery,
  useGetLeavesStatusPendingQuery,
  useGetLeavesStatusApprovedQuery,
  useGetExpensesStatusPendingQuery,
  useGetBillingPlansQuery,
  useGetBillingHistoryQuery,
  usePostBillingAutopayCancelMutation,
  useGetExpensesQuery,
  useGetVendorsQuery,
  useGetProjectsQuery,
  useGetFinanceDashboardstatsQuery,
  useGetFinanceTransactionsQuery,
  useGetInvoicesQuery,
  usePostUserpreferencesRecentMutation,
  useGetSalaryQuery,
  usePostFinanceVerifybankMutation,
  usePostTransactionsMutation,
  useGetTransactionsKpisQuery,
  usePostAuthRegisteruserMutation,
  useGetSalaryPreviewQuery,
  usePostSalaryGenerateMutation,
  useGetHolidaysQuery,
  useGetLeavesQuery,
  useGetAuthMeQuery,
  usePostAttendanceMarkMutation,
  useGetJobsQuery,
  usePutSettingsCompanyMutation,
  useGetAttendanceQuery,
  useGetHrmsAttendancetrendQuery,
  useGetPublicApikeyQuery,
  usePutSettingsMutation,
  usePostPublicApikeyGenerateMutation,
  useGetReviewsPerformanceinsightsQuery,
  useGetReviewsQuery,
  useGetHrmsDashboardQuery,
  useGetTasksQuery,
  useGetAnalyticsFinancialStatsQuery,
  useGetAnalyticsFinancialProjectsQuery,
  useGetAttendanceMonthlyreportQuery,
  useGetAssetsQuery,
  usePostModulesMutation,
  usePostFilesUploadvoiceMutation,
  useGetActivityQuery,
  useGetAuditQuery,
  usePostSalesActivitiesMutation,
  useGetWorklogsQuery,
  useGetWorklogsStatsQuery,
  usePostSettingsTestaiMutation,
  useGetSettingsMigrationstatusQuery,
  usePostSettingsMigratedbMutation,
  usePostSettingsTestdbMutation,
  usePostSettingsCleardataMutation,
  usePostSettingsTestemailMutation,
  usePostFinanceConfigMutation,
  usePutCompanyconfigMutation,
  usePostFinanceTriggerremindersMutation,
  usePostIntegrationsGoogleFoldersMutation,
  usePostIntegrationsGoogleDisconnectMutation,
  usePostIntegrationsGoogleCallbackMutation,
  usePostAnalyticsPlausibleTestMutation,
  usePostSettingsTeststorageMutation,
  usePostSocialmediaSavedbanksMutation,
  usePostSocialmediaAssetsMutation,
  useGetSalesQuotesQuery,
  useGet180documentsFilesCategoryTemplateQuery,
  useGetAiSessionsQuery,
  usePostAiUploadMutation,
  useGetAssetsStatsQuery,
  useGetCalendarQuery,
  usePost180documentsFilesMutation,
  useGetFilesQuery,
  usePatchCompanyProfileMutation,
  usePostMeetingLogJoinMutation,
  usePostMeetingLogLeaveMutation,
  usePostMeetingTranscriptMutation,
  usePostMeetingAichatMutation,
  usePostMeetingAiProcessMutation,

  usePostSalesDealsImportMutation,
  useGetSalesLeadspipelinePipelineTypeDEALQuery,
  useGetSalesProductivityQuery,
  usePostBillingCouponMutation,
  usePostBillingActivateMutation,
  usePostBillingMandateInitiateMutation,
  usePostBillingMandateVerifyMutation,
  useGetAttendanceReportQuery,
  useGetAnalyticsPlausibleQuery,
  usePutAuthChangepasswordMutation,
  usePostApikeyGenerateMutation,
  useGetRolesaccessMatrixQuery,
  usePostFilesUploadvideoMutation,


} = generatedApi;

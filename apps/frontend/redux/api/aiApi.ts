import { baseApi } from './baseApi';

export const aiApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAIStatus: builder.query<{ success: boolean; isConfigured: boolean; provider: string; model: string; status: string }, void>({
            query: () => '/api/v1/ai/status',
            providesTags: ['settings']
        }),
        getAIDashboardInsights: builder.query<{ success: boolean; insights: any }, void>({
            query: () => '/api/v1/ai/analytics/dashboard',
            providesTags: ['insights', 'DashboardMetrics']
        }),
        getAIChatSessions: builder.query<any[], void>({
            query: () => '/api/v1/ai/sessions',
            providesTags: ['settings']
        }),
        getAIChatSession: builder.query<any, string>({
            query: (id) => `/api/v1/ai/sessions/${id}`
        }),
        deleteAIChatSession: builder.mutation<any, string>({
            query: (id) => ({
                url: `/api/v1/ai/sessions/${id}`,
                method: 'DELETE'
            }),
            invalidatesTags: ['settings']
        }),
        testAIConnection: builder.mutation<any, { provider: string; apiKey: string; customUrl?: string; customModel?: string }>({
            query: (body) => ({
                url: '/api/v1/ai/test-connection',
                method: 'POST',
                body
            }),
            invalidatesTags: ['settings']
        }),
        sendAIChat: builder.mutation<any, { message?: string; prompt?: string; mode?: string; sessionId?: string; isLegalMode?: boolean; fileContext?: string; history?: any[] }>({
            query: (body) => ({
                url: '/api/v1/ai/chat',
                method: 'POST',
                body
            }),
            invalidatesTags: ['settings']
        }),
        executeAIAgent: builder.mutation<any, { prompt: string; sessionId?: string }>({
            query: (body) => ({
                url: '/api/v1/ai/agent/execute',
                method: 'POST',
                body
            })
        }),
        generateAIDocument: builder.mutation<any, { prompt: string; documentType?: string; clientId?: string; employeeId?: string; existingBlocks?: any[]; sessionId?: string }>({
            query: (body) => ({
                url: '/api/v1/ai/documents/generate',
                method: 'POST',
                body
            }),
            invalidatesTags: ['workspace-tools', 'Contracts']
        }),
        analyzeAIDocument: builder.mutation<any, { fileText?: string; fileName?: string; query?: string; documentId?: string; message?: string }>({
            query: (body) => ({
                url: '/api/v1/ai/documents/chat-file',
                method: 'POST',
                body
            })
        }),
        generateAIEmailDraft: builder.mutation<any, { recipientName?: string; recipientEmail?: string; purpose?: string; dealValue?: string; idea?: string; tone?: string; context?: string }>({
            query: (body) => ({
                url: '/api/v1/ai/crm/email-draft',
                method: 'POST',
                body
            }),
            invalidatesTags: ['crm-and-sales']
        }),
        generateAIContentCalendar: builder.mutation<any, any>({
            query: (body) => ({
                url: '/api/v1/ai/content/calendar',
                method: 'POST',
                body
            })
        }),
        processAIMeetingTranscript: builder.mutation<any, { transcript?: string; title?: string; bodyText?: string }>({
            query: (body) => ({
                url: '/api/v1/ai/meetings/process',
                method: 'POST',
                body
            })
        }),
        searchAIEntities: builder.query<any[], { type: string; q: string }>({
            query: ({ type, q }) => `/api/v1/ai/search-entities?type=${type}&q=${encodeURIComponent(q)}`
        })
    }),
    overrideExisting: false
});

export const {
    useGetAIStatusQuery,
    useGetAIDashboardInsightsQuery,
    useGetAIChatSessionsQuery,
    useGetAIChatSessionQuery,
    useDeleteAIChatSessionMutation,
    useTestAIConnectionMutation,
    useSendAIChatMutation,
    useExecuteAIAgentMutation,
    useGenerateAIDocumentMutation,
    useAnalyzeAIDocumentMutation,
    useGenerateAIEmailDraftMutation,
    useGenerateAIContentCalendarMutation,
    useProcessAIMeetingTranscriptMutation,
    useSearchAIEntitiesQuery
} = aiApi;

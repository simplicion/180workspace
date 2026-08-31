import { baseApi } from './baseApi';

export const knowledgeApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        get180Documents: builder.query({
            query: (params) => ({
                url: '/api/v1/workspace-tools/documents',
                method: 'GET',
                params
            }),
            providesTags: ['Knowledge']
        }),
        getArticles: builder.query({
            query: (params) => ({
                url: '/api/v1/workspace-tools/documents',
                method: 'GET',
                params
            }),
            providesTags: ['Knowledge']
        }),
        getArticleById: builder.query({
            query: (id) => ({
                url: `/api/v1/workspace-tools/documents/${id}`,
                method: 'GET',
            }),
            providesTags: (result, error, id) => [{ type: 'Knowledge', id }]
        }),
        createArticle: builder.mutation({
            query: (data) => ({
                url: '/api/v1/workspace-tools/documents',
                method: 'POST',
                body: data
            }),
            invalidatesTags: ['Knowledge']
        }),
        updateArticle: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/api/v1/workspace-tools/documents/${id}`,
                method: 'PUT',
                body: data
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Knowledge', id }, 'Knowledge']
        }),
        deleteArticle: builder.mutation({
            query: (id) => ({
                url: `/api/v1/workspace-tools/documents/${id}`,
                method: 'DELETE'
            }),
            invalidatesTags: ['Knowledge']
        }),
        approveDocument: builder.mutation({
            query: (id) => ({
                url: `/api/v1/workspace-tools/documents/${id}/approve`,
                method: 'POST'
            }),
            invalidatesTags: ['Knowledge', 'Finance', 'CRM']
        }),
        recordPayment: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/api/v1/workspace-tools/documents/${id}/record-payment`,
                method: 'POST',
                body: data
            }),
            invalidatesTags: ['Knowledge', 'Finance', 'CRM']
        }),
        sendPaymentReminder: builder.mutation({
            query: (id) => ({
                url: `/api/v1/workspace-tools/documents/${id}/remind`,
                method: 'POST'
            }),
            invalidatesTags: ['Knowledge']
        }),
        convertToInvoice: builder.mutation({
            query: (id) => ({
                url: `/api/v1/workspace-tools/documents/${id}/convert-to-invoice`,
                method: 'POST'
            }),
            invalidatesTags: ['Knowledge', 'Finance']
        }),
        generateShareLink: builder.mutation({
            query: (id) => ({
                url: `/api/v1/workspace-tools/documents/${id}/share`,
                method: 'POST'
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Knowledge', id }]
        }),
        lockArticle: builder.mutation({
            query: (id) => ({
                url: `/api/v1/workspace-tools/documents/${id}/lock`,
                method: 'POST'
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Knowledge', id }]
        }),
        unlockArticle: builder.mutation({
            query: (id) => ({
                url: `/api/v1/workspace-tools/documents/${id}/unlock`,
                method: 'POST'
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Knowledge', id }]
        }),
        getLinksForEntity: builder.query({
            query: ({ relatedModel, relatedId }) => ({
                url: `/api/v1/workspace-tools/documents/links/entity`,
                method: 'GET',
                params: { relatedModel, relatedId }
            }),
            providesTags: (result, error, { relatedModel, relatedId }) => [{ type: 'KnowledgeLink', id: `${relatedModel}-${relatedId}` }]
        }),
        createLink: builder.mutation({
            query: ({ articleId, relatedModel, relatedId }) => ({
                url: `/api/v1/workspace-tools/documents/${articleId}/links`,
                method: 'POST',
                body: { relatedModel, relatedId }
            }),
            invalidatesTags: (result, error, { relatedModel, relatedId }) => [{ type: 'KnowledgeLink', id: `${relatedModel}-${relatedId}` }]
        })
    })
});

export const {
    useGet180DocumentsQuery,
    useGetArticlesQuery,
    useGetArticleByIdQuery,
    useCreateArticleMutation,
    useUpdateArticleMutation,
    useDeleteArticleMutation,
    useApproveDocumentMutation,
    useRecordPaymentMutation,
    useSendPaymentReminderMutation,
    useConvertToInvoiceMutation,
    useGenerateShareLinkMutation,
    useLockArticleMutation,
    useUnlockArticleMutation,
    useGetLinksForEntityQuery,
    useCreateLinkMutation
} = knowledgeApi;

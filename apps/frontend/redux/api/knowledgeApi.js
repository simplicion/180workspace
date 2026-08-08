import { baseApi } from './baseApi';

export const knowledgeApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        get180Documents: builder.query({
            query: (params) => ({
                url: '/180documents',
                method: 'GET',
                params
            }),
            providesTags: ['Knowledge']
        }),
        getArticles: builder.query({
            query: (params) => ({
                url: '/knowledge',
                method: 'GET',
                params
            }),
            providesTags: ['Knowledge']
        }),
        getArticleById: builder.query({
            query: (id) => ({
                url: `/knowledge/${id}`,
                method: 'GET',
            }),
            providesTags: (result, error, id) => [{ type: 'Knowledge', id }]
        }),
        createArticle: builder.mutation({
            query: (data) => ({
                url: '/knowledge',
                method: 'POST',
                body: data
            }),
            invalidatesTags: ['Knowledge']
        }),
        updateArticle: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/knowledge/${id}`,
                method: 'PUT',
                body: data
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Knowledge', id }, 'Knowledge']
        }),
        deleteArticle: builder.mutation({
            query: (id) => ({
                url: `/knowledge/${id}`,
                method: 'DELETE'
            }),
            invalidatesTags: ['Knowledge']
        }),
        lockArticle: builder.mutation({
            query: (id) => ({
                url: `/knowledge/${id}/lock`,
                method: 'POST'
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Knowledge', id }]
        }),
        unlockArticle: builder.mutation({
            query: (id) => ({
                url: `/knowledge/${id}/unlock`,
                method: 'POST'
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Knowledge', id }]
        }),
        getLinksForEntity: builder.query({
            query: ({ relatedModel, relatedId }) => ({
                url: `/knowledge/links/entity`,
                method: 'GET',
                params: { relatedModel, relatedId }
            }),
            providesTags: (result, error, { relatedModel, relatedId }) => [{ type: 'KnowledgeLink', id: `${relatedModel}-${relatedId}` }]
        }),
        createLink: builder.mutation({
            query: ({ articleId, relatedModel, relatedId }) => ({
                url: `/knowledge/${articleId}/links`,
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
    useLockArticleMutation,
    useUnlockArticleMutation,
    useGetLinksForEntityQuery,
    useCreateLinkMutation
} = knowledgeApi;

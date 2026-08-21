import { baseApi } from './baseApi';

export const communityApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Get all forum posts
        getPosts: builder.query({
            query: (params) => ({
                url: '/api/community/posts',
                params
            }),
            providesTags: ['Community'],
        }),

        // Get single post
        getPostById: builder.query({
            query: (id) => `/api/community/posts/${id}`,
            providesTags: (result, error, id) => [{ type: 'Community', id }],
        }),

        // Create new post
        createPost: builder.mutation({
            query: (data) => ({
                url: '/api/community/posts',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Community'],
        }),

        // Reply to post
        replyToPost: builder.mutation({
            query: ({ postId, content }) => ({
                url: `/api/community/posts/${postId}/replies`,
                method: 'POST',
                body: { content },
            }),
            invalidatesTags: (result, error, { postId }) => [{ type: 'Community', id: postId }, 'Community'],
        }),

        // Toggle Like
        toggleLike: builder.mutation({
            query: (postId) => ({
                url: `/api/community/posts/${postId}/like`,
                method: 'POST',
            }),
            // Optimistic update could go here, for now invalidate
            invalidatesTags: (result, error, postId) => [{ type: 'Community', id: postId }, 'Community'],
        }),

        // Get Trending Hashtags
        getHashtags: builder.query({
            query: () => '/api/community/hashtags',
        }),
    }),
});

export const {
    useGetPostsQuery,
    useGetPostByIdQuery,
    useCreatePostMutation,
    useReplyToPostMutation,
    useToggleLikeMutation,
    useGetHashtagsQuery
} = communityApi;

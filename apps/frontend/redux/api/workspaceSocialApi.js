import { baseApi } from "./baseApi";

export const workspaceSocialApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCommunityFeed: builder.query({
      query: (params) => ({
        url: "/api/user/community",
        params,
      }),
      providesTags: ["Community"],
    }),
    getForumPosts: builder.query({
      query: (params) => ({
        url: "/api/community/posts",
        params,
      }),
      providesTags: ["Community"],
    }),
    createForumPost: builder.mutation({
      query: (body) => ({
        url: "/api/community/posts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Community"],
    }),
    getPostById: builder.query({
      query: (postId) => `/api/community/posts/${postId}`,
      providesTags: (result, error, id) => [{ type: "Community", id }],
    }),
    getStoriesFeed: builder.query({
      query: (params) => ({
        url: "/api/user/stories/feed",
        params,
      }),
      providesTags: ["Stories"],
    }),
    getUserPosts: builder.query({
      query: (userId) => `/api/user/community/user-posts/${userId}`,
      providesTags: ["Community"],
    }),
    getSavedPosts: builder.query({
      query: () => "/api/community/saved",
      providesTags: ["Community"],
    }),
    getCommunityStats: builder.query({
      query: () => "/api/user/community/stats",
      providesTags: ["Community"],
    }),
    createPost: builder.mutation({
      query: (formData) => ({
        url: "/api/user/community",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Community"],
    }),
    updatePost: builder.mutation({
      query: ({ postId, formData }) => ({
        url: `/api/user/community/${postId}`,
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: ["Community"],
    }),
    deletePost: builder.mutation({
      query: (postId) => ({
        url: `/api/community/posts/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Community"],
    }),
    reportPost: builder.mutation({
      query: ({ postId, reason }) => ({
        url: `/api/community/posts/${postId}/report`,
        method: "POST",
        body: { reason },
      }),
    }),
    votePollOption: builder.mutation({
      query: ({ postId, optionId }) => ({
        url: `/api/community/posts/${postId}/poll/${optionId}/vote`,
        method: "POST",
      }),
      invalidatesTags: ["Community"],
    }),
    likePost: builder.mutation({
      query: (postId) => ({
        url: `/api/community/posts/${postId}/like`,
        method: "POST",
      }),
      async onQueryStarted(postId, { dispatch, queryFulfilled }) {
        // Optimistic update for likes
        const patchResult = dispatch(
          workspaceSocialApi.util.updateQueryData(
            "getCommunityFeed",
            undefined,
            (draft) => {
              const post = draft.posts.find((p) => p._id === postId);
              // This is a simplified optimistic update; real implementation depends on user state
              if (post) {
                // We don't have the user ID easily here without extra logic,
                // but we can increment length as a placeholder or wait for response.
                // For now, let's wait for queryFulfilled for likes as it's more complex (add/remove).
              }
            }
          )
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ["Community"],
    }),
    addPostComment: builder.mutation({
      query: ({ postId, content }) => ({
        url: `/api/community/posts/${postId}/replies`,
        method: "POST",
        body: { content },
      }),
      invalidatesTags: ["Community"],
    }),
    savePost: builder.mutation({
      query: (postId) => ({
        url: `/api/community/posts/${postId}/save`,
        method: "POST",
      }),
      invalidatesTags: ["Community"],
    }),
    getPostLikes: builder.query({
      query: (postId) => `/api/community/posts/${postId}/likes`,
      providesTags: ["Community"],
    }),
    getPostReplies: builder.query({
      query: (postId) => `/api/community/posts/${postId}/replies`,
      providesTags: ["Community"],
    }),
    getUserProfileStats: builder.query({
      query: (userId) => `/api/community/users/${userId}/profile`,
      providesTags: ["Community"],
    }),
    deleteComment: builder.mutation({
      query: ({ postId, commentId }) => ({
        url: `/api/user/community/${postId}/comment/${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Community"],
    }),
    getCommunityUploadUrl: builder.query({
      query: (params) => ({
        url: "/api/user/community/upload-url",
        params,
      }),
    }),
    confirmCommunityPost: builder.mutation({
      query: (data) => ({
        url: "/api/user/community/confirm-post",
        method: "POST",
        body: data,
      }),
      async onQueryStarted(data, { dispatch, queryFulfilled }) {
        try {
          const { data: result } = await queryFulfilled;
          // After successful confirmation, add the post to the top of the feed immediately
          if (result.success && result.post) {
            dispatch(
              workspaceSocialApi.util.updateQueryData(
                "getCommunityFeed",
                undefined,
                (draft) => {
                  if (!draft.posts) draft.posts = [];
                  // Check if post already exists (to avoid duplicates from refetch)
                  const exists = draft.posts.some(
                    (p) =>
                      (p._id || p.id) === (result.post._id || result.post.id)
                  );
                  if (!exists) {
                    draft.posts.unshift(result.post);
                  }
                }
              )
            );
          }
        } catch (err) {
          // If it fails, the refetch will handle it or tags will handle it
        }
      },
      invalidatesTags: ["Community"],
    }),
    getStoryUploadUrl: builder.query({
      query: (params) => ({
        url: "/api/user/stories/upload-url",
        params,
      }),
    }),
    confirmStoryUpload: builder.mutation({
      query: (data) => ({
        url: "/api/user/stories/confirm-upload",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Stories"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data: result } = await queryFulfilled;
          if (result.success && result.story) {
            dispatch(
              workspaceSocialApi.util.updateQueryData(
                "getStoriesFeed",
                undefined,
                (draft) => {
                  if (draft.stories) {
                    // Find or create group for the author (using userId field from backend)
                    const author = result.story.userId;
                    const groupIndex = draft.stories.findIndex(
                      (g) =>
                        (g.author._id || g.author.id) ===
                        (author._id || author.id)
                    );
                    if (groupIndex !== -1) {
                      draft.stories[groupIndex].stories.unshift(result.story);
                    } else {
                      draft.stories.unshift({
                        author: author,
                        stories: [result.story],
                      });
                    }
                  }
                }
              )
            );
          }
        } catch (err) {
          /* ignore */
        }
      },
    }),
    getUserStories: builder.query({
      query: (userId) => `/api/user/community/user-stories/${userId}`,
    }),
    uploadStory: builder.mutation({
      query: (formData) => ({
        url: "/api/user/stories",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Stories"],
    }),
    deleteStory: builder.mutation({
      query: (storyId) => ({
        url: `/api/user/stories/${storyId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Stories"],
    }),
    getPostReports: builder.query({
      query: (params) => ({
        url: "/api/community/admin/reports",
        params,
      }),
      providesTags: ["Community"],
    }),
    deleteAdminPost: builder.mutation({
      query: (postId) => ({
        url: `/api/community/admin/posts/${postId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Community"],
    }),
    getPlayerRecommendations: builder.query({ query: () => '/api/user/players/recommendations' }),
    getPlayerNetwork: builder.query({ query: (userId) => `/api/user/players/${userId}/network` }),
    followPlayer: builder.mutation({ query: (targetId) => ({ url: `/api/user/players/${targetId}/follow`, method: 'POST' }) }),
    unfollowPlayer: builder.mutation({ query: (targetId) => ({ url: `/api/user/players/${targetId}/unfollow`, method: 'POST' }) }),
    interactPlayer: builder.mutation({ query: ({ playerId, endpoint }) => ({ url: `/api/user/players/${playerId}/${endpoint}`, method: 'POST' }) }),
    getUserTeams: builder.query({ query: () => '/api/team' }),
    likeBlog: builder.mutation({ query: (id) => ({ url: `/api/user/blogs/${id}/like`, method: 'POST' }) }),
    getBlogs: builder.query({ query: () => '/api/user/blogs' }),
    
    getLinkPreview: builder.query({ query: (url) => `/api/community/link-preview?url=${encodeURIComponent(url)}` }),
    getHashtags: builder.query({ query: (q) => `/api/community/hashtags${q ? `?q=${q}` : ''}` }),
    searchMentions: builder.query({ query: (q) => `/api/users/search/mentions${q ? `?q=${q}` : ''}` }),
    votePoll: builder.mutation({ query: ({ postId, optionId }) => ({ url: `/api/community/posts/${postId}/poll/${optionId}/vote`, method: 'POST' }), invalidatesTags: ["Community"] }),
    toggleFollow: builder.mutation({ query: (userId) => ({ url: `/api/users/${userId}/follow`, method: 'POST' }) }),
  }),
});

export const {
  useGetCommunityFeedQuery,
  useLazyGetCommunityFeedQuery,
  useGetPostByIdQuery,
  useLazyGetPostByIdQuery,
  useGetForumPostsQuery,
  useLazyGetForumPostsQuery,
  useCreateForumPostMutation,
  useGetSavedPostsQuery,
  useLazyGetSavedPostsQuery,
  useGetUserPostsQuery,
  useLazyGetUserPostsQuery,
  useGetStoriesFeedQuery,
  useGetCommunityStatsQuery,
  useCreatePostMutation,
  useGetCommunityUploadUrlQuery,
  useLazyGetCommunityUploadUrlQuery,
  useConfirmCommunityPostMutation,
  useGetStoryUploadUrlQuery,
  useLazyGetStoryUploadUrlQuery,
  useConfirmStoryUploadMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useReportPostMutation,
  useLikePostMutation,
  useAddPostCommentMutation,
  useDeleteCommentMutation,
  useSavePostMutation,
  useGetPostLikesQuery,
  useLazyGetPostLikesQuery,
  useGetPostRepliesQuery,
  useLazyGetPostRepliesQuery,
  useGetUserStoriesQuery,
  useLazyGetUserStoriesQuery,
  useUploadStoryMutation,
  useDeleteStoryMutation,
  useGetPostReportsQuery,
  useDeleteAdminPostMutation,
  useLazyGetPlayerRecommendationsQuery,
  useLazyGetPlayerNetworkQuery,
  useFollowPlayerMutation,
  useUnfollowPlayerMutation,
  useInteractPlayerMutation,
  useLazyGetUserTeamsQuery,
  useLikeBlogMutation,
  useLazyGetBlogsQuery,
  useGetUserProfileStatsQuery,
  useGetLinkPreviewQuery,
  useLazyGetLinkPreviewQuery,
  useGetHashtagsQuery,
  useLazyGetHashtagsQuery,
  useSearchMentionsQuery,
  useLazySearchMentionsQuery,
  useVotePollMutation,
  useToggleFollowMutation,
} = workspaceSocialApi;

// Backward-compatible alias
export const communityApi = workspaceSocialApi;

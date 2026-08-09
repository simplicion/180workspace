import { baseApi } from "./baseApi";

export const userApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCommunityFeed: builder.query({
      query: (params) => ({
        url: "/api/user/community",
        params,
      }),
      providesTags: ["Community"],
    }),
    getUsers: builder.query({
      query: (params) => ({
        url: "/api/users",
        params,
      }),
      providesTags: ["User"],
    }),
    getProfile: builder.query({
      query: (userId) => `/api/profile/${userId}`,
      providesTags: ["Profile"],
    }),
    toggleFollow: builder.mutation({
      query: (userId) => ({
        url: `/api/profile/${userId}/follow`,
        method: "POST",
      }),
      invalidatesTags: ["Profile", "Network"],
    }),
    getNetwork: builder.query({
      query: (userId) => `/api/profile/${userId}/network`,
      providesTags: ["Network"],
    }),
    getAllNetworkProfiles: builder.query({
      query: () => `/api/profile/network/all`,
      providesTags: ["Network"],
    }),
    getSuggestedPlayers: builder.query({
      query: (params) => ({
        url: "/api/user/players",
        params,
      }),
      providesTags: ["User"],
    }),
    getNearbyPlayers: builder.query({
      query: (params) => ({
        url: "/api/user/players/nearby",
        params,
      }),
      providesTags: ["User"],
    }),
    updateLocationSharing: builder.mutation({
      query: (body) => ({
        url: "/api/user/players/location",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    getMe: builder.query({
      query: () => "/api/user/auth/getMe",
      providesTags: ["User"],
      transformResponse: (response) => response.user,
    }),
    logoutUser: builder.mutation({
      query: () => ({
        url: "/api/user/auth/logout",
        method: "POST",
      }),
    }),
    getUserBookings: builder.query({
      query: () => "/api/user/booking/get-bookings",
      providesTags: ["Booking"],
    }),
    getUserWallet: builder.query({
      query: () => "/api/user/wallet/data",
      providesTags: ["User"],
    }),
    getPlayerDetails: builder.query({
      query: (id) => `/api/user/players/${id}`,
      providesTags: ["User"],
    }),
    getNotifications: builder.query({
      query: (prefix) => prefix,
      providesTags: ["User"],
    }),
    markNotificationRead: builder.mutation({
      query: ({ prefix, id }) => ({
        url: `${prefix}/${id}/mark-read`,
        method: "PUT",
      }),
      invalidatesTags: ["User"],
    }),
    markAllNotificationsRead: builder.mutation({
      query: (prefix) => ({
        url: `${prefix}/mark-all-read`,
        method: "PUT",
      }),
      invalidatesTags: ["User"],
    }),
    clearAllNotifications: builder.mutation({
      query: (prefix) => ({
        url: `${prefix}/clear`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),

    checkUsername: builder.query({
      query: (username) => `/api/user/auth/check-username?username=${username}`,
    }),
    uploadProfilePicture: builder.mutation({
      query: (formData) => ({
        url: "/api/user/auth/profile-picture",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["User"],
    }),
    sendPhoneOtp: builder.mutation({
      query: (body) => ({
        url: "/api/user/auth/send-phone-otp",
        method: "POST",
        body,
      }),
    }),
    verifyPhoneOtp: builder.mutation({
      query: (body) => ({
        url: "/api/user/auth/verify-phone-otp",
        method: "POST",
        body,
      }),
    }),
    sendOtp: builder.mutation({
      query: (body) => ({
        url: "/api/user/auth/send-otp",
        method: "POST",
        body,
      }),
    }),
    verifyEmailOtp: builder.mutation({
      query: (body) => ({
        url: "/api/user/auth/profile/verify-email-otp",
        method: "POST",
        body,
      }),
    }),
    verifyEmailGoogle: builder.mutation({
      query: (body) => ({
        url: "/api/user/auth/profile/verify-email-google",
        method: "POST",
        body,
      }),
    }),
    verifyEmail: builder.mutation({
      query: (body) => ({
        url: "/api/user/auth/verify-email",
        method: "POST",
        body,
      }),
    }),
    updateProfile: builder.mutation({
      query: (body) => ({
        url: "/api/user/auth/updateProfile",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    addExperience: builder.mutation({
      query: (body) => ({
        url: "/api/profile/experiences",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),
    updateExperience: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/api/profile/experiences/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),
    deleteExperience: builder.mutation({
      query: (id) => ({
        url: `/api/profile/experiences/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Profile"],
    }),
    addEducation: builder.mutation({
      query: (body) => ({
        url: "/api/profile/educations",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),
    updateEducation: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/api/profile/educations/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),
    deleteEducation: builder.mutation({
      query: (id) => ({
        url: `/api/profile/educations/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Profile"],
    }),
    addProject: builder.mutation({
      query: (body) => ({
        url: "/api/profile/projects",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),
    updateProject: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/api/profile/projects/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),
    deleteProject: builder.mutation({
      query: (id) => ({
        url: `/api/profile/projects/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Profile"],
    }),
    searchSkills: builder.query({
      query: (q) => `/api/profile/skills/search?q=${q}`,
    }),
    addSkill: builder.mutation({
      query: (body) => ({
        url: "/api/profile/skills",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),
    deleteSkill: builder.mutation({
      query: (id) => ({
        url: `/api/profile/skills/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Profile"],
    }),
    addResume: builder.mutation({
      query: (body) => ({
        url: "/api/profile/resumes",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),
    deleteResume: builder.mutation({
      query: (id) => ({
        url: `/api/profile/resumes/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Profile"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetCommunityFeedQuery,
  useGetMeQuery,
  useGetSuggestedPlayersQuery,
  useGetNearbyPlayersQuery,
  useLazyGetNearbyPlayersQuery,
  useUpdateLocationSharingMutation,
  useGetUserBookingsQuery,
  useGetUserWalletQuery,
  useGetPlayerDetailsQuery,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useClearAllNotificationsMutation,

  useLogoutUserMutation,
  useCheckUsernameQuery,
  useLazyCheckUsernameQuery,
  useUploadProfilePictureMutation,
  useSendPhoneOtpMutation,
  useVerifyPhoneOtpMutation,
  useSendOtpMutation,
  useVerifyEmailOtpMutation,
  useVerifyEmailGoogleMutation,
  useVerifyEmailMutation,
  useUpdateProfileMutation,
  useGetMyBookingsQuery,

  // Profile network hooks
  useGetProfileQuery,
  useToggleFollowMutation,
  useGetNetworkQuery,
  useGetAllNetworkProfilesQuery,
  
  // Profile detailed endpoints
  useAddExperienceMutation,
  useUpdateExperienceMutation,
  useDeleteExperienceMutation,
  useAddEducationMutation,
  useUpdateEducationMutation,
  useDeleteEducationMutation,
  useAddProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useSearchSkillsQuery,
  useLazySearchSkillsQuery,
  useAddSkillMutation,
  useDeleteSkillMutation,
  useAddResumeMutation,
  useDeleteResumeMutation,
} = userApi;

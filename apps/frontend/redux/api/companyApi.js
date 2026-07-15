// Force recompile to bust Next.js cache - updated
import { baseApi } from './baseApi';

export const companyApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Fetch public company profile (can be by slug or ID)
        getPublicCompanyProfile: builder.query({
            query: (companyId) => `/api/company-profile/public/${companyId}`,
            providesTags: (result, error, arg) => [{ type: 'Company', id: arg }],
        }),

        // Follow Status
        getFollowStatus: builder.query({
            query: (companyId) => `/api/company-profile/public/${companyId}/follow-status`,
            providesTags: (result, error, arg) => [{ type: 'CompanyFollowStatus', id: arg }],
        }),

        // Follow Company
        followCompany: builder.mutation({
            query: (companyId) => ({
                url: `/api/company-profile/public/${companyId}/follow`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'CompanyFollowStatus', id: arg },
                { type: 'Company', id: arg }
            ],
        }),

        // Unfollow Company
        unfollowCompany: builder.mutation({
            query: (companyId) => ({
                url: `/api/company-profile/public/${companyId}/follow`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'CompanyFollowStatus', id: arg },
                { type: 'Company', id: arg }
            ],
        }),
        
        // Fetch private company profile (for admins of the company)
        getPrivateCompanyProfile: builder.query({
            query: () => `/api/company-profile/private`,
            providesTags: ['CompanyPrivate'],
        }),
        
        // Update company profile
        updateCompanyProfile: builder.mutation({
            query: (data) => ({
                url: `/api/company-profile`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['CompanyPrivate'], // We don't invalidate public because it takes an ID, might need manual cache update if we know the ID
        }),

        // -------------------------------------------------------------
        // Company Services Endpoints
        // -------------------------------------------------------------
        
        // Get services for a specific company (public)
        getCompanyServices: builder.query({
            // NOTE: the services are already returned as part of getPublicCompanyProfile and getPrivateCompanyProfile, 
            // but if we need a dedicated endpoint, we can use one. For now this might not be needed.
            query: (companyId) => `/api/company-profile/public/${companyId}`,
            providesTags: (result, error, arg) => [{ type: 'CompanyServices', id: arg }],
        }),

        // Add a new service (Admin)
        addCompanyService: builder.mutation({
            query: (data) => ({
                url: `/api/company-profile/private/services`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['CompanyPrivate'],
        }),

        // Update a service (Admin)
        updateCompanyService: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/api/company-profile/private/services/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['CompanyPrivate'],
        }),

        // Delete a service (Admin)
        deleteCompanyService: builder.mutation({
            query: (id) => ({
                url: `/api/company-profile/private/services/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['CompanyPrivate'],
        }),

        // Request a service (Public)
        requestService: builder.mutation({
            query: ({ companyId, serviceId, ...data }) => ({
                url: `/api/company-profile/public/${companyId}/services/${serviceId}/request`,
                method: 'POST',
                body: data,
            }),
        }),

        // -------------------------------------------------------------
        // Service Requests (Leads) Endpoints
        // -------------------------------------------------------------
        
        // Get service requests (Admin)
        getServiceRequests: builder.query({
            query: () => `/api/company-profile/private/service-requests`,
            providesTags: ['ServiceRequests'],
        }),

        // -------------------------------------------------------------
        // Product Endpoints
        // -------------------------------------------------------------

        addCompanyProduct: builder.mutation({
            query: (data) => ({
                url: `/api/company-profile/private/products`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['CompanyPrivate', 'CompanyPublic'],
        }),

        updateCompanyProduct: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/api/company-profile/private/products/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['CompanyPrivate', 'CompanyPublic'],
        }),

        deleteCompanyProduct: builder.mutation({
            query: (id) => ({
                url: `/api/company-profile/private/products/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['CompanyPrivate', 'CompanyPublic'],
        }),

        // -------------------------------------------------------------
        // Media Endpoints
        // -------------------------------------------------------------

        addCompanyMedia: builder.mutation({
            query: (data) => ({
                url: `/api/company-profile/private/media`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['CompanyPrivate', 'CompanyPublic'],
        }),

        deleteCompanyMedia: builder.mutation({
            query: (id) => ({
                url: `/api/company-profile/private/media/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['CompanyPrivate', 'CompanyPublic'],
        }),
        // -------------------------------------------------------------
        // Core Values Endpoints
        // -------------------------------------------------------------

        addCompanyCoreValue: builder.mutation({
            query: (data) => ({
                url: `/api/company-profile/private/core-values`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['CompanyPrivate', 'CompanyPublic'],
        }),

        deleteCompanyCoreValue: builder.mutation({
            query: (id) => ({
                url: `/api/company-profile/private/core-values/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['CompanyPrivate', 'CompanyPublic'],
        }),
        
        // -------------------------------------------------------------
        // Reviews Endpoints
        // -------------------------------------------------------------
        getCompanyReviews: builder.query({
            query: (companyId) => `/api/company-profile/public/${companyId}/reviews`,
            providesTags: ['CompanyPublic'],
        }),
        addCompanyReview: builder.mutation({
            query: ({ companyId, data }) => ({
                url: `/api/company-profile/public/${companyId}/reviews`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['CompanyPublic'],
        }),
        updateCompanyFinanceTab: builder.mutation({
            query: (data) => ({
                url: '/api/company-profile/private/finance',
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['CompanyPrivate', 'CompanyPublic'],
        }),
        
        // -------------------------------------------------------------
        // Events Endpoints
        // -------------------------------------------------------------
        getCompanyEvents: builder.query({
            query: () => '/api/events',
            providesTags: ['CompanyEvents'],
        }),
        getCompanyEventById: builder.query({
            query: (id) => `/api/events/${id}`,
            providesTags: (result, error, id) => [{ type: 'CompanyEvents', id }],
        }),
        createEvent: builder.mutation({
            query: (data) => ({
                url: '/api/events',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['CompanyEvents', 'PublicEvents'],
        }),
        updateEvent: builder.mutation({
            query: ({ id, data }) => ({
                url: `/api/events/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => ['CompanyEvents', { type: 'CompanyEvents', id }, 'PublicEvents'],
        }),
        deleteEvent: builder.mutation({
            query: (id) => ({
                url: `/api/events/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['CompanyEvents', 'PublicEvents'],
        }),
        getPublicEvents: builder.query({
            query: () => '/api/public/events',
            providesTags: ['PublicEvents'],
        }),
        getPublicEventDetails: builder.query({
            query: (id) => `/api/public/events/${id}`,
            providesTags: (result, error, id) => [{ type: 'PublicEvents', id }],
        }),
        checkEventRegistration: builder.query({
            query: ({ eventId, email }) => `/api/public/events/${eventId}/check-registration?email=${encodeURIComponent(email)}`,
            providesTags: (result, error, { eventId }) => [{ type: 'PublicEvents', id: eventId }],
        }),
        registerForEvent: builder.mutation({
            query: ({ eventId, data }) => ({
                url: `/api/public/events/${eventId}/register`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (result, error, { eventId }) => [{ type: 'CompanyEvents', id: eventId }, { type: 'PublicEvents', id: eventId }],
        }),

    }),
});

export const {
    useGetPublicCompanyProfileQuery,
    useGetPrivateCompanyProfileQuery,
    useUpdateCompanyProfileMutation,
    useGetCompanyServicesQuery,
    useAddCompanyServiceMutation,
    useUpdateCompanyServiceMutation,
    useDeleteCompanyServiceMutation,
    useRequestServiceMutation,
    useGetServiceRequestsQuery,
    useAddCompanyProductMutation,
    useUpdateCompanyProductMutation,
    useDeleteCompanyProductMutation,
    useAddCompanyMediaMutation,
    useDeleteCompanyMediaMutation,
    useAddCompanyCoreValueMutation,
    useDeleteCompanyCoreValueMutation,
    useGetCompanyReviewsQuery,
    useAddCompanyReviewMutation,
    useUpdateCompanyFinanceTabMutation,
    useGetFollowStatusQuery,
    useFollowCompanyMutation,
    useUnfollowCompanyMutation,
    
    useGetCompanyEventsQuery,
    useGetCompanyEventByIdQuery,
    useCreateEventMutation,
    useUpdateEventMutation,
    useDeleteEventMutation,
    useGetPublicEventsQuery,
    useGetPublicEventDetailsQuery,
    useCheckEventRegistrationQuery,
    useRegisterForEventMutation,
} = companyApi;

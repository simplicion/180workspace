import { baseApi } from './baseApi';

export const supportApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Get all tickets for the company
        getTickets: builder.query({
            query: () => '/api/v1/support/tickets',
            providesTags: ['Support'],
        }),

        // Get single ticket
        getTicketById: builder.query({
            query: (id) => `/api/v1/support/tickets/${id}`,
            providesTags: (result, error, id) => [{ type: 'Support', id }],
        }),

        // Create new ticket
        createTicket: builder.mutation({
            query: (data) => ({
                url: '/api/v1/support/tickets',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Support'],
        }),

        // Add reply to ticket
        replyToTicket: builder.mutation({
            query: ({ id, text }) => ({
                url: `/api/v1/support/tickets/${id}/reply`,
                method: 'POST',
                body: { text },
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Support', id }, 'Support'],
        }),

        // Update ticket
        updateTicket: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/api/v1/support/tickets/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Support', id }, 'Support'],
        }),

        // Delete ticket
        deleteTicket: builder.mutation({
            query: (id) => ({
                url: `/api/v1/support/tickets/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Support'],
        }),
    }),
});

export const {
    useGetTicketsQuery,
    useGetTicketByIdQuery,
    useCreateTicketMutation,
    useReplyToTicketMutation,
    useUpdateTicketMutation,
    useDeleteTicketMutation,
} = supportApi;

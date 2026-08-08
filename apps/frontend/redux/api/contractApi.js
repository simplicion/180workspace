import { baseApi } from './baseApi';

export const contractApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getContracts: builder.query({
            query: () => '/contracts',
            providesTags: ['Contracts']
        }),
        getContractById: builder.query({
            query: (id) => `/contracts/${id}`,
            providesTags: (result, error, id) => [{ type: 'Contracts', id }]
        }),
        createContract: builder.mutation({
            query: (data) => ({
                url: '/contracts',
                method: 'POST',
                body: data
            }),
            invalidatesTags: ['Contracts']
        }),
        updateContract: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/contracts/${id}`,
                method: 'PUT',
                body: data
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Contracts', id }, 'Contracts']
        }),
        deleteContract: builder.mutation({
            query: (id) => ({
                url: `/contracts/${id}`,
                method: 'DELETE'
            }),
            invalidatesTags: ['Contracts']
        }),
        generateShareLink: builder.mutation({
            query: (id) => ({
                url: `/contracts/${id}/share`,
                method: 'POST'
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Contracts', id }]
        }),
        
        // Public API calls for Client Portal
        getContractByToken: builder.query({
            query: (token) => `/p/contract/${token}`,
        }),
        signContract: builder.mutation({
            query: ({ token, data }) => ({
                url: `/p/contract/${token}/sign`,
                method: 'POST',
                body: data
            })
        })
    })
});

export const {
    useGetContractsQuery,
    useGetContractByIdQuery,
    useCreateContractMutation,
    useUpdateContractMutation,
    useDeleteContractMutation,
    useGenerateShareLinkMutation,
    useGetContractByTokenQuery,
    useSignContractMutation
} = contractApi;

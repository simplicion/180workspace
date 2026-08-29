import { baseApi } from './baseApi';

export const contractApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getContracts: builder.query({
            query: () => '/api/contracts',
            providesTags: ['Contracts']
        }),
        getContractById: builder.query({
            query: (id) => `/api/contracts/${id}`,
            providesTags: (result, error, id) => [{ type: 'Contracts', id }]
        }),
        createContract: builder.mutation({
            query: (data) => ({
                url: '/api/contracts',
                method: 'POST',
                body: data
            }),
            invalidatesTags: ['Contracts']
        }),
        updateContract: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/api/contracts/${id}`,
                method: 'PUT',
                body: data
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Contracts', id }, 'Contracts']
        }),
        deleteContract: builder.mutation({
            query: (id) => ({
                url: `/api/contracts/${id}`,
                method: 'DELETE'
            }),
            invalidatesTags: ['Contracts']
        }),
        generateShareLink: builder.mutation({
            query: (id) => ({
                url: `/api/contracts/${id}/share`,
                method: 'POST'
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Contracts', id }]
        }),
        
        // Public API calls for Client Portal
        getContractByToken: builder.query({
            query: (token) => `/api/p/contract/${token}`,
        }),
        signContract: builder.mutation({
            query: ({ token, data }) => ({
                url: `/api/p/contract/${token}/sign`,
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

import { baseApi } from "./baseApi";

export const crmApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSalesDashboard: builder.query({
      query: (timeframe: string) => `/api/sales/dashboard?timeframe=${timeframe}`,
      providesTags: ["SalesPipeline"],
    }),
    getSalesRevenue: builder.query({
      query: (timeframe: string) => `/api/sales/revenue?timeframe=${timeframe}`,
      providesTags: ["SalesPipeline"],
    }),
    getSalesProductivity: builder.query({
      query: () => `/api/sales/productivity`,
      providesTags: ["SalesPipeline"],
    }),
    getLeadsPipeline: builder.query({
      query: (pipelineType: string = 'DEAL') => `/api/sales/leads-pipeline?pipelineType=${pipelineType}`,
      providesTags: ["SalesPipeline"],
    }),
    getDeals: builder.query({
      query: () => `/api/sales/deals`,
      providesTags: ["SalesPipeline"],
    }),
    getClients: builder.query({
      query: ({ search = '', status = '' }) => `/api/clients?search=${search}&status=${status}`,
      providesTags: ["User"],
    }),
    getClientById: builder.query({
      query: (id: string) => `/api/clients/${id}`,
      providesTags: ["User"],
    }),
    getClientCommunications: builder.query({
      query: (id: string) => `/api/clients/${id}/communications`,
      providesTags: ["User", "Message"],
    }),
    getClientActivity: builder.query({
      query: (id: string) => `/api/clients/${id}/activity`,
      providesTags: ["User", "Activity"],
    }),
    getAccounts: builder.query({
      query: () => `/api/sales/accounts`,
      providesTags: ["Company"],
    }),
    updateLeadStage: builder.mutation({
      query: ({ leadId, columnId }) => ({
        url: `/api/sales/leads-pipeline/${leadId}/stage`,
        method: 'PATCH',
        body: { stage: columnId }
      }),
      // Optimistic update
      async onQueryStarted({ leadId, columnId, pipelineType }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          crmApi.util.updateQueryData('getLeadsPipeline', pipelineType, (draft) => {
            // Find the lead in the draft and update its stage
            for (const col of draft.columns) {
              const leadIndex = col.leads.findIndex((l: any) => l.id === leadId);
              if (leadIndex !== -1) {
                const [lead] = col.leads.splice(leadIndex, 1);
                const targetCol = draft.columns.find((c: any) => c.id === columnId);
                if (targetCol) {
                  lead.stage = columnId;
                  targetCol.leads.push(lead);
                }
                break;
              }
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ["SalesPipeline"]
    })
  }),
  overrideExisting: false,
});

export const {
  useGetSalesDashboardQuery,
  useGetSalesRevenueQuery,
  useGetSalesProductivityQuery,
  useGetLeadsPipelineQuery,
  useGetDealsQuery,
  useGetClientsQuery,
  useGetClientByIdQuery,
  useGetClientCommunicationsQuery,
  useGetClientActivityQuery,
  useGetAccountsQuery,
  useUpdateLeadStageMutation
} = crmApi;

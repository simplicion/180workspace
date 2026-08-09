import { baseApi } from "./baseApi";

export const clientApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getClients: builder.query({
      query: (params) => ({
        url: "/api/clients",
        params,
      }),
      providesTags: ["Client"],
    }),
    getClientById: builder.query({
      query: (id) => `/api/clients/${id}`,
      providesTags: (result, error, id) => [{ type: "Client", id }],
    }),
  }),
});

export const {
  useGetClientsQuery,
  useGetClientByIdQuery,
} = clientApi;

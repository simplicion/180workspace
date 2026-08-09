import { baseApi } from "./baseApi";

export const projectApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getProjects: builder.query({
      query: (params) => ({
        url: "/api/projects",
        params,
      }),
      providesTags: ["Project"],
    }),
    getProjectById: builder.query({
      query: (id) => `/api/projects/${id}`,
      providesTags: (result, error, id) => [{ type: "Project", id }],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
} = projectApi;

import { baseApi } from './baseApi';

export const releaseNotesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Get all published release notes
        getReleaseNotes: builder.query({
            query: () => '/api/v1/release-notes',
            providesTags: ['ReleaseNotes'],
        }),
    }),
});

export const {
    useGetReleaseNotesQuery,
} = releaseNotesApi;

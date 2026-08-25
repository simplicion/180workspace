import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface UploadQueueItem {
    id: string; // Unique ID for the job
    entityId: string; // ID of the task/project to attach to
    entityType: 'task' | 'project' | 'other';
    files: File[];
    voiceBlobs?: Blob[]; // Voice notes
    progress: number;
    status: UploadStatus;
    error?: string;
}

interface UploadQueueState {
    jobs: UploadQueueItem[];
}

const initialState: UploadQueueState = {
    jobs: [],
};

const uploadQueueSlice = createSlice({
    name: 'uploadQueue',
    initialState,
    reducers: {
        addUploadJob: (state, action: PayloadAction<Omit<UploadQueueItem, 'progress' | 'status'>>) => {
            state.jobs.push({
                ...action.payload,
                progress: 0,
                status: 'pending',
            });
        },
        updateJobProgress: (state, action: PayloadAction<{ id: string; progress: number }>) => {
            const job = state.jobs.find(j => j.id === action.payload.id);
            if (job && job.status === 'uploading') {
                job.progress = action.payload.progress;
            }
        },
        updateJobStatus: (state, action: PayloadAction<{ id: string; status: UploadStatus; error?: string }>) => {
            const job = state.jobs.find(j => j.id === action.payload.id);
            if (job) {
                job.status = action.payload.status;
                if (action.payload.error) {
                    job.error = action.payload.error;
                }
            }
        },
        removeJob: (state, action: PayloadAction<string>) => {
            state.jobs = state.jobs.filter(j => j.id !== action.payload);
        },
        clearCompletedJobs: (state) => {
            state.jobs = state.jobs.filter(j => j.status !== 'success');
        }
    },
});

export const { addUploadJob, updateJobProgress, updateJobStatus, removeJob, clearCompletedJobs } = uploadQueueSlice.actions;
export default uploadQueueSlice.reducer;

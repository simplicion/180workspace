import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  activeUpload: null, // { id, progress, status, previewUrl, metadata }
  recentUploads: [],
};

const mediaUploadSlice = createSlice({
  name: "mediaUpload",
  initialState,
  reducers: {
    startUpload: (state, action) => {
      state.activeUpload = {
        id: action.payload.id || Date.now().toString(),
        progress: 0,
        status: "uploading",
        previewUrl: action.payload.previewUrl,
        metadata: action.payload.metadata,
        file: action.payload.file, // Note: storing non-serializable file in state is usually bad, but we need it for the background handler
      };
    },
    updateProgress: (state, action) => {
      if (state.activeUpload) {
        state.activeUpload.progress = action.payload;
      }
    },
    updateStatus: (state, action) => {
      if (state.activeUpload) {
        state.activeUpload.status = action.payload;
      }
    },
    updateId: (state, action) => {
      if (state.activeUpload) {
        state.activeUpload.id = action.payload;
      }
    },
    clearUpload: (state) => {
      if (state.activeUpload && state.activeUpload.status === "success") {
        // Strip out the non-serializable File object to avoid Redux serialization warnings/errors
        const { file, ...serializableUpload } = state.activeUpload;
        state.recentUploads.unshift(serializableUpload);
      }
      state.activeUpload = null;
    },
    setUploadError: (state, action) => {
      if (state.activeUpload) {
        state.activeUpload.status = "error";
        state.activeUpload.error = action.payload;
      }
    },
  },
});

export const {
  startUpload,
  updateProgress,
  updateStatus,
  updateId,
  clearUpload,
  setUploadError,
} = mediaUploadSlice.actions;
export default mediaUploadSlice.reducer;

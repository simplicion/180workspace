import { combineReducers } from "@reduxjs/toolkit";
import themeReducer from "./slices/themeSlice";
import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";
import documentReducer from "./slices/documentSlice";
import { baseApi } from "./api/baseApi";

import mediaUploadReducer from "./slices/mediaUploadSlice";

const rootReducer = combineReducers({
  theme: themeReducer,
  auth: authReducer,
  ui: uiReducer,
  document: documentReducer,
  mediaUpload: mediaUploadReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

export default rootReducer;

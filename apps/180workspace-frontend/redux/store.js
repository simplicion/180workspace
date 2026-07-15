import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "./storage";
import rootReducer from "./rootReducers";
import { baseApi } from "./api/baseApi";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["theme", "auth"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "mediaUpload/startUpload"],
        ignoredPaths: ["mediaUpload.activeUpload.file"],
      },
    }).concat(baseApi.middleware),
});

export const persistor = persistStore(store);

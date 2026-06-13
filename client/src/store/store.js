import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice.js";
import { jobsApi } from "./jobsApi.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [jobsApi.reducerPath]: jobsApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(jobsApi.middleware),
});

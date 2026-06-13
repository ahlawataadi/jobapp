import axios from "axios";
import { store } from "../store/store.js";
import { setAccessToken, logout } from "../store/authSlice.js";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true, // send refresh-token cookie
});

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 401 && !config._retry) {
      config._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject, config });
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        store.dispatch(setAccessToken(data.accessToken));
        queue.forEach(({ resolve, config: c }) => {
          c.headers.Authorization = `Bearer ${data.accessToken}`;
          resolve(api(c));
        });
        queue = [];
        config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(config);
      } catch (err) {
        queue.forEach(({ reject }) => reject(err));
        queue = [];
        store.dispatch(logout());
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

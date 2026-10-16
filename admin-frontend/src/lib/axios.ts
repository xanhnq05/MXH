// Axios instance with auto refresh token + 401 handler.
// Skips auto-refresh + clearState when boot request is in progress.

import axios, { type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/useAuthStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = "Bearer " + accessToken;
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _isBoot?: boolean;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as RetryableRequest | undefined;
    if (!original) return Promise.reject(error);

    const skipUrls = [
      "/auth/signin",
      "/auth/signup",
      "/auth/refresh",
      "/auth/send-otp",
      "/auth/verify-otp",
      "/auth/reset-password",
      "/auth/forgot-password",
    ];
    if (skipUrls.some((u) => (original.url || "").includes(u))) {
      return Promise.reject(error);
    }

    const status = error.response && error.response.status;
    const isAuthError = status === 401 || status === 403;
    if (isAuthError && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            original.headers.Authorization = "Bearer " + token;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const { data } = await api.post("/auth/refresh");
        const newToken = data.accessToken as string;
        useAuthStore.getState().setAccessToken(newToken);
        onRefreshed(newToken);
        original.headers.Authorization = "Bearer " + newToken;
        return api(original);
      } catch (refreshError) {
        const isBooting = original._isBoot === true;
        if (!isBooting) {
          useAuthStore.getState().clearState();
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

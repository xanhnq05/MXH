import axios from "axios";
import { useAuthStore } from "@/stores/useAuthStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
  withCredentials: true, // gửi cookie httpOnly (refreshToken)
});

// Gắn access token vào header
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Tự động refresh khi access token hết hạn (401)
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original) return Promise.reject(error);

    // Bỏ qua các endpoint auth công khai
    const skipUrls = [
      "/auth/signin",
      "/auth/signup",
      "/auth/signup/start",
      "/auth/signup/complete",
      "/auth/refresh",
      "/auth/send-otp",
      "/auth/verify-otp",
      "/auth/reset-password",
      "/auth/forgot-password",
    ];
    if (skipUrls.some((u) => original.url?.includes(u))) {
      return Promise.reject(error);
    }

    // 401 hoặc 403 (token hết hạn) — thử refresh
    const isAuthError =
      error.response?.status === 401 || error.response?.status === 403;
    if (isAuthError && !original._retry) {
      original._retry = true;

      // Nếu đang refresh → chờ token mới rồi retry
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const { data } = await api.post("/auth/refresh");
        const newToken = data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        onRefreshed(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        // Refresh thất bại → logout
        useAuthStore.getState().clearState();
        if (window.location.pathname !== "/signin") {
          window.location.href = "/signin";
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

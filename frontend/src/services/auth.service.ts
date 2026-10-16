import api from "@/lib/axios";
import type { SignInPayload } from "@/types/store";

export interface SignUpStep1Payload {
  fullName: string;
  email: string;
  birthday: string; // YYYY-MM-DD
  phone?: string;
}

export interface SignUpCompletePayload {
  email: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
  birthday?: string;
  phone?: string;
}

export const authService = {
  // Bước 1: gửi thông tin cá nhân → server tạo OTP
  signUpStart: async (data: SignUpStep1Payload) => {
    const res = await api.post("/auth/signup/start", data);
    return res.data as {
      message: string;
      email: string;
      pending: SignUpStep1Payload;
    };
  },

  // Bước 2: xác thực OTP
  verifyOtp: async (email: string, code: string, type: "signup" | "forgot_password" = "signup") => {
    const res = await api.post("/auth/verify-otp", { email, code, type });
    return res.data;
  },

  // Bước 3: gửi mật khẩu → tạo user
  signUpComplete: async (data: SignUpCompletePayload) => {
    const res = await api.post("/auth/signup/complete", data);
    return res.data;
  },

  // API cũ giữ tương thích
  signUp: async (data: any) => {
    const res = await api.post("/auth/signup", data);
    return res.data;
  },

  sendOtp: async (email: string, type: "signup" | "forgot_password" = "signup") => {
    const res = await api.post("/auth/send-otp", { email, type });
    return res.data;
  },

  signIn: async (data: SignInPayload) => {
    const res = await api.post("/auth/signin", data);
    return res.data;
  },

  signOut: async () => {
    return api.post("/auth/signout");
  },

  refresh: async () => {
    const res = await api.post("/auth/refresh");
    return res.data;
  },

  forgotPassword: async (email: string) => {
    const res = await api.post("/auth/forgot-password", { email });
    return res.data;
  },

  resetPassword: async (email: string, otp: string, newPassword: string) => {
    const res = await api.post("/auth/reset-password", { email, otp, newPassword });
    return res.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await api.post("/auth/change-password", { currentPassword, newPassword });
    return res.data;
  },
};

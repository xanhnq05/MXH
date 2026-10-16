// Auth store — phiên bản rút gọn cho admin (chỉ cần accessToken + user).

import { create } from "zustand";
import { toast } from "sonner";
import api from "@/lib/axios";
import { authService } from "@/services/auth.service";

export interface AdminAuthUser {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

interface AdminAuthState {
  accessToken: string | null;
  user: AdminAuthUser | null;
  loading: boolean;
  setAccessToken: (t: string | null) => void;
  setUser: (u: AdminAuthUser | null) => void;
  signIn: (data: { username: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  clearState: () => void;
  fetchMe: () => Promise<void>;
}

const TOKEN_KEY = "adminAccessToken";
const USER_KEY = "adminUser";

export const useAuthStore = create<AdminAuthState>((set, get) => ({
  accessToken: localStorage.getItem(TOKEN_KEY),
  user: JSON.parse(localStorage.getItem(USER_KEY) || "null"),
  loading: false,

  setAccessToken: (t) => {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
    set({ accessToken: t });
  },

  setUser: (u) => {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
    set({ user: u });
  },

  signIn: async (data) => {
    set({ loading: true });
    try {
      const res = await authService.signIn(data);
      get().setAccessToken(res.accessToken);
      get().setUser(res.user);
      toast.success("Đăng nhập thành công");
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Sai thông tin đăng nhập";
      toast.error(msg);
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      await authService.signOut().catch(() => {});
    } finally {
      get().clearState();
      window.location.href = "/login";
    }
  },

  clearState: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ accessToken: null, user: null, loading: false });
  },

  fetchMe: async () => {
    if (!get().accessToken) return;
    try {
      const res = await api.get("/users/me");
      get().setUser(res.data.user);
    } catch (e) {
      get().clearState();
    }
  },
}));

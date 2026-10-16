import { create } from "zustand";
import { toast } from "sonner";
import api from "@/lib/axios";
import { authService } from "@/services/auth.service";
import type { AuthState, SignInPayload, SignUpPayload } from "@/types/store";
import type { User } from "@/types/user";
import { disconnectSocket } from "@/lib/socket";

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: localStorage.getItem("accessToken"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  loading: false,

  setAccessToken: (t) => {
    if (t) localStorage.setItem("accessToken", t);
    else localStorage.removeItem("accessToken");
    set({ accessToken: t });
  },

  setUser: (u) => {
    if (u) localStorage.setItem("user", JSON.stringify(u));
    else localStorage.removeItem("user");
    set({ user: u });
  },

  updateUser: (patch) => {
    const current = get().user;
    if (!current) return;
    const next = { ...current, ...patch };
    localStorage.setItem("user", JSON.stringify(next));
    set({ user: next });
  },

  updateUserStatus: (userId, isOnline) => {
    // Cập nhật trong bất kỳ danh sách user nào (conversations, friends, ...)
    // Hiện tại chỉ cập nhật nếu đó là current user
    const current = get().user;
    if (current && current._id === userId) {
      get().updateUser({ isOnline, lastSeen: isOnline ? undefined : new Date().toISOString() });
    }
  },

  clearState: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    disconnectSocket();
    set({ accessToken: null, user: null, loading: false });
  },

  signUp: async (data: any) => {
    // API cũ — không khuyến khích sử dụng. Dùng signUpStart + verifyOtp + signUpComplete
    set({ loading: true });
    try {
      await authService.signUp(data);
      toast.success("Đăng ký thành công");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Đăng ký thất bại");
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (data: SignInPayload) => {
    set({ loading: true });
    try {
      const res = await authService.signIn(data);
      get().setAccessToken(res.accessToken);
      get().setUser(res.user);
      toast.success("Đăng nhập thành công");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Sai thông tin đăng nhập");
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      await authService.signOut();
    } catch (e) {
      // ignore
    } finally {
      get().clearState();
      toast.success("Đã đăng xuất");
    }
  },

  fetchMe: async () => {
    try {
      const res = await api.get("/users/me");
      get().setUser(res.data.user);
    } catch (e) {
      get().clearState();
    }
  },
}));
